import { beforeEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

const authState = reactive<{ profile: { id: number } | null; ready: boolean }>({
  profile: null,
  ready: true,
})

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    state: authState,
    isLoggedIn: () => authState.profile !== null,
    login: vi.fn(),
    logout: () => {
      authState.profile = null
    },
    refresh: vi.fn(),
  }),
}))

const { router } = await import('./index')

beforeEach(async () => {
  authState.profile = null
  await router.push('/')
  await router.isReady()
})

describe('路由守卫', () => {
  test('公开页面无需登录', async () => {
    await router.push('/menu')
    expect(router.currentRoute.value.name).toBe('menu')
    await router.push('/stores')
    expect(router.currentRoute.value.name).toBe('stores')
  })

  test('未登录访问会员中心跳转登录页并携带 redirect', async () => {
    await router.push('/member')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('member-login')
    expect(router.currentRoute.value.query.redirect).toBe('/member')
  })

  test('登录后可以访问会员中心', async () => {
    authState.profile = { id: 1 }
    await router.push('/member')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('member')
  })

  test('未知路径展示 404 页', async () => {
    await router.push('/no-such-page')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})
