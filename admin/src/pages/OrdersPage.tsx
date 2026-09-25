import { AlertCircle, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  advanceOrder,
  fetchAdminOrder,
  fetchAdminOrders,
  NEXT_ACTION_TEXT,
  type AdminOrderDetail,
  type AdminOrderSummary,
  type OrderStatus,
} from '@/api/orders'
import { fetchStores, type Store } from '@/api/catalog'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { formatBeijingTime, formatMoney, todayBeijing } from '@/lib/format'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'pending_pay', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'making', label: '制作中' },
  { value: 'pickable', label: '待取餐' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_pay: 'outline',
  paid: 'secondary',
  making: 'default',
  pickable: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

/** 订单管理页 */
export function OrdersPage() {
  const { profile } = useAuth()
  const isStaff = profile?.role === 'staff'
  const [stores, setStores] = useState<Store[]>([])
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [storeId, setStoreId] = useState(isStaff && profile?.storeId ? String(profile.storeId) : '')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [keyword, setKeyword] = useState('')
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [advancing, setAdvancing] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchAdminOrders({
        storeId: storeId || undefined,
        status: status || undefined,
        date: date || undefined,
        keyword: keyword.trim() || undefined,
        page,
        pageSize,
      })
      setOrders(Array.isArray(result.list) ? result.list : [])
      setTotal(result.total ?? 0)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [storeId, status, date, keyword, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (isStaff) {
      return
    }
    fetchStores()
      .then(setStores)
      .catch(() => setStores([]))
  }, [isStaff])

  const openDetail = async (id: number) => {
    try {
      const result = await fetchAdminOrder(id)
      setDetail(result)
      setDetailOpen(true)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '加载订单详情失败')
    }
  }

  const advance = async (order: AdminOrderSummary) => {
    setAdvancing(order.id)
    try {
      const result = await advanceOrder(order.id)
      toast.success(`订单 ${order.orderNo} 已推进为「${result.statusText}」`)
      await load()
      if (detail?.id === order.id) {
        setDetail(result)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '推进失败')
    } finally {
      setAdvancing(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          {!isStaff ? (
            <div className="w-44 space-y-1.5">
              <Label htmlFor="order-store">门店</Label>
              <Select
                value={storeId || 'all'}
                onValueChange={(value) => {
                  setStoreId(value === 'all' || value === null ? '' : value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="order-store">
                  <SelectValue placeholder="全部门店" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部门店</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={String(store.id)}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="w-36 space-y-1.5">
            <Label htmlFor="order-status">状态</Label>
            <Select
              value={status || 'all'}
              onValueChange={(value) => {
                setStatus(value === 'all' || value === null ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger id="order-status">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((item) => (
                  <SelectItem key={item.value || 'all'} value={item.value || 'all'}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1.5">
            <Label htmlFor="order-date">下单日期</Label>
            <Input
              id="order-date"
              type="date"
              value={date}
              max={todayBeijing()}
              onChange={(event) => {
                setDate(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="w-56 space-y-1.5">
            <Label htmlFor="order-keyword">订单号 / 手机号</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="order-keyword"
                className="pl-9"
                placeholder="搜索订单号或手机号"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStoreId(isStaff && profile?.storeId ? String(profile.storeId) : '')
                setStatus('')
                setDate('')
                setKeyword('')
                setPage(1)
              }}
            >
              重置
            </Button>
            <Button variant="outline" size="icon" onClick={() => void load()} aria-label="刷新">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <AlertCircle className="size-9 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                重新加载
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>门店</TableHead>
                  <TableHead>会员</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>取餐码</TableHead>
                  <TableHead className="text-right">实付</TableHead>
                  <TableHead>下单时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const action = NEXT_ACTION_TEXT[order.status]
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                      <TableCell className="text-xs">{order.storeName}</TableCell>
                      <TableCell>
                        <p className="text-xs">{order.memberNickname}</p>
                        <p className="text-xs text-muted-foreground">{order.memberPhone}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[order.status]}>{order.statusText}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{order.pickupCode ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(order.payFen)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatBeijingTime(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => void openDetail(order.id)}>
                            详情
                          </Button>
                          {action ? (
                            <Button
                              size="sm"
                              disabled={advancing === order.id}
                              onClick={() => void advance(order)}
                            >
                              {advancing === order.id ? '处理中' : action}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      没有符合条件的订单
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}

          {total > 0 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                共 {total} 笔订单，第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <OrderDetailDialog open={detailOpen} order={detail} onClose={() => setDetailOpen(false)} />
    </div>
  )
}

interface OrderDetailDialogProps {
  open: boolean
  order: AdminOrderDetail | null
  onClose: () => void
}

/** 订单详情弹窗 */
function OrderDetailDialog({ open, order, onClose }: OrderDetailDialogProps) {
  const action = order ? NEXT_ACTION_TEXT[order.status] : undefined
  return (
    <Dialog open={open} onOpenChange={(value) => (value ? undefined : onClose())}>
      <DialogContent className="sm:max-w-xl">
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{order.orderNo}</DialogTitle>
              <DialogDescription>
                {order.storeName} · {order.orderTypeText} · {formatBeijingTime(order.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Info label="状态" value={order.statusText} />
              <Info label="取餐码" value={order.pickupCode ?? '—'} mono />
              <Info label="会员" value={`${order.memberNickname} ${order.memberPhone}`} />
              <Info label="备注" value={order.remark || '—'} />
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">商品明细</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">小计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={`${item.productId}-${index}`}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.specText}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">×{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
              <AmountRow label="原价" value={formatMoney(order.totalFen)} />
              <AmountRow
                label={`优惠${order.coupon ? `（${order.coupon.name}）` : ''}`}
                value={`-${formatMoney(order.discountFen)}`}
              />
              <AmountRow label="实付" value={formatMoney(order.payFen)} strong />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">订单进度</p>
              <ol className="space-y-1.5">
                {order.timeline.map((entry) => (
                  <li key={entry.status} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="size-3.5 text-caramel" />
                    <span className="w-16 text-muted-foreground">{entry.statusText}</span>
                    <span>{formatBeijingTime(entry.time)}</span>
                  </li>
                ))}
              </ol>
            </div>

            {action ? (
              <p className="rounded-md bg-brand-muted/50 px-3 py-2 text-xs text-brand">
                下一步操作：{action}
              </p>
            ) : null}
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
            <DialogDescription>加载中</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function AmountRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? 'text-base font-semibold text-brand' : ''}`}>{value}</span>
    </div>
  )
}
