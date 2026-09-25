import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from '@/App'
import { clearStorage, mockApi, seedSession, STAFF_PROFILE } from '@/test/mockApi'

beforeEach(() => {
  clearStorage()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** 渲染整个应用（含路由与登录态） */
function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('登录流程', () => {
  test('未登录访问受保护页面跳转登录页', async () => {
    mockApi()
    renderApp('/orders')
    expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument()
    expect(screen.getByText('登录后台')).toBeInTheDocument()
  })

  test('账号密码错误时展示中文错误', async () => {
    mockApi({ loginOk: false })
    renderApp('/login')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('账号'), 'admin')
    await user.type(screen.getByLabelText('密码'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('账号或密码错误')
  })

  test('登录成功后进入看板并写入会话', async () => {
    const fetchMock = mockApi({ loginOk: true })
    renderApp('/login')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('账号'), 'admin')
    await user.type(screen.getByLabelText('密码'), 'mock-pass')
    await user.click(screen.getByRole('button', { name: '登录' }))

    // 登录成功后跳到 /dashboard，渲染布局与占位页
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('数据看板')
    expect(localStorage.getItem('shanye_admin_token')).toBe('mock-token')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  test('登录页携带来源地址，登录后跳回原页面', async () => {
    mockApi({ loginOk: true })
    renderApp('/products')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('账号'), 'admin')
    await user.type(screen.getByLabelText('密码'), 'mock-pass')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('商品管理')
  })

  test('已登录直接访问时校验 token 并进入页面', async () => {
    seedSession()
    mockApi()
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('数据看板')
  })

  test('退出登录后回到登录页', async () => {
    seedSession()
    mockApi()
    renderApp('/dashboard')
    const user = userEvent.setup()
    await user.click(await screen.findByText('系统管理员'))
    await user.click(await screen.findByText('退出登录'))
    expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument()
    expect(localStorage.getItem('shanye_admin_token')).toBeNull()
  })
})

describe('角色路由拦截', () => {
  test('店员访问会员管理被拦截并展示无权限页面', async () => {
    seedSession(STAFF_PROFILE)
    mockApi({ profile: STAFF_PROFILE })
    renderApp('/members')
    expect(await screen.findByText('没有访问权限')).toBeInTheDocument()
    expect(screen.queryByText('会员管理')).not.toBeInTheDocument()
  })

  test('店员可以访问订单管理', async () => {
    seedSession(STAFF_PROFILE)
    mockApi({ profile: STAFF_PROFILE })
    renderApp('/orders')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('订单管理')
  })
})
