/** API 客户端：基于 uni.request，兼容 H5 与 mp-weixin */

import { API_BASE_URL, STORAGE_KEYS } from '@/config'

export interface MemberProfile {
  id: number
  phone: string
  maskedPhone: string
  nickname: string
  points: number
  level: 'silver' | 'gold' | 'black'
  levelText: string
  nextLevel: string | null
  nextLevelText: string | null
  pointsToNextLevel: number
  createdAt: string
}

interface ApiOk<T> {
  code: 0
  data: T
  message: 'ok'
}

interface ApiErr {
  code: number
  data: null
  message: string
}

/** 业务错误：携带服务端返回的中文原因 */
export class ApiError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message || '请求失败')
    this.name = 'ApiError'
    this.code = code
  }
}

export function getToken(): string {
  return uni.getStorageSync(STORAGE_KEYS.token) ?? ''
}

export function getStoredProfile(): MemberProfile | null {
  const raw = uni.getStorageSync(STORAGE_KEYS.profile)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as MemberProfile
  } catch {
    return null
  }
}

export function setSession(token: string, profile: MemberProfile): void {
  uni.setStorageSync(STORAGE_KEYS.token, token)
  uni.setStorageSync(STORAGE_KEYS.profile, JSON.stringify(profile))
}

export function clearSession(): void {
  uni.removeStorageSync(STORAGE_KEYS.token)
  uni.removeStorageSync(STORAGE_KEYS.profile)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  data?: unknown
  token?: string | null
}

/** 发起请求并解包统一响应；业务错误抛出 ApiError */
export function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token === undefined ? getToken() : options.token
  const header: Record<string, string> = { 'content-type': 'application/json' }
  if (token) {
    header.authorization = `Bearer ${token}`
  }
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      // uni.request 的 method 类型不含全部动词，小程序端仅使用 GET / POST / PUT
      method: (options.method ?? 'GET') as UniApp.RequestOptions['method'],
      data: (options.data ?? {}) as Record<string, unknown>,
      header,
      success: (response) => {
        const payload = response.data as ApiOk<T> | ApiErr | undefined
        if (!payload || typeof payload !== 'object') {
          reject(new ApiError(10999, `服务响应异常（HTTP ${response.statusCode}）`))
          return
        }
        if (payload.code !== 0) {
          reject(new ApiError(payload.code, (payload as ApiErr).message))
          return
        }
        resolve((payload as ApiOk<T>).data)
      },
      fail: () => {
        reject(new ApiError(10998, '网络异常，请检查服务是否启动'))
      },
    })
  })
}
