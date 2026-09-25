import { vi } from 'vitest'
import type { AdminProfile } from '@/api/client'

export const ADMIN_PROFILE: AdminProfile = {
  id: 1,
  username: 'admin',
  role: 'admin',
  storeId: null,
  nickname: '系统管理员',
}

export const STAFF_PROFILE: AdminProfile = {
  id: 2,
  username: 'staff',
  role: 'staff',
  storeId: 1,
  nickname: '门店店员',
}

interface MockOptions {
  profile?: AdminProfile
  /** 登录接口是否成功 */
  loginOk?: boolean
  /** 登录返回的错误码 */
  loginErrorCode?: number
  loginErrorMessage?: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** 模拟 server API：登录、当前账号、登出 */
export function mockApi(options: MockOptions = {}) {
  const profile = options.profile ?? ADMIN_PROFILE
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(typeof input === 'string' ? input : (input as Request).url)
    if (url.includes('/api/v1/admin/auth/login')) {
      if (options.loginOk === false) {
        return json(
          { code: options.loginErrorCode ?? 10006, data: null, message: options.loginErrorMessage ?? '账号或密码错误' },
          401,
        )
      }
      return json({ code: 0, data: { token: 'mock-token', admin: profile }, message: 'ok' })
    }
    if (url.includes('/api/v1/admin/auth/me')) {
      return json({ code: 0, data: profile, message: 'ok' })
    }
    if (url.includes('/api/v1/admin/auth/logout')) {
      return json({ code: 0, data: { loggedOut: true }, message: 'ok' })
    }
    return json({ code: 0, data: null, message: 'ok' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** 写入本地会话（模拟已登录） */
export function seedSession(profile: AdminProfile = ADMIN_PROFILE): void {
  localStorage.setItem('shanye_admin_token', 'seeded-token')
  localStorage.setItem('shanye_admin_profile', JSON.stringify(profile))
}

export function clearStorage(): void {
  localStorage.clear()
}
