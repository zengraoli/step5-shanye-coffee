import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { StoresPage } from './StoresPage'
import { clearStorage, seedSession } from '@/test/mockApi'

interface RecordedCall {
  url: string
  method: string
  body: unknown
}

let calls: RecordedCall[] = []

const STORES = [
  {
    id: 1,
    name: '山野咖啡 · 望京店',
    address: '北京市朝阳区望京南湖东园一区 212 号',
    phone: '010-64781234',
    openTime: '08:00',
    closeTime: '22:00',
    status: 'open',
    statusText: '营业中',
  },
  {
    id: 2,
    name: '山野咖啡 · 三里屯店',
    address: '北京市朝阳区工人体育场北路 8 号院 3 号楼',
    phone: '010-64168899',
    openTime: '09:00',
    closeTime: '22:30',
    status: 'rest',
    statusText: '休息中',
  },
]

function mockStoresApi() {
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
      if (url.includes('/api/v1/admin/stores')) {
        if (method === 'PUT') {
          const id = Number(url.split('/').pop())
          const store = STORES.find((item) => item.id === id)!
          return json({ ...store, ...(body as object) })
        }
        return json(STORES)
      }
      return json(null)
    }),
  )
}

beforeEach(() => {
  clearStorage()
  calls = []
  mockStoresApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  seedSession()
  return render(
    <MemoryRouter>
      <AuthProvider>
        <StoresPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('StoresPage', () => {
  test('展示门店列表与营业状态', async () => {
    renderPage()
    expect(await screen.findByText('山野咖啡 · 望京店')).toBeInTheDocument()
    expect(screen.getByText('山野咖啡 · 三里屯店')).toBeInTheDocument()
    expect(screen.getByText('营业中')).toBeInTheDocument()
    expect(screen.getByText('休息中')).toBeInTheDocument()
    expect(screen.getByText('每日 08:00 - 22:00')).toBeInTheDocument()
    expect(screen.getByText('010-64781234')).toBeInTheDocument()
  })

  test('编辑门店并提交', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('山野咖啡 · 望京店')

    await user.click(screen.getAllByRole('button', { name: '编辑' })[0]!)
    const dialog = await screen.findByRole('dialog')
    const nameInput = within(dialog).getByLabelText('门店名称') as HTMLInputElement
    expect(nameInput.value).toBe('山野咖啡 · 望京店')

    await user.clear(nameInput)
    await user.type(nameInput, '山野咖啡 · 望京旗舰店')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const put = calls.find((call) => call.method === 'PUT' && call.url.includes('/api/v1/admin/stores/1'))
      expect(put?.body).toMatchObject({ name: '山野咖啡 · 望京旗舰店', openTime: '08:00' })
    })
  })
})
