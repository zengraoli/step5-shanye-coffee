import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { PromoPage } from './PromoPage'
import { ADMIN_PROFILE, clearStorage, seedSession } from '@/test/mockApi'

interface RecordedCall {
  url: string
  method: string
  body: unknown
}

let calls: RecordedCall[] = []

const PRODUCTS = [
  { id: 1, categoryId: 1, categoryName: '咖啡', name: '山野拿铁', subtitle: '招牌', description: '', image: '', basePrice: 3200, onSale: true, soldOut: false, sort: 1, specs: [] },
  { id: 2, categoryId: 1, categoryName: '咖啡', name: '琥珀美式', subtitle: '', description: '', image: '', basePrice: 2800, onSale: true, soldOut: false, sort: 2, specs: [] },
  { id: 13, categoryId: 3, categoryName: '轻食', name: '海盐芝士可颂', subtitle: '', description: '', image: '', basePrice: 1800, onSale: true, soldOut: false, sort: 1, specs: [] },
]

const PROMO_STATE = {
  active: true,
  activity: {
    id: 1,
    name: '第二杯半价',
    type: 'second_half' as const,
    status: 'active' as const,
    startAt: '2026-09-01T00:00:00.000Z',
    endAt: '2026-12-31T23:59:59.000Z',
    productIds: [1, 2],
  },
}

function mockApi() {
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
      if (url.includes('/api/v1/admin/promo')) {
        if (method === 'PUT') {
          return json({ active: true, activity: { ...PROMO_STATE.activity, ...(body as object) } })
        }
        return json(PROMO_STATE)
      }
      if (url.includes('/api/v1/admin/products')) {
        return json({ list: PRODUCTS, total: 3, page: 1, pageSize: 100 })
      }
      if (url.includes('/api/v1/admin/auth/me')) {
        return json(ADMIN_PROFILE)
      }
      return json(null)
    }),
  )
}

function renderPage() {
  seedSession()
  mockApi()
  return render(
    <MemoryRouter>
      <AuthProvider>
        <PromoPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  clearStorage()
  calls = []
})

describe('PromoPage', () => {
  test('回显当前活动配置（北京时间）与适用商品', async () => {
    renderPage()
    expect(await screen.findByText('第二杯半价')).toBeInTheDocument()
    // 2026-09-01T00:00Z → 北京时间 08:00
    const start = screen.getByLabelText('开始时间（北京时间）') as HTMLInputElement
    const end = screen.getByLabelText('结束时间（北京时间）') as HTMLInputElement
    expect(start.value).toBe('2026-09-01T08:00')
    expect(end.value).toBe('2027-01-01T07:59')
    expect(screen.getByText(/已选 2 款/)).toBeInTheDocument()
    // 适用商品勾选状态
    const coffee = screen.getByText('咖啡')
    expect(coffee).toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checkboxes[0]?.checked).toBe(true)
    expect(checkboxes[1]?.checked).toBe(true)
    expect(checkboxes[2]?.checked).toBe(false)
  })

  test('保存配置：时间为 UTC ISO8601，商品列表正确', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('第二杯半价')

    const start = screen.getByLabelText('开始时间（北京时间）') as HTMLInputElement
    await user.clear(start)
    await user.type(start, '2026-10-01T08:00')

    // 勾选轻食商品
    const foodCheckbox = screen.getAllByRole('checkbox')[2]!
    await user.click(foodCheckbox)

    await user.click(screen.getByRole('button', { name: '保存配置' }))

    await waitFor(() => {
      const put = calls.find((call) => call.method === 'PUT' && call.url.includes('/api/v1/admin/promo'))
      expect(put).toBeDefined()
      expect(put?.body).toMatchObject({
        status: 'active',
        startAt: '2026-10-01T00:00:00.000Z',
        productIds: [1, 2, 13],
      })
    })
  })

  test('结束时间早于开始时间给出中文错误', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('第二杯半价')

    const start = screen.getByLabelText('开始时间（北京时间）') as HTMLInputElement
    const end = screen.getByLabelText('结束时间（北京时间）') as HTMLInputElement
    await user.clear(start)
    await user.type(start, '2026-12-01T08:00')
    await user.clear(end)
    await user.type(end, '2026-11-01T08:00')
    await user.click(screen.getByRole('button', { name: '保存配置' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('结束时间必须晚于开始时间')
  })

  test('未选择适用商品时阻止保存', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('第二杯半价')

    // 取消全部已选
    const coffeeBoxes = within(screen.getByText('咖啡').closest('div')!.parentElement!).getAllByRole('checkbox')
    for (const box of coffeeBoxes) {
      await user.click(box)
    }
    await user.click(screen.getByRole('button', { name: '保存配置' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('请至少选择一个适用商品')
  })
})
