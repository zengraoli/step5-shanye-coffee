import { Construction } from 'lucide-react'
import { NAV_ITEMS } from '@/routes/nav'
import { Card, CardContent } from '@/components/ui/card'

/** 骨架阶段的占位页面（T11–T15 会逐个替换为真实页面） */
export function PlaceholderPage() {
  const path = window.location.pathname
  const item = NAV_ITEMS.find((nav) => path === nav.to || path.startsWith(`${nav.to}/`))
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Construction className="size-10 text-caramel" />
        <div>
          <p className="text-lg font-semibold">{item?.label ?? '页面'}即将上线</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {item?.description ?? '该页面正在建设中'}，将在后续任务中实现。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
