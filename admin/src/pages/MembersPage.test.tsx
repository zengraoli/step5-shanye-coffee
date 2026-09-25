import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { MembersPage } from './MembersPage'
import { clearStorage, seedSession } from '@/test/mockApi'

const MEMBERS = [
  {
    id: 1,
    phone: '138****5678',
    maskedPhone: '138****5678',
    nickname: '咖啡友5678',
    points: 560,
    level: 'gold',
    levelText: '金卡',
    nextLevel: 'black',
    nextLevelText: '黑卡',
    pointsToNextLevel: 1440,
    createdAt: '2026-09-20T02:00:00.000Z',
    orderCount: 8,
    totalPayFen: 56000,
    lastOrderAt: '2026-09-26T10:30:00.000Z',
  },
  {
    id: 2,
    phone: '139****1111',
    maskedPhone: '139****1111',
    nickname: '咖啡友1111',
    points: 40,
    level: 'silver',
    levelText: '银卡',
    nextLevel: 'gold',
    nextLevelText: '金卡',
    pointsToNextLevel: 460,
    createdAt: '2026-09-25T16:00:00.000Z',
    orderCount: 1,
    totalPayFen: 4000,
    lastOrderAt: '2026-09-25T16:05:00.000Z',
  },
]

const MEMBER_DETAIL = {
  ...MEMBERS[0],
  orders: [
    {
      id: 11,
      orderNo: 'SY20260926000011',
      storeId: 1,
      orderType: 'takeout',
      status: 'paid',
      totalFen: 7000,
      discountFen: 1000,
      payFen: 6000,
      pickupCode: '3253',
      createdAt: '2026-09-26T10:30:00.000Z',
    },
  ],
  pointsLogs: [
    { id: 1, change: 60, reason: '消费积分', orderId: 11, createdAt: '2026-09-26T10:31:00.000Z' },
  ],
  coupons: [
    { id: 5, name: '新客满 50 减 10', type: 'full_reduction', status: 'used', validFrom: '2026-09-26T10:00:00.000Z', validTo: '2026-10-26T10:00:00.000Z' },
  ],
}

interface RecordedCall {
  url: string
  method: string
}

let calls: RecordedCall[] = []

function mockMembersApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(typeof input === 'string' ? input : (input as Request).url)
      calls.push({ url, method: 'GET' })
      const json = (data: unknown) =>
        new Response(JSON.stringify({ code: 0, data, message: 'ok' }), {
          headers: { 'content-type': 'application/json' },
        })
      if (/\/api\/v1\/admin\/members\/\d+$/.test(url.split('?')[0] ?? '')) {
        return json(MEMBER_DETAIL)
      }
      if (url.includes('/api/v1/admin/members')) {
        return json({ list: MEMBERS, total: 2, page: 1, pageSize: 10 })
      }
      return json(null)
    }),
  )
}

beforeEach(() => {
  clearStorage()
  calls = []
  mockMembersApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  seedSession()
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MembersPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('MembersPage', () => {
  test('会员列表手机号脱敏、等级与积分', async () => {
    renderPage()
    expect(await screen.findByText('咖啡友5678')).toBeInTheDocument()
    expect(screen.getByText('咖啡友1111')).toBeInTheDocument()
    // 脱敏手机号
    expect(screen.getByText('138****5678')).toBeInTheDocument()
    expect(screen.getByText('139****1111')).toBeInTheDocument()
    expect(screen.queryByText(/^138\d{8}$/)).not.toBeInTheDocument()
    expect(screen.getByText('金卡')).toBeInTheDocument()
    expect(screen.getByText('银卡')).toBeInTheDocument()
    expect(screen.getByText('560')).toBeInTheDocument()
    // 累计消费 ¥xx.xx
    expect(screen.getByText('¥560.00')).toBeInTheDocument()
    expect(screen.getByText('¥40.00')).toBeInTheDocument()
  })

  test('会员详情展示积分、订单与优惠券', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('咖啡友5678')
    await user.click(screen.getAllByRole('button', { name: '详情' })[0]!)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('138****5678')).toBeInTheDocument()
    expect(within(dialog).getByText('SY20260926000011')).toBeInTheDocument()
    expect(within(dialog).getByText('¥60.00')).toBeInTheDocument()
    expect(within(dialog).getByText(/新客满 50 减 10/)).toBeInTheDocument()
    expect(within(dialog).getByText('消费积分')).toBeInTheDocument()
    expect(within(dialog).getByText('+60')).toBeInTheDocument()
    // 升级进度
    expect(within(dialog).getByText('1440 分')).toBeInTheDocument()
  })

  test('按等级筛选', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('咖啡友5678')
    await user.click(screen.getByLabelText('等级'))
    await user.click(await screen.findByRole('option', { name: '金卡' }))
    await waitFor(() => {
      const last = calls.filter((call) => call.url.includes('/api/v1/admin/members')).at(-1)
      expect(last?.url).toContain('level=gold')
    })
  })

  test('关键词筛选', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('咖啡友5678')
    await user.type(screen.getByLabelText('手机号 / 昵称'), '5678')
    await waitFor(() => {
      const last = calls.filter((call) => call.url.includes('/api/v1/admin/members')).at(-1)
      expect(last?.url).toContain('keyword=5678')
    })
  })
})
