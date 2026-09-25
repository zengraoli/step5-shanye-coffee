import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  apiFetch,
  clearSession,
  getToken,
  setSession,
} from './client'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
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
    setSession('member-token-abc', {
      id: 1,
      phone: '13812345678',
      maskedPhone: '138****5678',
      nickname: '咖啡友5678',
      points: 0,
      level: 'silver',
      levelText: '银卡',
      nextLevel: 'gold',
      nextLevelText: '金卡',
      pointsToNextLevel: 500,
      createdAt: '2026-09-26T02:00:00.000Z',
    })
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
