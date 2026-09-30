import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  apiFetch,
  clearSession,
  getToken,
  setSession,
  setUnauthorizedHandler,
  UNAUTHORIZED_CODE,
} from './client'

const PROFILE = {
  id: 1,
  phone: '13812345678',
  maskedPhone: '138****5678',
  nickname: '咖啡友5678',
  points: 0,
  level: 'silver' as const,
  levelText: '银卡',
  nextLevel: 'gold',
  nextLevelText: '金卡',
  pointsToNextLevel: 500,
  createdAt: '2026-09-26T02:00:00.000Z',
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

function mockFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('apiFetch', () => {
  test('解包统一响应并返回 data', async () => {
    mockFetch({ code: 0, data: { id: 1, name: '山野拿铁' }, message: 'ok' })
    const result = await apiFetch<{ id: number; name: string }>('/api/v1/products/1')
    expect(result).toEqual({ id: 1, name: '山野拿铁' })
  })

  test('业务错误抛出 ApiError（中文 message）', async () => {
    mockFetch({ code: 30003, data: null, message: '商品已售罄' }, 400)
    await expect(apiFetch('/api/v1/products/2')).rejects.toThrow(ApiError)
    await expect(apiFetch('/api/v1/products/2')).rejects.toThrow('商品已售罄')
  })

  test('自动附带会员 token', async () => {
    const fetchMock = mockFetch({ code: 0, data: null, message: 'ok' })
    setSession('member-token-abc', PROFILE)
    expect(getToken()).toBe('member-token-abc')
    await apiFetch('/api/v1/members/me')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer member-token-abc')
    clearSession()
    expect(getToken()).toBeNull()
  })

  test('网络异常时给出中文提示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    await expect(apiFetch('/api/v1/stores')).rejects.toThrow('网络异常，请检查服务是否启动')
  })
})

describe('401 集中处理', () => {
  /** mock 一个返回 401 + code 10002 的接口 */
  function mockUnauthorized() {
    return mockFetch({ code: UNAUTHORIZED_CODE, data: null, message: '未登录或登录已过期' }, 401)
  }

  test('HTTP 401：清本地 token 并触发跳登录回调', async () => {
    setSession('member-token-abc', PROFILE)
    mockUnauthorized()
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(apiFetch('/api/v1/members/me')).rejects.toThrow('未登录或登录已过期')
    expect(getToken()).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({
      status: 401,
      code: UNAUTHORIZED_CODE,
      message: '未登录或登录已过期',
    })
  })

  test('业务码 10002（HTTP 200）同样按认证失败处理', async () => {
    setSession('member-token-abc', PROFILE)
    mockFetch({ code: UNAUTHORIZED_CODE, data: null, message: '未登录或登录已过期' }, 200)
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(apiFetch('/api/v1/members/me')).rejects.toThrow(ApiError)
    expect(getToken()).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('并发 401 只回调一次（避免连续跳登录）', async () => {
    setSession('member-token-abc', PROFILE)
    mockUnauthorized()
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    const results = await Promise.allSettled([
      apiFetch('/api/v1/members/me'),
      apiFetch('/api/v1/members/me/points'),
      apiFetch('/api/v1/members/me/coupons'),
    ])
    expect(results.every((item) => item.status === 'rejected')).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('未注册处理器时 401 不影响业务错误抛出', async () => {
    setSession('member-token-abc', PROFILE)
    mockUnauthorized()
    await expect(apiFetch('/api/v1/members/me')).rejects.toThrow('未登录或登录已过期')
    expect(getToken()).toBeNull()
  })

  test('非 401 业务错误不清会话、不触发回调', async () => {
    setSession('member-token-abc', PROFILE)
    mockFetch({ code: 30003, data: null, message: '商品已售罄' }, 400)
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(apiFetch('/api/v1/products/1')).rejects.toThrow('商品已售罄')
    expect(getToken()).toBe('member-token-abc')
    expect(handler).not.toHaveBeenCalled()
  })

  test('网络异常不清会话、不触发回调（保留登录态）', async () => {
    setSession('member-token-abc', PROFILE)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(apiFetch('/api/v1/members/me')).rejects.toThrow('网络异常，请检查服务是否启动')
    expect(getToken()).toBe('member-token-abc')
    expect(handler).not.toHaveBeenCalled()
  })
})
