import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { AccountsPage } from './AccountsPage'
import { ADMIN_PROFILE, clearStorage, seedSession } from '@/test/mockApi'

interface RecordedCall {
  url: string
  method: string
  body: unknown
}

let calls: RecordedCall[] = []

const ACCOUNTS = [
  {
    id: 1,
    username: 'admin',
    role: 'admin',
    storeId: null,
    storeName: null,
    nickname: '系统管理员',
    status: 'active',
    createdAt: '2026-09-20T02:00:00.000Z',
  },
  {
    id: 2,
    username: 'staff',
    role: 'staff',
    storeId: 1,
    storeName: '山野咖啡 · 望京店',
    nickname: '门店店员',
    status: 'active',
    createdAt: '2026-09-20T02:00:00.000Z',
  },
]

const STORES = [
  { id: 1, name: '山野咖啡 · 望京店', address: '', phone: '', openTime: '08:00', closeTime: '22:00', status: 'open' as const, statusText: '营业中' },
  { id: 2, name: '山野咖啡 · 三里屯店', address: '', phone: '', openTime: '09:00', closeTime: '22:30', status: 'open' as const, statusText: '营业中' },
]

function mockAccountsApi() {
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
        return json(STORES)
      }
      if (url.includes('reset-password')) {
        return json({ id: 2, username: 'staff', password: 'reset-pass-456', generated: true })
      }
      if (url.includes('/api/v1/admin/accounts')) {
        if (method === 'POST') {
          return json({
            account: {
              id: 9,
              username: (body as { username: string }).username,
              role: (body as { role: string }).role,
              storeId: (body as { storeId: number | null }).storeId ?? null,
              storeName: null,
              nickname: '新账号',
              status: 'active',
              createdAt: '2026-09-26T10:00:00.000Z',
            },
            password: 'generated-pass-123',
          })
        }
        if (method === 'PATCH' && url.includes('/status')) {
          return json({ id: 2, status: (body as { status: string }).status })
        }
        if (method === 'PATCH') {
          return json({ id: 2, ...(body as object) })
        }
        return json(ACCOUNTS)
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
  mockAccountsApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  seedSession()
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AccountsPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AccountsPage', () => {
  test('展示账号列表与角色', async () => {
    renderPage()
    expect(await screen.findByText('admin')).toBeInTheDocument()
    expect(screen.getByText('staff')).toBeInTheDocument()
    expect(screen.getByText('管理员')).toBeInTheDocument()
    expect(screen.getByText('店员')).toBeInTheDocument()
    expect(screen.getByText('系统管理员')).toBeInTheDocument()
    expect(screen.getByText('山野咖啡 · 望京店')).toBeInTheDocument()
    expect(screen.getByText('当前登录')).toBeInTheDocument()
  })

  test('新增账号并展示生成的密码', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('admin')

    await user.click(screen.getByRole('button', { name: '新增账号' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('账号'), 'newstaff')
    await user.click(within(dialog).getByRole('button', { name: '创建账号' }))

    await waitFor(() => {
      const post = calls.find((call) => call.method === 'POST' && call.url.includes('/api/v1/admin/accounts'))
      expect(post?.body).toMatchObject({ username: 'newstaff', role: 'staff', storeId: 1 })
    })
    // 创建成功后展示一次性密码
    expect(await within(screen.getByRole('dialog')).findByText('generated-pass-123')).toBeInTheDocument()
  })

  test('停用账号', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('admin')

    // staff 行的停用按钮（admin 行是当前登录账号，按钮禁用）
    const row = screen.getByText('staff').closest('tr')!
    await user.click(within(row as HTMLElement).getByRole('button', { name: '停用' }))
    await waitFor(() => {
      const patch = calls.find(
        (call) => call.method === 'PATCH' && call.url.includes('/api/v1/admin/accounts/2/status'),
      )
      expect(patch?.body).toMatchObject({ status: 'inactive' })
    })
  })

  test('重置密码并展示新密码', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('admin')

    const row = screen.getByText('staff').closest('tr')!
    await user.click(within(row as HTMLElement).getByRole('button', { name: '重置密码' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '确认重置' }))

    await waitFor(() => {
      const post = calls.find((call) => call.url.includes('/reset-password'))
      expect(post?.url).toContain('/api/v1/admin/accounts/2/reset-password')
    })
    expect(await within(screen.getByRole('dialog')).findByText('reset-pass-456')).toBeInTheDocument()
  })

  test('编辑角色分配', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('admin')

    const row = screen.getByText('staff').closest('tr')!
    await user.click(within(row as HTMLElement).getByRole('button', { name: '编辑' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByLabelText('角色'))
    await user.click(await screen.findByRole('option', { name: '管理员' }))
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const patch = calls.find((call) => call.method === 'PATCH' && call.url === 'http://127.0.0.1:3000/api/v1/admin/accounts/2')
      expect(patch?.body).toMatchObject({ role: 'admin' })
    })
  })

  test('当前登录账号不能停用', async () => {
    renderPage()
    await screen.findByText('admin')
    const row = screen.getByText('admin').closest('tr')!
    expect(within(row as HTMLElement).getByRole('button', { name: '停用' })).toBeDisabled()
  })
})
