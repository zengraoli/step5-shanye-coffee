import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { DashboardPage } from './DashboardPage'
import { clearStorage } from '@/test/mockApi'

const DASHBOARD_FIXTURE = {
  scope: 'all',
  storeId: null,
  today: {
    date: '2026-09-26',
    revenueFen: 10000,
    orderCount: 2,
    avgOrderFen: 5000,
    newMembers: 1,
  },
  trend: [
    { date: '2026-09-20', revenueFen: 3200, orderCount: 1 },
    { date: '2026-09-21', revenueFen: 0, orderCount: 0 },
    { date: '2026-09-22', revenueFen: 6400, orderCount: 2 },
    { date: '2026-09-23', revenueFen: 0, orderCount: 0 },
    { date: '2026-09-24', revenueFen: 4800, orderCount: 1 },
    { date: '2026-09-25', revenueFen: 0, orderCount: 0 },
    { date: '2026-09-26', revenueFen: 10000, orderCount: 2 },
  ],
  topProducts: [
    { productId: 1, productName: '山野拿铁', quantity: 8, amountFen: 28000 },
    { productId: 2, productName: '琥珀美式', quantity: 5, amountFen: 14000 },
  ],
  latestOrders: [
    {
      id: 3,
      orderNo: 'SY20260926000003',
      storeId: 1,
      storeName: '山野咖啡 · 望京店',
      memberPhone: '138****5678',
      memberNickname: '咖啡友5678',
      status: 'paid',
      statusText: '已支付',
      totalFen: 7000,
      discountFen: 1000,
      payFen: 6000,
      pickupCode: '3253',
      createdAt: '2026-09-26T10:30:00.000Z',
    },
    {
      id: 2,
      orderNo: 'SY20260925000002',
      storeId: 2,
      storeName: '山野咖啡 · 三里屯店',
      memberPhone: '139****1111',
      memberNickname: '咖啡友1111',
      status: 'completed',
      statusText: '已完成',
      totalFen: 4000,
      discountFen: 0,
      payFen: 4000,
      pickupCode: '1024',
      createdAt: '2026-09-25T16:05:00.000Z',
    },
  ],
}

beforeEach(() => {
  clearStorage()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ code: 0, data: DASHBOARD_FIXTURE, message: 'ok' }), {
        headers: { 'content-type': 'application/json' },
      }),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  test('展示今日经营指标（金额格式化为 ¥xx.xx）', async () => {
    renderPage()
    expect(await screen.findByText('今日营业额')).toBeInTheDocument()
    expect(screen.getByText('¥100.00')).toBeInTheDocument()
    expect(screen.getByText('2 单')).toBeInTheDocument()
    expect(screen.getByText('¥50.00')).toBeInTheDocument()
    expect(screen.getByText('1 人')).toBeInTheDocument()
  })

  test('渲染近 7 天趋势图与热销图', async () => {
    const { container } = renderPage()
    expect(await screen.findByText('近 7 天营业额趋势')).toBeInTheDocument()
    await waitFor(() => {
      expect(container.querySelectorAll('svg.recharts-surface').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getByText('热销 Top10')).toBeInTheDocument()
    expect(screen.getAllByText('山野拿铁').length).toBeGreaterThan(0)
  })

  test('展示最新订单表格（北京时间与脱敏手机号）', async () => {
    renderPage()
    expect(await screen.findByText('最新订单')).toBeInTheDocument()
    expect(screen.getByText('SY20260926000003')).toBeInTheDocument()
    expect(screen.getByText('SY20260925000002')).toBeInTheDocument()
    // ¥60.00 / ¥40.00 实付金额
    expect(screen.getByText('¥60.00')).toBeInTheDocument()
    expect(screen.getByText('¥40.00')).toBeInTheDocument()
    // 北京时间 2026-09-26 18:30
    expect(screen.getByText('2026-09-26 18:30')).toBeInTheDocument()
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
    renderPage()
    expect(await screen.findByText('未登录或登录已过期')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument()
  })
})
