import { ShieldAlert } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { canAccessPath } from '@/routes/nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BrandLogo } from '@/components/app/BrandLogo'

/** 全屏加载态（校验 token 期间） */
export function FullscreenLoader({ text = '加载中' }: { text?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <BrandLogo className="size-12 animate-pulse text-brand" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

/** 无权限页面 */
export function NoPermissionPage() {
  return (
    <Card className="mx-auto mt-16 max-w-md border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <ShieldAlert className="size-12 text-caramel" />
        <div>
          <p className="text-lg font-semibold">没有访问权限</p>
          <p className="mt-1 text-sm text-muted-foreground">
            当前角色无法访问该页面，请联系管理员分配权限。
          </p>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
          返回上一页
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * 路由守卫：未登录跳转登录页（携带来源地址），
 * 已登录但角色无权访问时展示 403 页面。
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, profile } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <FullscreenLoader text="正在校验登录状态" />
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  if (profile && !canAccessPath(profile.role, location.pathname)) {
    return <NoPermissionPage />
  }
  return <>{children}</>
}
