import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { RoleGuard } from '@/auth/RoleGuard'
import { ADMIN_PROFILE, mockApi, seedSession, STAFF_PROFILE } from '@/test/mockApi'

function renderGuard(profile = ADMIN_PROFILE) {
  seedSession(profile)
  mockApi({ profile })
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RoleGuard roles={['admin']}>
          <button>管理员操作</button>
        </RoleGuard>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** 等待登录态引导完成 */
async function flushAuth() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('RoleGuard 按钮级权限', () => {
  test('管理员可以看到受控按钮', async () => {
    renderGuard(ADMIN_PROFILE)
    expect(await screen.findByRole('button', { name: '管理员操作' })).toBeInTheDocument()
  })

  test('店员看不到受控按钮', async () => {
    renderGuard(STAFF_PROFILE)
    await flushAuth()
    expect(screen.queryByRole('button', { name: '管理员操作' })).not.toBeInTheDocument()
  })
})
