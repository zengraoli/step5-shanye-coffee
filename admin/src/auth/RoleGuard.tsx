import type { ReactNode } from 'react'
import { useRole } from '@/auth/AuthContext'
import type { AdminRole } from '@/routes/nav'

interface RoleGuardProps {
  /** 允许操作的角色 */
  roles: AdminRole[]
  children: ReactNode
  /** 无权限时的替代内容，默认不渲染 */
  fallback?: ReactNode
}

/**
 * 按钮级权限：仅指定角色可见。
 * 注意：按钮隐藏只是体验优化，服务端仍会做角色校验。
 */
export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const role = useRole()
  if (!role || !roles.includes(role)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
