import { AlertCircle, RefreshCw, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchDashboard, type DashboardData } from '@/api/dashboard'
import { ApiError } from '@/api/client'
import { formatBeijingTime, formatMoney } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const trendConfig: ChartConfig = {
  revenue: { label: '营业额', color: 'var(--brand)' },
  orders: { label: '订单量', color: 'var(--caramel)' },
}

const topConfig: ChartConfig = {
  quantity: { label: '销量', color: 'var(--brand)' },
}

/** 数据看板 */
export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchDashboard())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16">
          <AlertCircle className="size-9 text-destructive" />
          <p className="text-sm text-muted-foreground">{error || '暂无数据'}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            重新加载
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { today, trend, topProducts, latestOrders } = data
  const trendData = trend.map((point) => ({
    ...point,
    label: point.date.slice(5).replace('-', '/'),
  }))
  const maxQuantity = Math.max(1, ...topProducts.map((item) => item.quantity))

  return (
    <div className="space-y-6">
      {/* 今日概览 */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="今日营业额"
          value={formatMoney(today.revenueFen)}
          hint={`${today.date}（北京时间）`}
          highlight
        />
        <StatCard title="今日订单量" value={`${today.orderCount} 单`} hint="已支付订单（不含取消）" />
        <StatCard title="客单价" value={formatMoney(today.avgOrderFen)} hint="营业额 / 订单量" />
        <StatCard title="新增会员" value={`${today.newMembers} 人`} hint="今日注册会员" />
      </section>

      {/* 近 7 天趋势 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-caramel" />
            近 7 天营业额趋势
          </CardTitle>
          <CardDescription>按北京时间统计已支付订单实付金额</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-64 w-full">
            <AreaChart data={trendData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                fontSize={12}
                tickFormatter={(value: number) => `¥${(value / 100).toFixed(0)}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const numeric = Number(value)
                      if (name === '营业额') {
                        return [formatMoney(numeric), name]
                      }
                      return [`${numeric} 单`, name]
                    }}
                  />
                }
              />
              <Area
                dataKey="revenueFen"
                name="营业额"
                type="monotone"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                fill="url(#fillRevenue)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* 热销 Top10 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">热销 Top10</CardTitle>
            <CardDescription>按销售数量统计（不含取消订单）</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">暂无销售数据</p>
            ) : (
              <ChartContainer config={topConfig} className="h-72 w-full">
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} hide />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    fontSize={12}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [`${Number(value)} 件`, name]}
                      />
                    }
                  />
                  <Bar dataKey="quantity" name="销量" radius={[0, 4, 4, 0]}>
                    {topProducts.map((item) => (
                      <Cell
                        key={item.productId}
                        fill="var(--brand)"
                        fillOpacity={0.45 + 0.55 * (item.quantity / maxQuantity)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 最新订单 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最新订单</CardTitle>
            <CardDescription>最近 10 笔订单</CardDescription>
          </CardHeader>
          <CardContent>
            {latestOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">暂无订单</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>门店</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">实付</TableHead>
                    <TableHead className="text-right">下单时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                      <TableCell className="text-xs">{order.storeName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {order.statusText}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(order.payFen)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatBeijingTime(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  hint,
  highlight = false,
}: {
  title: string
  value: string
  hint: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-brand/30 bg-brand-muted/40' : undefined}>
      <CardHeader className="gap-1 pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={`text-2xl tabular-nums ${highlight ? 'text-brand' : ''}`}>{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
