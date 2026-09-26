import { AlertCircle, Coins, Receipt, RefreshCw, Search, Ticket, User } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  fetchAdminMember,
  fetchAdminMembers,
  type AdminMember,
  type AdminMemberDetail,
} from '@/api/members'
import { ApiError } from '@/api/client'
import { formatBeijingTime, formatMoney } from '@/lib/format'
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

const LEVEL_FILTERS = [
  { value: '', label: '全部等级' },
  { value: 'silver', label: '银卡' },
  { value: 'gold', label: '金卡' },
  { value: 'black', label: '黑卡' },
]

const LEVEL_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  silver: 'outline',
  gold: 'secondary',
  black: 'default',
}

/** 会员管理页 */
export function MembersPage() {
  const [members, setMembers] = useState<AdminMember[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [level, setLevel] = useState('')
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchAdminMembers({
        keyword: keyword.trim() || undefined,
        level: level || undefined,
        page,
        pageSize,
      })
      setMembers(result.list)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [keyword, level, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  const openDetail = async (id: number) => {
    try {
      setDetail(await fetchAdminMember(id))
      setDetailOpen(true)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '加载会员详情失败')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="w-56 space-y-1.5">
            <Label htmlFor="member-keyword">手机号 / 昵称</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="member-keyword"
                className="pl-9"
                placeholder="搜索会员"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <div className="w-36 space-y-1.5">
            <Label htmlFor="member-level">等级</Label>
            <Select
              value={level || 'all'}
              onValueChange={(value) => {
                setLevel(value === 'all' || value === null ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger id="member-level">
                <SelectValue>
                  {level === 'silver' ? '银卡' : level === 'gold' ? '金卡' : level === 'black' ? '黑卡' : '全部等级'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LEVEL_FILTERS.map((item) => (
                  <SelectItem key={item.value || 'all'} value={item.value || 'all'}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setKeyword('')
                setLevel('')
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
                  <TableHead>会员</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead className="text-right">积分</TableHead>
                  <TableHead className="text-right">订单数</TableHead>
                  <TableHead className="text-right">累计消费</TableHead>
                  <TableHead>最近下单</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{member.nickname}</p>
                      <p className="text-xs text-muted-foreground">{member.maskedPhone}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={LEVEL_VARIANT[member.level] ?? 'outline'}>{member.levelText}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{member.points}</TableCell>
                    <TableCell className="text-right tabular-nums">{member.orderCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(member.totalPayFen)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatBeijingTime(member.lastOrderAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => void openDetail(member.id)}>
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      没有符合条件的会员
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}

          {total > 0 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                共 {total} 位会员，第 {page} / {totalPages} 页
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

      <MemberDetailDialog open={detailOpen} member={detail} onClose={() => setDetailOpen(false)} />
    </div>
  )
}

interface MemberDetailDialogProps {
  open: boolean
  member: AdminMemberDetail | null
  onClose: () => void
}

/** 会员详情弹窗 */
function MemberDetailDialog({ open, member, onClose }: MemberDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => (value ? undefined : onClose())}>
      <DialogContent className="sm:max-w-2xl">
        {member ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-caramel" />
                {member.nickname}
                <span className="font-mono text-sm text-muted-foreground">{member.maskedPhone}</span>
              </DialogTitle>
              <DialogDescription>
                注册于 {formatBeijingTime(member.createdAt)} · 累计消费 {formatMoney(member.totalPayFen)} ·{' '}
                {member.orderCount} 笔订单
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-muted/60 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Coins className="size-3.5" />
                  当前积分
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-brand">{member.points}</p>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">等级</p>
                <p className="mt-1 text-lg font-semibold">{member.levelText}</p>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">下一等级</p>
                <p className="mt-1 text-lg font-semibold">{member.nextLevelText ?? '已达最高'}</p>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">升级还需</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{member.pointsToNextLevel} 分</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Receipt className="size-4 text-caramel" />
                最近订单
              </p>
              {member.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无订单</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">实付</TableHead>
                      <TableHead>下单时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.orders.slice(0, 8).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                        <TableCell className="text-xs">{order.status}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(order.payFen)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatBeijingTime(order.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Ticket className="size-4 text-caramel" />
                优惠券
              </p>
              {member.coupons.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无优惠券</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {member.coupons.slice(0, 8).map((coupon) => (
                    <Badge key={coupon.id} variant="secondary" className="font-normal">
                      {coupon.name}（{coupon.status === 'unused' ? '未使用' : coupon.status === 'used' ? '已使用' : '已过期'}）
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">积分明细</p>
              {member.pointsLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无积分记录</p>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {member.pointsLogs.slice(0, 20).map((log) => (
                    <li key={log.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{log.reason}</span>
                      <span className="tabular-nums text-brand">+{log.change}</span>
                      <span className="text-xs text-muted-foreground">{formatBeijingTime(log.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>会员详情</DialogTitle>
            <DialogDescription>加载中</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}
