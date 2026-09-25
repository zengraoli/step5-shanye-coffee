import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { CouponsPage } from './CouponsPage'
import { clearStorage, seedSession } from '@/test/mockApi'

interface RecordedCall {
  url: string
  method: string
  body: unknown
}

let calls: RecordedCall[] = []

const COUPONS = [
  {
    id: 1,
    name: '新客满 50 减 10',
    type: 'full_reduction',
    typeText: '满减券',
    thresholdFen: 5000,
    reduceFen: 1000,
    discountPercent: 100,
    maxReduceFen: 0,
    validDays: 30,
    total: 1000,
    remaining: 860,
    status: 'active',
    claimedCount: 140,
  },
  {
    id: 2,
    name: '全场 8.5 折（最高减 20）',
    type: 'discount',
    typeText: '折扣券',
    thresholdFen: 3000,
    reduceFen: 0,
    discountPercent: 85,
    maxReduceFen: 2000,
    validDays: 15,
    total: 1000,
    remaining: 0,
    status: 'inactive',
    claimedCount: 1000,
  },
]

function mockCouponsApi() {
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
      if (url.includes('/api/v1/admin/coupons')) {
        if (method === 'POST') {
          return json({ id: 99, ...(body as object), typeText: '满减券', status: 'active', remaining: 100, total: 100 })
        }
        if (method === 'PUT') {
          return json({ id: 1, ...(body as object) })
        }
        if (method === 'PATCH') {
          return json({ id: 1, status: body && (body as { status: string }).status })
        }
        return json(COUPONS)
      }
      return json(null)
    }),
  )
}

beforeEach(() => {
  clearStorage()
  calls = []
  mockCouponsApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  seedSession()
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CouponsPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('CouponsPage', () => {
  test('展示优惠券模板与规则', async () => {
    renderPage()
    expect(await screen.findByText('新客满 50 减 10')).toBeInTheDocument()
    expect(screen.getByText('全场 8.5 折（最高减 20）')).toBeInTheDocument()
    expect(screen.getByText('满减券')).toBeInTheDocument()
    expect(screen.getByText('折扣券')).toBeInTheDocument()
    expect(screen.getByText('满 50.00 元减 10.00 元')).toBeInTheDocument()
    expect(screen.getByText('8.5 折（满 30.00 元可用，最高减 20.00 元）')).toBeInTheDocument()
    expect(screen.getByText('860 / 1000')).toBeInTheDocument()
    expect(screen.getByText('进行中')).toBeInTheDocument()
    expect(screen.getByText('已停用')).toBeInTheDocument()
  })

  test('新增满减券（元转分）', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('新客满 50 减 10')

    await user.click(screen.getByRole('button', { name: '新增优惠券' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('券名称'), '测试满 30 减 5')
    await user.type(within(dialog).getByLabelText('使用门槛（元）'), '30.00')
    await user.type(within(dialog).getByLabelText('减免金额（元）'), '5.00')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const post = calls.find((call) => call.method === 'POST' && call.url.includes('/api/v1/admin/coupons'))
      expect(post?.body).toMatchObject({
        name: '测试满 30 减 5',
        type: 'full_reduction',
        thresholdFen: 3000,
        reduceFen: 500,
        validDays: 7,
        total: 1000,
      })
    })
  })

  test('新增折扣券并校验折扣范围', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('新客满 50 减 10')

    await user.click(screen.getByRole('button', { name: '新增优惠券' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('券名称'), '测试 7 折')
    await user.click(within(dialog).getByLabelText('券类型'))
    await user.click(await screen.findByRole('option', { name: '折扣券' }))
    await user.clear(within(dialog).getByLabelText('折扣（1-99）'))
    await user.type(within(dialog).getByLabelText('折扣（1-99）'), '70')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const post = calls.find((call) => call.method === 'POST' && call.url.includes('/api/v1/admin/coupons'))
      expect(post?.body).toMatchObject({ type: 'discount', discountPercent: 70 })
    })
  })

  test('编辑与停用', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('新客满 50 减 10')

    await user.click(screen.getAllByRole('button', { name: '编辑' })[0]!)
    const dialog = await screen.findByRole('dialog')
    expect((within(dialog).getByLabelText('使用门槛（元）') as HTMLInputElement).value).toBe('50.00')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))
    await waitFor(() => {
      const put = calls.find((call) => call.method === 'PUT' && call.url.includes('/api/v1/admin/coupons/1'))
      expect(put).toBeDefined()
    })

    await user.click(screen.getByRole('button', { name: '停用' }))
    await waitFor(() => {
      const patch = calls.find(
        (call) => call.method === 'PATCH' && call.url.includes('/api/v1/admin/coupons/1/status'),
      )
      expect(patch?.body).toMatchObject({ status: 'inactive' })
    })
  })
})
