import { Coffee, Loader2, Lock, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { ApiError } from '@/api/client'
import { BrandLogo } from '@/components/app/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** 后台登录页 */
export function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (username.trim().length === 0 || password.length === 0) {
      setError('请输入账号和密码')
      return
    }
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* 品牌视觉区（自绘 SVG 插画） */}
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 opacity-25">
          <svg viewBox="0 0 600 800" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M0 620 L140 380 L260 520 L380 300 L520 560 L600 470 L600 800 L0 800 Z" fill="currentColor" className="text-sidebar-primary" fillOpacity="0.35" />
            <path d="M0 700 L180 500 L320 640 L470 430 L600 640 L600 800 L0 800 Z" fill="currentColor" className="text-sidebar-primary" fillOpacity="0.55" />
            <circle cx="470" cy="180" r="70" className="text-sidebar-primary" fillOpacity="0.5" fill="currentColor" />
          </svg>
        </div>
        <div className="relative flex h-full flex-col justify-between p-12 text-sidebar-foreground">
          <div className="flex items-center gap-3">
            <BrandLogo className="size-11 text-sidebar-primary" />
            <div>
              <p className="text-lg font-semibold">山野咖啡</p>
              <p className="text-sm text-sidebar-foreground/70">门店点单平台</p>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="text-3xl leading-snug font-bold">
              山野之间，
              <br />
              一杯好咖啡。
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/75">
              管理门店商品、订单与会员，查看经营数据。所有数据实时来自点单平台 API。
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm text-sidebar-foreground/60">
              <Coffee className="size-4" />
              <span>云南SOE · 现烘焙 · 每日鲜制</span>
            </div>
          </div>
          <p className="text-xs text-sidebar-foreground/50">© 2026 山野咖啡（虚构品牌，示例数据）</p>
        </div>
      </div>

      {/* 登录表单区 */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 lg:hidden">
              <BrandLogo className="size-9 text-brand" />
              <span className="text-base font-semibold">山野咖啡 · 后台</span>
            </div>
            <div>
              <CardTitle className="text-xl">登录后台</CardTitle>
              <CardDescription>请输入管理员或店员账号</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
              <div className="space-y-2">
                <Label htmlFor="username">账号</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    className="pl-9"
                    placeholder="请输入账号"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="pl-9"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
              {error ? (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting || status === 'loading'}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitting ? '登录中' : '登录'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                演示环境账号密码由服务端种子数据生成，详见 server/README.md
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
