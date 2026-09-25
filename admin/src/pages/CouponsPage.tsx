import { AlertCircle, Pencil, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createCoupon,
  describeCoupon,
  fetchAdminCoupons,
  updateCoupon,
  updateCouponStatus,
  type AdminCoupon,
  type CouponPayload,
  type CouponType,
} from '@/api/coupons'
import { ApiError } from '@/api/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** 优惠券管理页 */
export function CouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<AdminCoupon | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCoupons(await fetchAdminCoupons())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleStatus = async (coupon: AdminCoupon) => {
    try {
      const next = coupon.status === 'active' ? 'inactive' : 'active'
      await updateCouponStatus(coupon.id, next)
      toast.success(next === 'active' ? `已启用「${coupon.name}」` : `已停用「${coupon.name}」`)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '操作失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">满减券与折扣券模板，会员可在小程序领取</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => void load()} aria-label="刷新">
            <RefreshCw className="size-4" />
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" />
            新增优惠券
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
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
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>规则</TableHead>
                  <TableHead className="text-right">领取后有效期</TableHead>
                  <TableHead className="text-right">剩余 / 总量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium">{coupon.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{coupon.typeText}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{describeCoupon(coupon)}</TableCell>
                    <TableCell className="text-right tabular-nums">{coupon.validDays} 天</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {coupon.remaining} / {coupon.total}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.status === 'active' ? 'default' : 'secondary'}>
                        {coupon.status === 'active' ? '进行中' : '已停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(coupon)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-3.5" />
                          编辑
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void toggleStatus(coupon)}>
                          {coupon.status === 'active' ? '停用' : '启用'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      还没有优惠券模板
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CouponDialog
        open={dialogOpen}
        coupon={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={async () => {
          setDialogOpen(false)
          await load()
        }}
      />
    </div>
  )
}

interface CouponDialogProps {
  open: boolean
  coupon: AdminCoupon | null
  onClose: () => void
  onSaved: () => Promise<void>
}

interface CouponForm {
  name: string
  type: CouponType
  thresholdYuan: string
  reduceYuan: string
  discountPercent: string
  maxReduceYuan: string
  validDays: string
  total: string
}

/** 优惠券新增 / 编辑弹窗 */
function CouponDialog({ open, coupon, onClose, onSaved }: CouponDialogProps) {
  const [form, setForm] = useState<CouponForm>({
    name: '',
    type: 'full_reduction',
    thresholdYuan: '',
    reduceYuan: '',
    discountPercent: '85',
    maxReduceYuan: '',
    validDays: '7',
    total: '1000',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    if (coupon) {
      setForm({
        name: coupon.name,
        type: coupon.type,
        thresholdYuan: (coupon.thresholdFen / 100).toFixed(2),
        reduceYuan: (coupon.reduceFen / 100).toFixed(2),
        discountPercent: String(coupon.discountPercent),
        maxReduceYuan: coupon.maxReduceFen > 0 ? (coupon.maxReduceFen / 100).toFixed(2) : '',
        validDays: String(coupon.validDays),
        total: String(coupon.total),
      })
    } else {
      setForm({
        name: '',
        type: 'full_reduction',
        thresholdYuan: '',
        reduceYuan: '',
        discountPercent: '85',
        maxReduceYuan: '',
        validDays: '7',
        total: '1000',
      })
    }
    setError('')
  }, [open, coupon])

  const toFen = (value: string): number => Math.round(Number(value) * 100)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (form.name.trim().length === 0 || form.name.trim().length > 30) {
      setError('券名称必填且不超过 30 个字')
      return
    }
    const validDays = Number(form.validDays)
    if (!Number.isInteger(validDays) || validDays <= 0 || validDays > 365) {
      setError('有效天数必须为 1-365 的整数')
      return
    }
    const payload: CouponPayload = {
      name: form.name.trim(),
      type: form.type,
      validDays,
    }
    if (form.type === 'full_reduction') {
      const thresholdFen = toFen(form.thresholdYuan)
      const reduceFen = toFen(form.reduceYuan)
      if (!(thresholdFen > 0) || !(reduceFen > 0)) {
        setError('满减券需填写使用门槛与减免金额')
        return
      }
      payload.thresholdFen = thresholdFen
      payload.reduceFen = reduceFen
    } else {
      const discountPercent = Number(form.discountPercent)
      if (!Number.isInteger(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
        setError('折扣必须在 1-99 之间')
        return
      }
      const thresholdFen = toFen(form.thresholdYuan || '0')
      const maxReduceFen = form.maxReduceYuan.trim() === '' ? 0 : toFen(form.maxReduceYuan)
      if (maxReduceFen < 0) {
        setError('最高减免不能为负')
        return
      }
      payload.discountPercent = discountPercent
      payload.thresholdFen = thresholdFen
      payload.maxReduceFen = maxReduceFen
    }
    if (!coupon) {
      const total = Number(form.total)
      if (!Number.isInteger(total) || total <= 0) {
        setError('发放总量必须为大于 0 的整数')
        return
      }
      payload.total = total
    }

    setSaving(true)
    try {
      if (coupon) {
        await updateCoupon(coupon.id, payload)
        toast.success(`已保存「${payload.name}」`)
      } else {
        await createCoupon(payload)
        toast.success(`已创建「${payload.name}」`)
      }
      await onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{coupon ? `编辑优惠券：${coupon.name}` : '新增优惠券'}</DialogTitle>
          <DialogDescription>满减券按门槛减免固定金额；折扣券按百分比减免，可设上限。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="coupon-name">券名称</Label>
            <Input
              id="coupon-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              maxLength={30}
              placeholder="如：新客满 50 减 10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coupon-type">券类型</Label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: (value ?? 'full_reduction') as CouponType })}
            >
              <SelectTrigger id="coupon-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_reduction">满减券</SelectItem>
                <SelectItem value="discount">折扣券</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-threshold">使用门槛（元）</Label>
              <Input
                id="coupon-threshold"
                inputMode="decimal"
                value={form.thresholdYuan}
                onChange={(event) => setForm({ ...form, thresholdYuan: event.target.value })}
                placeholder="如：50.00"
              />
            </div>
            {form.type === 'full_reduction' ? (
              <div className="space-y-1.5">
                <Label htmlFor="coupon-reduce">减免金额（元）</Label>
                <Input
                  id="coupon-reduce"
                  inputMode="decimal"
                  value={form.reduceYuan}
                  onChange={(event) => setForm({ ...form, reduceYuan: event.target.value })}
                  placeholder="如：10.00"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="coupon-discount">折扣（1-99）</Label>
                <Input
                  id="coupon-discount"
                  inputMode="numeric"
                  value={form.discountPercent}
                  onChange={(event) => setForm({ ...form, discountPercent: event.target.value })}
                  placeholder="如：85 表示 8.5 折"
                />
              </div>
            )}
          </div>
          {form.type === 'discount' ? (
            <div className="space-y-1.5">
              <Label htmlFor="coupon-max">最高减免（元，留空不限）</Label>
              <Input
                id="coupon-max"
                inputMode="decimal"
                value={form.maxReduceYuan}
                onChange={(event) => setForm({ ...form, maxReduceYuan: event.target.value })}
                placeholder="如：20.00"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-days">领取后有效期（天）</Label>
              <Input
                id="coupon-days"
                inputMode="numeric"
                value={form.validDays}
                onChange={(event) => setForm({ ...form, validDays: event.target.value })}
              />
            </div>
            {!coupon ? (
              <div className="space-y-1.5">
                <Label htmlFor="coupon-total">发放总量</Label>
                <Input
                  id="coupon-total"
                  inputMode="numeric"
                  value={form.total}
                  onChange={(event) => setForm({ ...form, total: event.target.value })}
                />
              </div>
            ) : null}
          </div>
          {coupon ? (
            <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              当前规则：{describeCoupon(coupon)}（修改后对新领取的券生效）
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" onClick={onClose} />}>取消</DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? '保存中' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
