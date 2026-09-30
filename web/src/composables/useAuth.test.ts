import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { setSession, type MemberProfile } from '@/api/client'

const PROFILE: MemberProfile = {
  id: 1,
  phone: '13812345678',
  maskedPhone: '138****5678',
  nickname: '咖啡友5678',
  points: 560,
  level: 'gold',
  levelText: '金卡',
  nextLevel: 'black',
  nextLevelText: '黑卡',
  pointsToNextLevel: 1440,
  createdAt: '2026-09-20T02:00:00.000Z',
}

const UNAUTHORIZED = { code: 10002, data: null, message: '未登录或登录已过期' }

function mockJson(payload: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } }),
    ),
  )
}

beforeEach(() => {
  localStorage.clear()
  // 每次重新求值模块，保证模块级登录态从当前 localStorage 初始化
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAuth.refresh', () => {
  test('token 有效时拉取最新资料并写入会话', async () => {
    setSession('token-abc', PROFILE)
    mockJson({ code: 0, data: PROFILE, message: 'ok' })
    const { useAuth } = await import('./useAuth')
    const { refresh, state } = useAuth()
    await refresh()
    expect(state.profile?.nickname).toBe('咖啡友5678')
    expect(state.ready).toBe(true)
    expect(localStorage.getItem('shanye_member_token')).toBe('token-abc')
  })

  test('认证失败（401 / code 10002）：清除登录态并抛出 auth 错误', async () => {
    setSession('token-abc', PROFILE)
    mockJson(UNAUTHORIZED, 401)
    const { useAuth } = await import('./useAuth')
    const { refresh, state } = useAuth()
    await expect(refresh()).rejects.toThrow('未登录或登录已过期')
    expect(localStorage.getItem('shanye_member_token')).toBeNull()
    expect(localStorage.getItem('shanye_member_profile')).toBeNull()
    expect(state.profile).toBeNull()
  })

  test('网络异常：保留登录态，抛出 network 错误给页面', async () => {
    setSession('token-abc', PROFILE)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const { useAuth } = await import('./useAuth')
    const { refresh, state } = useAuth()
    await expect(refresh()).rejects.toThrow('网络异常，请检查服务是否启动')
    // 服务挂掉不登出
    expect(localStorage.getItem('shanye_member_token')).toBe('token-abc')
    expect(state.profile?.nickname).toBe('咖啡友5678')
    expect(state.ready).toBe(true)
  })

  test('错误分类：auth 判定与 AuthRefreshError.kind', async () => {
    const { AuthRefreshError, isAuthFailure } = await import('./useAuth')
    const { ApiError } = await import('@/api/client')
    expect(isAuthFailure(new ApiError(401, { code: 10002, data: null, message: '未登录或登录已过期' }))).toBe(true)
    expect(isAuthFailure(new ApiError(400, { code: 30003, data: null, message: '商品已售罄' }))).toBe(false)
    const networkError = new AuthRefreshError('network', '网络异常，请检查服务是否启动')
    expect(networkError.kind).toBe('network')
    expect(isAuthFailure(networkError)).toBe(false)
  })

  test('没有本地 token 时直接置为 ready，不发请求', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { useAuth } = await import('./useAuth')
    const { refresh, state } = useAuth()
    await refresh()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(state.ready).toBe(true)
  })
})
