import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { AppLayout } from './AppLayout'
import { ADMIN_PROFILE, clearStorage, mockApi, seedSession, STAFF_PROFILE } from '@/test/mockApi'

beforeEach(() => {
  clearStorage()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderLayout(profile = ADMIN_PROFILE, path = '/dashboard') {
  seedSession(profile)
  mockApi({ profile })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function sidebarLabels(): string[] {
  const nav = screen.getByRole('navigation')
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

describe('AppLayout 角色菜单', () => {
  test('管理员渲染全部导航', async () => {
    renderLayout()
    expect(await screen.findByText('门店管理后台')).toBeInTheDocument()
    expect(sidebarLabels()).toEqual([
      '数据看板',
      '订单管理',
      '商品管理',
      '门店管理',
      '会员管理',
      '优惠券管理',
      '账号与角色',
      '活动管理',
    ])
  })

  test('店员只渲染有权限的导航', async () => {
    renderLayout(STAFF_PROFILE)
    expect(await screen.findByText('门店管理后台')).toBeInTheDocument()
    expect(sidebarLabels()).toEqual(['数据看板', '订单管理', '商品管理'])
  })

  test('顶栏标题随路由变化', async () => {
    renderLayout(ADMIN_PROFILE, '/products')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('商品管理')
  })
})
