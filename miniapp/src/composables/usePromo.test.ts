import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'

const store = new Map<string, string>()
const requestMock = vi.fn((options: UniApp.RequestOptions) => {
  const url = String(options.url)
  const respond = (data: unknown) => {
    options.success?.({ data, statusCode: 200 } as UniApp.RequestSuccessCallbackResult)
  }
  if (url.endsWith('/api/v1/promo')) {
    respond({
      code: 0,
      data: {
        active: true,
        activity: {
          id: 1,
          name: '第二杯半价',
          type: 'second_half',
          status: 'active',
          startAt: '2026-09-01T00:00:00.000Z',
          endAt: '2026-12-31T23:59:59.000Z',
          productIds: [1, 2, 3],
        },
      },
      message: 'ok',
    })
    return
  }
  respond({ code: 0, data: null, message: 'ok' })
})

beforeEach(() => {
  store.clear()
  requestMock.mockClear()
  vi.resetModules()
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePromo', () => {
  test('加载后正确判断商品是否参与活动', async () => {
    const { usePromo } = await import('./usePromo')
    const { activity, isPromoProduct, load } = usePromo()
    expect(activity.value).toBeNull()
    await load()
    expect(activity.value?.name).toBe('第二杯半价')
    expect(activity.value?.productIds).toEqual([1, 2, 3])
    expect(isPromoProduct(1)).toBe(true)
    expect(isPromoProduct(3)).toBe(true)
    expect(isPromoProduct(13)).toBe(false)
  })

  test('重复加载不会重复请求', async () => {
    const { usePromo } = await import('./usePromo')
    const { load } = usePromo()
    await load()
    await load()
    expect(requestMock).toHaveBeenCalledTimes(1)
  })

  test('接口失败时静默降级为无活动', async () => {
    requestMock.mockImplementationOnce((options: UniApp.RequestOptions) => {
      options.fail?.(new Error('network') as unknown as UniApp.GeneralCallbackResult)
    })
    const { usePromo } = await import('./usePromo')
    const { activity, load } = usePromo()
    await load()
    expect(activity.value).toBeNull()
  })
})
