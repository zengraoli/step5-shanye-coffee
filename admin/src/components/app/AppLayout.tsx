import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { UserMenu } from './UserMenu'
import { NAV_ITEMS, navItemsForRole } from '@/routes/nav'
import { useRole } from '@/auth/AuthContext'
import { apiBaseUrl } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

/** 后台基础布局：侧边栏 + 顶栏 + 内容区 */
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const role = useRole()
  const items = role ? navItemsForRole(role) : NAV_ITEMS
  const current = items.find((item) => location.pathname.startsWith(item.to))

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <BrandLogo className="size-9 text-sidebar-primary" />
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-wide">山野咖啡</p>
          <p className="text-xs text-sidebar-foreground/70">门店管理后台</p>
        </div>
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80',
              )
            }
          >
            <item.icon className="size-4.5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <Separator className="bg-sidebar-border" />
      <div className="px-5 py-4 text-xs text-sidebar-foreground/60">
        <p>山野咖啡 · 点单平台</p>
        <p className="mt-1">API：{apiBaseUrl}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* 桌面侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{sidebar}</aside>

      {/* 移动端抽屉 */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-60 shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 -right-11 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="关闭菜单"
            >
              <X className="size-5" />
            </Button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="打开菜单"
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{current?.label ?? '后台管理'}</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {current?.description ?? '山野咖啡门店点单平台'}
            </p>
          </div>
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-[1400px] p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
