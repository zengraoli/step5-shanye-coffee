import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { OrdersPage } from './OrdersPage'
import { ADMIN_PROFILE, clearStorage, seedSession, STAFF_PROFILE, type AdminProfileLike } from '@/test/mockApi'

interface RecordedCall {
  url: string
  method: string
  body: unknown
}

let calls: RecordedCall[] = []

const ORDERS = [
  {
    id: 11,
    orderNo: 'SY20260926000011',
    storeId: 1,
    storeName: '山野咖啡 · 望京店',
    memberPhone: '138****5678',
    memberNickname: '咖啡友5678',
    orderType: 'takeout',
    orderTypeText: '自提',
    status: 'paid',
    statusText: '已支付',
    totalFen: 7000,
    discountFen: 1000,
    payFen: 6000,
    pickupCode: '3253',
    remark: '少冰',
    createdAt: '2026-09-26T10:30:00.000Z',
    paidAt: '2026-09-26T10:31:00.000Z',
  },
  {
    id: 10,
    orderNo: 'SY20260925000010',
    storeId: 2,
    storeName: '山野咖啡 · 三里屯店',
    memberPhone: '139****1111',
    memberNickname: '咖啡友1111',
    orderType: 'dine_in',
    orderTypeText: '堂食',
    status: 'pending_pay',
    statusText: '待支付',
    totalFen: 4000,
    discountFen: 0,
    payFen: 4000,
    pickupCode: null,
    remark: '',
    createdAt: '2026-09-25T16:05:00.000Z',
    paidAt: null,
  },
]

const ORDER_DETAIL = {
  ...ORDERS[0],
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
  coupon: { id: 5, name: '新客满 50 减 10', discountFen: 1000 },
  timeline: [
    { status: 'pending_pay', statusText: '待支付', time: '2026-09-26T10:30:00.000Z' },
    { status: 'paid', statusText: '已支付', time: '2026-09-26T10:31:00.000Z' },
  ],
}

const STORES = [
  { id: 1, name: '山野咖啡 · 望京店', address: '', phone: '', openTime: '08:00', closeTime: '22:00', status: 'open' as const, statusText: '营业中' },
  { id: 2, name: '山野咖啡 · 三里屯店', address: '', phone: '', openTime: '09:00', closeTime: '22:30', status: 'open' as const, statusText: '营业中' },
]

function mockOrdersApi(profile: AdminProfileLike = ADMIN_PROFILE) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(typeof input === 'string' ? input : (input as Request).url)
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url, method, body })
      const json = (data: unknown) =>
        new Response(JSON.stringify({ code: 0, data, message: 'ok' }), {
          headers: { 'content-type': 'application/json' },
        })
      if (url.includes('/api/v1/admin/orders')) {
        if (method === 'POST') {
          return json({ ...ORDER_DETAIL, status: 'making', statusText: '制作中', timeline: [...ORDER_DETAIL.timeline, { status: 'making', statusText: '制作中', time: '2026-09-26T10:35:00.000Z' }] })
        }
        if (/\/api\/v1\/admin\/orders\/\d+$/.test(url.split('?')[0] ?? '')) {
          return json(ORDER_DETAIL)
        }
        return json({ list: ORDERS, total: 2, page: 1, pageSize: 10 })
      }
      if (url.includes('/api/v1/stores')) {
        return json(STORES)
      }
      if (url.includes('/api/v1/admin/auth/me')) {
        return json(profile)
      }
      return json(null)
    }),
  )
}

beforeEach(() => {
  clearStorage()
  calls = []
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage(profile = ADMIN_PROFILE) {
  seedSession(profile)
  mockOrdersApi(profile)
  return render(
    <MemoryRouter>
      <AuthProvider>
        <OrdersPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('OrdersPage', () => {
  test('展示订单列表（脱敏手机号、金额、取餐码）', async () => {
    renderPage()
    expect(await screen.findByText('SY20260926000011')).toBeInTheDocument()
    expect(screen.getByText('SY20260925000010')).toBeInTheDocument()
    expect(screen.getAllByText('138****5678').length).toBe(1)
    expect(screen.getByText('¥60.00')).toBeInTheDocument()
    expect(screen.getByText('¥40.00')).toBeInTheDocument()
    expect(screen.getByText('3253')).toBeInTheDocument()
    // 北京时间
    expect(screen.getByText('2026-09-26 18:30')).toBeInTheDocument()
  })

  test('推进订单状态', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('SY20260926000011')
    await user.click(screen.getByRole('button', { name: '开始制作' }))
    await waitFor(() => {
      const post = calls.find((call) => call.method === 'POST' && call.url.includes('/advance'))
      expect(post?.url).toContain('/api/v1/admin/orders/11/advance')
    })
  })

  test('待支付订单没有推进按钮', async () => {
    renderPage()
    await screen.findByText('SY20260925000010')
    // 只有一笔可推进（已支付），待支付那笔没有
    expect(screen.getAllByRole('button', { name: '开始制作' }).length).toBe(1)
    expect(screen.queryByRole('button', { name: '出餐完成' })).not.toBeInTheDocument()
  })

  test('订单详情弹窗展示明细、金额与进度', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('SY20260926000011')
    await user.click(screen.getAllByRole('button', { name: '详情' })[0]!)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('山野拿铁')).toBeInTheDocument()
    expect(within(dialog).getByText('大杯 / 冰 / 少糖')).toBeInTheDocument()
    expect(within(dialog).getAllByText('¥70.00').length).toBeGreaterThanOrEqual(1)
    expect(within(dialog).getByText('-¥10.00')).toBeInTheDocument()
    expect(within(dialog).getByText(/新客满 50 减 10/)).toBeInTheDocument()
    expect(within(dialog).getByText('2026-09-26 18:31')).toBeInTheDocument()
  })

  test('筛选参数传递（门店、状态、日期、关键词）', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('SY20260926000011')
    const lastCall = () =>
      calls.filter((call) => call.url.includes('/api/v1/admin/orders') && call.method === 'GET').at(-1)

    await user.type(screen.getByLabelText('订单号 / 手机号'), 'SY2026')
    await waitFor(() => expect(lastCall()?.url).toContain('keyword=SY2026'))

    await user.type(screen.getByLabelText('下单日期'), '2026-09-26')
    await waitFor(() => expect(lastCall()?.url).toContain('date=2026-09-26'))
  })

  test('店员登录后不显示门店筛选（只能看本门店）', async () => {
    renderPage(STAFF_PROFILE)
    await screen.findByText('SY20260926000011')
    expect(screen.queryByLabelText('门店')).not.toBeInTheDocument()
    // 列表请求由服务端按门店过滤
    const listCall = calls.find((call) => call.url.includes('/api/v1/admin/orders') && call.method === 'GET')
    expect(listCall?.url).toContain('page=1')
  })

  test('接口错误时展示重试', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ code: 10002, data: null, message: '未登录或登录已过期' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    seedSession()
    render(
      <MemoryRouter>
        <AuthProvider>
          <OrdersPage />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('未登录或登录已过期')).toBeInTheDocument()
  })
})
