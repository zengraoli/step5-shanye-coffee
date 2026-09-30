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

/** 第三轮验收：登录态失效要集中清理并发登录引导，不能只显示一行红字 */
describe('登录态失效（401 / 业务码 10002）', () => {
  const setupUnauthorized = async (statusCode: number, code: number) => {
    requestMock.mockClear()
    const reLaunch = vi.fn()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => store.get(key) ?? '',
      setStorageSync: (key: string, value: string) => {
        store.set(key, value)
      },
      removeStorageSync: (key: string) => {
        store.delete(key)
      },
      request: (options: UniApp.RequestOptions) => {
        options.success?.({
          data: { code, data: null, message: '未登录或登录已过期' },
          statusCode,
        } as UniApp.RequestSuccessCallbackResult)
      },
      reLaunch,
      getCurrentPages: () => [{ route: 'pages/orders/orders', options: { id: '3' } }],
    })
    const mod = await import('./client')
    return { mod, reLaunch }
  }

  beforeEach(() => {
    store.clear()
  })

  test('HTTP 401 时清理会话并引导重新登录（带来源页）', async () => {
    const { mod, reLaunch } = await setupUnauthorized(401, 10002)
    vi.resetModules()
    mod.setSession('expired-token', {
      id: 1,
      phone: '13812345678',
      maskedPhone: '138****5678',
      nickname: '咖啡友5678',
      points: 0,
      level: 'silver',
      levelText: '银卡',
      createdAt: '2026-09-26T02:00:00.000Z',
    })
    await expect(mod.apiFetch('/api/v1/orders')).rejects.toThrow('未登录或登录已过期')
    expect(mod.getToken()).toBe('')
    expect(reLaunch).toHaveBeenCalledWith({
      url: '/pages/login/login?redirect=%2Fpages%2Forders%2Forders%3Fid%3D3',
    })
  })

  test('业务码 10002 同样触发登录引导', async () => {
    vi.resetModules()
    const { mod, reLaunch } = await setupUnauthorized(200, 10002)
    await expect(mod.apiFetch('/api/v1/members/me')).rejects.toThrow('未登录或登录已过期')
    expect(reLaunch).toHaveBeenCalledTimes(1)
  })

  test('并发请求只跳转一次登录页', async () => {
    vi.resetModules()
    const { mod, reLaunch } = await setupUnauthorized(401, 10002)
    await Promise.allSettled([
      mod.apiFetch('/api/v1/orders'),
      mod.apiFetch('/api/v1/members/me'),
      mod.apiFetch('/api/v1/members/me/coupons'),
    ])
    expect(reLaunch).toHaveBeenCalledTimes(1)
  })

  test('网络异常不会误跳登录页', async () => {
    const reLaunch = vi.fn()
    requestMock.mockClear()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => store.get(key) ?? '',
      setStorageSync: (key: string, value: string) => {
        store.set(key, value)
      },
      removeStorageSync: (key: string) => {
        store.delete(key)
      },
      request: (options: UniApp.RequestOptions) => {
        options.fail?.({ errMsg: 'request:fail' })
      },
      reLaunch,
      getCurrentPages: () => [{ route: 'pages/index/index', options: {} }],
    })
    const mod = await import('./client')
    await expect(mod.apiFetch('/api/v1/stores')).rejects.toThrow('网络异常，请检查服务是否启动')
    expect(reLaunch).not.toHaveBeenCalled()
  })
})
