import { describe, expect, test } from 'vitest'
import { canAccessPath, navItemsForRole, NAV_ITEMS } from './nav'

describe('导航权限', () => {
  test('管理员看到全部菜单（含活动管理）', () => {
    expect(navItemsForRole('admin')).toHaveLength(NAV_ITEMS.length)
    expect(navItemsForRole('admin')).toHaveLength(8)
    expect(navItemsForRole('admin').map((item) => item.to)).toContain('/promo')
  })

  test('店员只看板、订单、商品三个菜单', () => {
    const items = navItemsForRole('staff')
    expect(items.map((item) => item.to)).toEqual(['/dashboard', '/orders', '/products'])
  })

  test('未登录时没有菜单', () => {
    expect(navItemsForRole(undefined)).toEqual([])
  })

  test('路径访问控制', () => {
    expect(canAccessPath('admin', '/members')).toBe(true)
    expect(canAccessPath('staff', '/members')).toBe(false)
    expect(canAccessPath('staff', '/orders/123')).toBe(true)
    expect(canAccessPath('staff', '/orders/123/advance')).toBe(true)
    expect(canAccessPath('admin', '/unknown-page')).toBe(true)
    expect(canAccessPath(undefined, '/dashboard')).toBe(false)
  })
})
