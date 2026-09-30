import { Compass, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/** 404 兜底页：未知路由 */
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Card className="mx-auto mt-16 max-w-md border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <Compass className="size-12 text-caramel" />
        <div>
          <p className="text-2xl font-semibold">404</p>
          <p className="mt-1 text-lg font-semibold">页面不存在</p>
          <p className="mt-1 text-sm text-muted-foreground">
            你访问的地址不存在或已被移动，请从侧边栏重新进入。
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard', { replace: true })}>
          <Home className="size-4" />
          返回看板
        </Button>
      </CardContent>
    </Card>
  )
}
