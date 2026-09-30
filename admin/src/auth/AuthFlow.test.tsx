import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useEffect } from 'react'
import { apiFetch } from '@/api/client'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { LoginPage } from '@/pages/LoginPage'
import { clearStorage, mockApi, seedSession } from '@/test/mockApi'

const PROFILE = {
  id: 1,
  username: 'admin',
  role: 'admin' as const,
  storeId: null,
  nickname: '系统管理员',
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify({ code: 0, data: body, message: 'ok' }), {
    headers: { 'content-type': 'application/json' },
  })
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ code: 10002, data: null, message: '未登录或登录已过期' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  })
}

/** 受保护页面：进入后请求一次业务接口（用于触发会话失效） */
function ProtectedPage() {
  useEffect(() => {
    void apiFetch('/api/v1/admin/dashboard').catch(() => undefined)
  }, [])
  return <div>后台内容</div>
}

/** 记录每次渲染时的登录态，用于断言 anonymous 转换 */
const statuses: string[] = []

function StatusProbe() {
  const { status } = useAuth()
  statuses.push(status)
  return null
}

function renderProtected(entry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <StatusProbe />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <ProtectedPage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  clearStorage()
  statuses.length = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('会话失效集中处理', () => {
  test('业务接口 401（code 10002）后 status 变 anonymous 并跳转登录页', async () => {
    seedSession()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(typeof input === 'string' ? input : (input as Request).url)
        // 登录态校验通过，业务接口返回 10002 / 401
        return url.includes('/api/v1/admin/auth/me') ? ok(PROFILE) : unauthorized()
      }),
    )

    renderProtected()

    // 401 → 清理本地会话 → status 变 anonymous → RequireAuth 重定向到 /login
    expect(await screen.findByText('登录后台')).toBeInTheDocument()
    expect(screen.queryByText('后台内容')).not.toBeInTheDocument()
    expect(statuses).toContain('authenticated')
    expect(statuses).toContain('anonymous')
    expect(localStorage.getItem('shanye_admin_token')).toBeNull()
    expect(localStorage.getItem('shanye_admin_profile')).toBeNull()
  })

  test('会话失效后重新进入（刷新 / 后退）也被拦在登录页', async () => {
    seedSession()
    let tokenAccepted = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(typeof input === 'string' ? input : (input as Request).url)
        if (url.includes('/api/v1/admin/auth/me')) {
          return tokenAccepted ? ok(PROFILE) : unauthorized()
        }
        return tokenAccepted ? ok(null) : unauthorized()
      }),
    )

    const first = renderProtected()
    expect(await screen.findByText('后台内容')).toBeInTheDocument()
    first.unmount()

    // 服务端已不认这个 token（模拟过期后刷新 / 浏览器后退）
    tokenAccepted = false
    renderProtected()
    expect(await screen.findByText('登录后台')).toBeInTheDocument()
    expect(screen.queryByText('后台内容')).not.toBeInTheDocument()
    expect(statuses).toContain('anonymous')
  })

  test('未登录访问受保护页面跳转登录页（携带来源地址）', async () => {
    mockApi()
    renderProtected()
    expect(await screen.findByText('登录后台')).toBeInTheDocument()
    expect(screen.queryByText('后台内容')).not.toBeInTheDocument()
  })
})
