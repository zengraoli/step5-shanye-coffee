import { describe, expect, test } from 'vitest'

// 用源码原文做守卫断言（Vite / Vitest 支持 ?raw 导入，避免 node 类型依赖）
import loginSource from './login.vue?raw'

/**
 * 第三轮验收补充：
 * - 登录成功后回跳来源页（只允许站内 pages 路径，防开放重定向）
 * - 登录页不得使用 vue-router（uni-app 页面跳转必须用 uni.* API，否则编译产物会引用不存在的依赖）
 */
describe('登录回跳来源页', () => {
  /** 与 login.vue 的 onLoad 逻辑保持一致：只接受站内 pages 路径 */
  function resolveRedirect(input: unknown): string {
    return typeof input === 'string' && input.startsWith('/pages/')
      ? input
      : '/pages/profile/profile'
  }

  test('站内来源页可回跳', () => {
    expect(resolveRedirect('/pages/orders/orders')).toBe('/pages/orders/orders')
    expect(resolveRedirect('/pages/checkout/checkout')).toBe('/pages/checkout/checkout')
  })

  test('缺少来源页时回到“我的”', () => {
    expect(resolveRedirect(undefined)).toBe('/pages/profile/profile')
    expect(resolveRedirect('')).toBe('/pages/profile/profile')
    expect(resolveRedirect(123)).toBe('/pages/profile/profile')
  })

  test('外部地址被忽略（防开放重定向）', () => {
    expect(resolveRedirect('https://example.invalid')).toBe('/pages/profile/profile')
    expect(resolveRedirect('//example.invalid')).toBe('/pages/profile/profile')
    expect(resolveRedirect('/member')).toBe('/pages/profile/profile')
  })
})

describe('登录页不使用 vue-router', () => {
  test('源码不 import vue-router 的 API', () => {
    expect(loginSource).not.toMatch(/from ['"]vue-router['"]/)
    expect(loginSource).not.toMatch(/useRouter\(\)/)
    expect(loginSource).not.toMatch(/useRoute\(\)/)
    expect(loginSource).not.toMatch(/router\.replace\(/)
  })

  test('跳转使用 uni API 并在 onLoad 中读取 redirect', () => {
    expect(loginSource).toMatch(/uni\.redirectTo\(/)
    expect(loginSource).toMatch(/onLoad\(/)
    expect(loginSource).toMatch(/redirect/)
  })
})
