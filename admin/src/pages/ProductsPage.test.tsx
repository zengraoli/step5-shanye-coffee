import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { ProductsPage } from './ProductsPage'
import { ADMIN_PROFILE, clearStorage, mockApi, seedSession } from '@/test/mockApi'

const CATEGORIES = [
  { id: 1, name: '咖啡', sort: 1, productCount: 6 },
  { id: 2, name: '茶饮', sort: 2, productCount: 6 },
]

const PRODUCTS = [
  {
    id: 1,
    categoryId: 1,
    categoryName: '咖啡',
    name: '山野拿铁',
    subtitle: '招牌',
    description: '云南SOE浓缩与冷藏鲜奶',
    image: '',
    basePrice: 3200,
    onSale: true,
    soldOut: false,
    sort: 1,
    specs: [
      {
        key: 'cup',
        label: '杯型',
        options: [
          { value: 'medium', label: '中杯', extra: 0 },
          { value: 'large', label: '大杯', extra: 300 },
        ],
      },
    ],
  },
  {
    id: 2,
    categoryId: 1,
    categoryName: '咖啡',
    name: '琥珀美式',
    subtitle: '清爽',
    description: '双重萃取冰美式',
    image: '',
    basePrice: 2800,
    onSale: false,
    soldOut: true,
    sort: 2,
    specs: [],
  },
]

interface RecordedCall {
  url: string
  method: string
  body: unknown
}

let calls: RecordedCall[] = []

function mockProductsApi() {
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
      if (url.includes('/api/v1/admin/products')) {
        if (method === 'POST') {
          return json({ id: 99, ...(body as object), onSale: true, soldOut: false, specs: [] })
        }
        if (method === 'PUT') {
          return json({ id: 1, ...(body as object), specs: [] })
        }
        if (method === 'PATCH') {
          return json({ id: 1, ...(body as object), specs: [] })
        }
        return json({ list: PRODUCTS, total: 2, page: 1, pageSize: 10 })
      }
      if (url.includes('/api/v1/categories')) {
        return json(CATEGORIES)
      }
      if (url.includes('/api/v1/admin/auth/me')) {
        return json(ADMIN_PROFILE)
      }
      return json(null)
    }),
  )
}

beforeEach(() => {
  clearStorage()
  calls = []
  mockProductsApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  seedSession()
  mockApi({ profile: ADMIN_PROFILE })
  mockProductsApi()
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProductsPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProductsPage', () => {
  test('展示商品列表（金额 ¥xx.xx 与状态）', async () => {
    renderPage()
    expect(await screen.findByText('山野拿铁')).toBeInTheDocument()
    expect(screen.getByText('¥32.00')).toBeInTheDocument()
    expect(screen.getByText('琥珀美式')).toBeInTheDocument()
    expect(screen.getByText('¥28.00')).toBeInTheDocument()
    expect(screen.getByText('上架中')).toBeInTheDocument()
    expect(screen.getByText('已下架')).toBeInTheDocument()
    // 「售罄」既是状态徽章也是操作按钮
    expect(screen.getAllByText('售罄').length).toBeGreaterThanOrEqual(2)
  })

  test('筛选与分页参数正确传递', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('山野拿铁')

    const lastListCall = () =>
      calls.filter((call) => call.url.includes('/api/v1/admin/products') && call.method === 'GET').at(-1)

    await user.type(screen.getByLabelText('商品名称'), '拿铁')
    await waitFor(() => {
      expect(lastListCall()?.url).toContain('keyword=')
    })

    await user.click(screen.getByRole('button', { name: '重置' }))
    await waitFor(() => {
      expect(lastListCall()?.url).toContain('page=1')
      expect(lastListCall()?.url).not.toContain('keyword=')
    })
  })

  test('新增商品：价格元转分提交', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('山野拿铁')

    await user.click(screen.getByRole('button', { name: '新增商品' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('商品名称'), '测试限定拿铁')
    await user.type(within(dialog).getByLabelText('价格（元）'), '36.50')
    await user.type(within(dialog).getByLabelText('副标题'), '限定')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const post = calls.find((call) => call.method === 'POST' && call.url.includes('/api/v1/admin/products'))
      expect(post).toBeDefined()
      expect(post?.body).toMatchObject({
        name: '测试限定拿铁',
        basePrice: 3650,
        subtitle: '限定',
        categoryId: 1,
      })
    })
  })

  test('编辑商品回填并提交', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('山野拿铁')

    await user.click(screen.getAllByRole('button', { name: '编辑' })[0]!)
    const dialog = await screen.findByRole('dialog')
    const nameInput = within(dialog).getByLabelText('商品名称') as HTMLInputElement
    expect(nameInput.value).toBe('山野拿铁')
    const priceInput = within(dialog).getByLabelText('价格（元）') as HTMLInputElement
    expect(priceInput.value).toBe('32.00')

    await user.clear(priceInput)
    await user.type(priceInput, '33.00')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const put = calls.find((call) => call.method === 'PUT' && call.url.includes('/api/v1/admin/products/1'))
      expect(put?.body).toMatchObject({ basePrice: 3300, name: '山野拿铁' })
    })
  })

  test('上架 / 下架与售罄切换', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('山野拿铁')

    await user.click(screen.getByRole('button', { name: '下架' }))
    await waitFor(() => {
      const patch = calls.find(
        (call) => call.method === 'PATCH' && call.url.includes('/api/v1/admin/products/1/status'),
      )
      expect(patch?.body).toMatchObject({ onSale: false })
    })

    // 第二行（已下架）显示“上架”按钮
    await user.click(screen.getByRole('button', { name: '上架' }))
    await waitFor(() => {
      const patch = calls.find(
        (call) => call.method === 'PATCH' && call.url.includes('/api/v1/admin/products/2/status'),
      )
      expect(patch?.body).toMatchObject({ onSale: true })
    })
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
          <ProductsPage />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('未登录或登录已过期')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument()
  })
})
