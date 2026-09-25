import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { AppLayout } from './AppLayout'

function renderLayout(role: 'admin' | 'staff' | undefined, path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppLayout role={role} />
    </MemoryRouter>,
  )
}

function sidebarLabels(): string[] {
  const nav = screen.getByRole('navigation')
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

describe('AppLayout', () => {
  test('管理员渲染全部导航', () => {
    renderLayout('admin')
    expect(sidebarLabels()).toEqual([
      '数据看板',
      '订单管理',
      '商品管理',
      '门店管理',
      '会员管理',
      '优惠券管理',
      '账号与角色',
    ])
    expect(screen.getByText('山野咖啡')).toBeInTheDocument()
    expect(screen.getByText('门店管理后台')).toBeInTheDocument()
  })

  test('店员只渲染有权限的导航', () => {
    renderLayout('staff')
    expect(sidebarLabels()).toEqual(['数据看板', '订单管理', '商品管理'])
  })

  test('顶栏标题随路由变化', () => {
    renderLayout('admin', '/products')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('商品管理')
  })

  test('顶栏展示当前页面描述', () => {
    renderLayout('admin', '/orders')
    expect(screen.getByText('处理订单与推进取餐状态')).toBeInTheDocument()
  })
})
