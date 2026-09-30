import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * 第三轮验收补充：
 * - 登录成功后回跳来源页（只允许站内 pages 路径，防开放重定向）
 * - 编译产物不得出现 vue-router（uni-app 页面跳转必须用 uni.* API）
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
    expect(resolveRedirect('https://evil.example.com')).toBe('/pages/profile/profile')
    expect(resolveRedirect('//evil.example.com')).toBe('/pages/profile/profile')
    expect(resolveRedirect('/member')).toBe('/pages/profile/profile')
  })
})

describe('登录页不使用 vue-router', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/pages/login/login.vue'),
    'utf-8',
  )

  test('源码不 import vue-router 的 API', () => {
    expect(source).not.toMatch(/from ['"]vue-router['"]/)
    expect(source).not.toMatch(/useRouter\(\)/)
    expect(source).not.toMatch(/useRoute\(\)/)
    expect(source).not.toMatch(/router\.replace\(/)
  })

  test('跳转使用 uni API 并在 onLoad 中读取 redirect', () => {
    expect(source).toMatch(/uni\.redirectTo\(/)
    expect(source).toMatch(/onLoad\(/)
    expect(source).toMatch(/redirect/)
  })
})
