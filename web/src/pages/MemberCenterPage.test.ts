import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import MemberCenterPage from './MemberCenterPage.vue'
import { clearSession, setSession, type MemberProfile } from '@/api/client'
import type { ClaimableCoupon, MemberCoupon, MemberOrder, PointsSummary } from '@/api/member'
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

/** 我的优惠券（可变：领取成功后追加） */
const couponStore: MemberCoupon[] = [...COUPONS]

/** 可领取的券模板 */
const CLAIMABLE: ClaimableCoupon[] = [
  {
    id: 3,
    name: '新人 8.8 折券',
    type: 'discount',
    typeText: '折扣券',
    thresholdFen: 2000,
    reduceFen: 0,
    discountPercent: 88,
    maxReduceFen: 1000,
    validDays: 7,
    total: 500,
    remaining: 320,
    status: 'active',
  },
  {
    id: 4,
    name: '免运券',
    type: 'full_reduction',
    typeText: '满减券',
    thresholdFen: 0,
    reduceFen: 300,
    discountPercent: 100,
    maxReduceFen: 0,
    validDays: 15,
    total: 200,
    remaining: 0,
    status: 'active',
  },
]

const CLAIMED_RESULT: MemberCoupon = {
  id: 90,
  couponId: 3,
  name: '新人 8.8 折券',
  type: 'discount',
  typeText: '折扣券',
  thresholdFen: 2000,
  reduceFen: 0,
  discountPercent: 88,
  maxReduceFen: 1000,
  validFrom: '2026-09-26T02:00:00.000Z',
  validTo: '2026-10-03T02:00:00.000Z',
  status: 'unused',
  statusText: '未使用',
  obtainedAt: '2026-09-26T02:00:00.000Z',
  usedAt: null,
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
        return json(couponStore)
      }
      if (url.endsWith('/api/v1/coupons')) {
        return json(CLAIMABLE)
      }
      if (url.includes('/api/v1/coupons/') && url.includes('/claim')) {
        couponStore.push(CLAIMED_RESULT)
        return json(CLAIMED_RESULT)
      }
      if (url.includes('/api/v1/orders')) {
        return json({ list: ORDERS, total: 1, page: 1, pageSize: 20 })
      }
      return json(null)
    }),
  )
}

/** 登录态由模块级单例持有，测试中直接设置状态 */
function mountPage(loggedIn = true) {
  authState.profile = loggedIn ? PROFILE : null
  authState.ready = true
  if (loggedIn) {
    setSession('mock-token', PROFILE)
  } else {
    clearSession()
  }
  mockApi()
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/member/login', name: 'member-login', component: { template: '<div />' } },
    ],
  })
  return { wrapper: mount(MemberCenterPage, { global: { plugins: [router] } }), router }
}

beforeEach(() => {
  clearSession()
  couponStore.splice(0, couponStore.length, ...COUPONS)
})

describe('MemberCenterPage', () => {
  test('展示会员卡：昵称、脱敏手机号、等级与积分', async () => {
    const { wrapper } = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('咖啡友5678')
    expect(text).toContain('138****5678')
    expect(text).toContain('金卡')
    expect(text).toContain('560')
    expect(text).toContain('再积 1440 分升级为黑卡')
  })

  test('展示订单列表：金额、取餐码与优惠券', async () => {
    const { wrapper } = mountPage()
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
    const { wrapper } = mountPage()
    await flushPromises()
    await wrapper.findAll('.member__tabs button')[1]!.trigger('click')
    const text = wrapper.text()
    expect(text).toContain('消费积分')
    expect(text).toContain('+60')
    expect(text).toContain('活动赠送')
    expect(text).toContain('+500')
  })

  test('优惠券列表与筛选', async () => {
    const { wrapper } = mountPage()
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
    const { wrapper } = mountPage()
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

describe('MemberCenterPage 领券中心', () => {
  test('列出可领取模板：类型 / 门槛 / 优惠 / 有效天数 / 剩余量', async () => {
    const { wrapper } = mountPage()
    await flushPromises()
    await wrapper.findAll('.member__tabs button')[3]!.trigger('click')
    const text = wrapper.text()
    expect(text).toContain('新人 8.8 折券')
    expect(text).toContain('折扣券')
    expect(text).toContain('满 ¥20.00 可用')
    expect(text).toContain('领取后 7 天内有效')
    expect(text).toContain('剩余 320 张')
    expect(text).toContain('优惠：8.8 折 · 最高减 ¥10.00')
  })

  test('已领完的模板禁用并显示“已领完”', async () => {
    const { wrapper } = mountPage()
    await flushPromises()
    await wrapper.findAll('.member__tabs button')[3]!.trigger('click')
    const items = wrapper.findAll('.claim-item')
    const soldOut = items[1]!
    expect(soldOut.text()).toContain('免运券')
    const button = soldOut.find('button')
    expect(button!.text()).toBe('已领完')
    expect(button!.attributes('disabled')).toBeDefined()
  })

  test('领取成功后刷新“我的优惠券”', async () => {
    const { wrapper } = mountPage()
    await flushPromises()
    await wrapper.findAll('.member__tabs button')[3]!.trigger('click')
    const button = wrapper.findAll('.claim-item')[0]!.find('button')
    await button!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('领取成功，已放入“我的优惠券”')
    // 已领取的模板按钮变为“已领取”
    const claimed = wrapper.findAll('.claim-item')[0]!.find('button')
    expect(claimed!.text()).toBe('已领取')
    // 我的优惠券里出现刚领取的券
    await wrapper.findAll('.member__tabs button')[2]!.trigger('click')
    expect(wrapper.text()).toContain('新人 8.8 折券')
  })

  test('未登录时引导去登录', async () => {
    const { wrapper, router } = mountPage(false)
    await flushPromises()
    await wrapper.findAll('.member__tabs button')[3]!.trigger('click')
    expect(wrapper.text()).toContain('登录后即可领券')
    await wrapper.find('.member__inline-btn').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('member-login')
  })
})

describe('MemberCenterPage 加载失败分类', () => {
  test('401：展示“登录已过期，重新登录”并跳登录页', async () => {
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
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/member/login', name: 'member-login', component: { template: '<div />' } },
      ],
    })
    const wrapper = mount(MemberCenterPage, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('未登录或登录已过期')
    const button = wrapper.find('.member__status button')
    expect(button.text()).toContain('登录已过期，重新登录')
    await button.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('member-login')
  })

  test('网络异常：展示“网络异常，请检查服务是否启动”与重试按钮，且不清会话', async () => {
    authState.profile = PROFILE
    authState.ready = true
    setSession('mock-token', PROFILE)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    const wrapper = mount(MemberCenterPage, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('网络异常，请检查服务是否启动')
    const button = wrapper.find('.member__status button')
    expect(button.text()).toBe('重试')
    // 网络异常不清会话（保留登录态）
    expect(localStorage.getItem('shanye_member_token')).toBe('mock-token')
    expect(wrapper.find('.member-card__name').text()).toBe('咖啡友5678')
  })
})
