import { beforeEach, describe, expect, test, vi } from 'vitest'
import { API_BASE_URL } from '@/config'

/** 在 jsdom 中模拟 uni 存储与请求 */
const store = new Map<string, string>()

const requestMock = vi.fn((options: UniApp.RequestOptions) => {
  const respond = (data: unknown, statusCode = 200) => {
    options.success?.({ data, statusCode } as UniApp.RequestSuccessCallbackResult)
  }
  const url = String(options.url)
  if (url.endsWith('/api/v1/products/1')) {
    respond({ code: 0, data: { id: 1, name: '山野拿铁' }, message: 'ok' })
    return
  }
  if (url.endsWith('/api/v1/stores')) {
    respond({ code: 20002, data: null, message: '门店休息中，暂无法下单' })
    return
  }
  respond({ code: 10999, data: null, message: '服务响应异常' }, 500)
})

beforeEach(() => {
  store.clear()
  requestMock.mockClear()
  vi.stubGlobal('uni', {
    getStorageSync: (key: string) => store.get(key) ?? '',
    setStorageSync: (key: string, value: string) => {
      store.set(key, value)
    },
    removeStorageSync: (key: string) => {
      store.delete(key)
    },
    request: requestMock,
  })
})

describe('apiFetch', () => {
  test('接口基地址默认 127.0.0.1:3000', () => {
    expect(API_BASE_URL).toBe('http://127.0.0.1:3000')
  })

  test('解包统一响应并返回 data', async () => {
    const { apiFetch } = await import('./client')
    const result = await apiFetch<{ id: number; name: string }>('/api/v1/products/1')
    expect(result).toEqual({ id: 1, name: '山野拿铁' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://127.0.0.1:3000/api/v1/products/1', method: 'GET' }),
    )
  })

  test('业务错误抛出 ApiError（中文 message 与错误码）', async () => {
    const { apiFetch, ApiError } = await import('./client')
    await expect(apiFetch('/api/v1/stores')).rejects.toThrow(ApiError)
    await expect(apiFetch('/api/v1/stores')).rejects.toThrow('门店休息中，暂无法下单')
  })

  test('自动附带会员 token，并可读写会话', async () => {
    const { apiFetch, getToken, setSession, clearSession } = await import('./client')
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
    await apiFetch('/api/v1/products/1')
    const init = requestMock.mock.calls.at(-1)?.[0]
    expect((init?.header as Record<string, string>).authorization).toBe('Bearer member-token-abc')
    clearSession()
    expect(getToken()).toBe('')
  })

  test('网络失败给出中文提示', async () => {
    const { apiFetch } = await import('./client')
    requestMock.mockImplementationOnce((options: UniApp.RequestOptions) => {
      options.fail?.(new Error('network') as unknown as UniApp.GeneralCallbackResult)
    })
    await expect(apiFetch('/api/v1/stores')).rejects.toThrow('网络异常，请检查服务是否启动')
  })
})
