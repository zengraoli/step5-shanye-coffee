/** API 客户端：对接 server（Fastify）统一响应格式 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:3000'

const TOKEN_KEY = 'shanye_admin_token'
const PROFILE_KEY = 'shanye_admin_profile'

export interface AdminProfile {
  id: number
  username: string
  role: 'admin' | 'staff'
  storeId: number | null
  nickname: string
}

export interface ApiOk<T> {
  code: 0
  data: T
  message: 'ok'
}

export interface ApiErr {
  code: number
  data: null
  message: string
}

/** 业务错误：携带服务端返回的中文原因 */
export class ApiError extends Error {
  readonly code: number
  readonly status: number

  constructor(status: number, body: ApiErr) {
    super(body.message || '请求失败')
    this.name = 'ApiError'
    this.code = body.code
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getProfile(): AdminProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as AdminProfile
  } catch {
    return null
  }
}

export function setSession(token: string, profile: AdminProfile): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PROFILE_KEY)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
}

/** 发起请求并解包统一响应；业务错误抛出 ApiError */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = options.token === undefined ? getToken() : options.token
  if (token) {
    headers.authorization = `Bearer ${token}`
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, { code: 10998, data: null, message: '网络异常，请检查服务是否启动' })
  }
  let payload: ApiOk<T> | ApiErr
  try {
    payload = (await response.json()) as ApiOk<T> | ApiErr
  } catch {
    throw new ApiError(response.status, {
      code: 10999,
      data: null,
      message: `服务响应异常（HTTP ${response.status}）`,
    })
  }
  if (payload.code !== 0) {
    throw new ApiError(response.status, payload as ApiErr)
  }
  return (payload as ApiOk<T>).data
}

export const apiBaseUrl = BASE_URL
