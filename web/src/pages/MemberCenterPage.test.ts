import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import MemberCenterPage from './MemberCenterPage.vue'
import { clearSession, setSession, type MemberProfile } from '@/api/client'
import type { MemberCoupon, MemberOrder, PointsSummary } from '@/api/member'
import { authState } from '@/composables/useAuth'

const PROFILE: MemberProfile = {
  id: 1,
  phone: '13812345678',
  maskedPhone: '138****5678',
  nickname: '咖啡友5678',
  points: 560,
  level: 'gold',
  levelText: '金卡',
  nextLevel: 'black',
  nextLevelText: '黑卡',
  pointsToNextLevel: 1440,
  createdAt: '2026-09-20T02:00:00.000Z',
}

const ORDERS: MemberOrder[] = [
  {
    id: 11,
    orderNo: 'SY20260926000011',
    storeId: 1,
    storeName: '山野咖啡 · 望京店',
    orderType: 'takeout',
    orderTypeText: '自提',
    status: 'paid',
    statusText: '已支付',
    items: [
      {
        productId: 1,
        productName: '山野拿铁',
        specText: '大杯 / 冰 / 少糖',
        unitPrice: 3500,
        quantity: 2,
        amount: 7000,
      },
    ],
    totalFen: 7000,
    discountFen: 1000,
    payFen: 6000,
    coupon: { id: 5, name: '新客满 50 减 10', discountFen: 1000 },
    pickupCode: '3253',
    remark: '少冰',
    createdAt: '2026-09-26T10:30:00.000Z',
    paidAt: '2026-09-26T10:31:00.000Z',
    timeline: [],
  },
]

const COUPONS: MemberCoupon[] = [
  {
    id: 5,
    couponId: 1,
    name: '新客满 50 减 10',
    type: 'full_reduction',
    typeText: '满减券',
    thresholdFen: 5000,
    reduceFen: 1000,
    discountPercent: 100,
    maxReduceFen: 0,
    validFrom: '2026-09-26T02:00:00.000Z',
    validTo: '2026-10-26T02:00:00.000Z',
    status: 'unused',
    statusText: '未使用',
    obtainedAt: '2026-09-26T02:00:00.000Z',
    usedAt: null,
  },
  {
    id: 4,
    couponId: 2,
    name: '全场 8.5 折',
    type: 'discount',
    typeText: '折扣券',
    thresholdFen: 3000,
    reduceFen: 0,
    discountPercent: 85,
    maxReduceFen: 2000,
    validFrom: '2026-09-20T02:00:00.000Z',
    validTo: '2026-10-05T02:00:00.000Z',
    status: 'used',
    statusText: '已使用',
    obtainedAt: '2026-09-20T02:00:00.000Z',
    usedAt: '2026-09-25T16:00:00.000Z',
  },
]

const SUMMARY: PointsSummary = {
  profile: PROFILE,
  totalEarned: 560,
  logs: [
    { id: 1, change: 60, reason: '消费积分', orderId: 11, createdAt: '2026-09-26T10:31:00.000Z' },
    { id: 2, change: 500, reason: '活动赠送', orderId: null, createdAt: '2026-09-20T02:00:00.000Z' },
  ],
}

function mockApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(typeof input === 'string' ? input : (input as Request).url)
      const json = (data: unknown) =>
        new Response(JSON.stringify({ code: 0, data, message: 'ok' }), {
          headers: { 'content-type': 'application/json' },
        })
      if (url.includes('/api/v1/members/me/points')) {
        return json(SUMMARY)
      }
      if (url.includes('/api/v1/members/me/coupons')) {
        return json(COUPONS)
      }
      if (url.includes('/api/v1/orders')) {
        return json({ list: ORDERS, total: 1, page: 1, pageSize: 20 })
      }
      return json(null)
    }),
  )
}

/** 登录态由模块级单例持有，测试中直接设置状态 */
function mountPage() {
  authState.profile = PROFILE
  authState.ready = true
  setSession('mock-token', PROFILE)
  mockApi()
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return mount(MemberCenterPage, { global: { plugins: [router] } })
}

beforeEach(() => {
  clearSession()
})

describe('MemberCenterPage', () => {
  test('展示会员卡：昵称、脱敏手机号、等级与积分', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('咖啡友5678')
    expect(text).toContain('138****5678')
    expect(text).toContain('金卡')
    expect(text).toContain('560')
    expect(text).toContain('再积 1440 分升级为黑卡')
  })

  test('展示订单列表：金额、取餐码与优惠券', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('SY20260926000011')
    expect(text).toContain('山野拿铁')
    expect(text).toContain('大杯 / 冰 / 少糖')
    expect(text).toContain('¥60.00')
    expect(text).toContain('取餐码 3253')
    expect(text).toContain('已用券：新客满 50 减 10')
    expect(text).toContain('2026-09-26 18:30')
  })

  test('积分明细表格', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.member__tabs button')[1]!.trigger('click')
    const text = wrapper.text()
    expect(text).toContain('消费积分')
    expect(text).toContain('+60')
    expect(text).toContain('活动赠送')
    expect(text).toContain('+500')
  })

  test('优惠券列表与筛选', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.member__tabs button')[2]!.trigger('click')
    let text = wrapper.text()
    expect(text).toContain('新客满 50 减 10')
    expect(text).toContain('¥10.00')
    expect(text).toContain('未使用')
    expect(text).toContain('已使用')

    // 筛选“未使用”
    await wrapper.findAll('.coupon-filter button')[1]!.trigger('click')
    text = wrapper.text()
    expect(text).toContain('新客满 50 减 10')
    expect(text).not.toContain('全场 8.5 折')
  })

  test('退出登录清空会话', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('.member-card__logout').trigger('click')
    await flushPromises()
    expect(localStorage.getItem('shanye_member_token')).toBeNull()
  })

  test('接口错误时展示中文错误', async () => {
    authState.profile = PROFILE
    authState.ready = true
    setSession('mock-token', PROFILE)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ code: 10002, data: null, message: '未登录或登录已过期' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    const wrapper = mount(MemberCenterPage, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('未登录或登录已过期')
  })
})
