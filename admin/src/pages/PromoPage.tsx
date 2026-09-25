import { AlertCircle, RefreshCw, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchAdminPromo, updatePromo, type PromoActivity } from '@/api/promo'
import { fetchAdminProducts, type AdminProduct } from '@/api/products'
import { ApiError } from '@/api/client'
import { isoToLocalInput, localInputToIso, promoPhase } from '@/lib/promo-time'
import { formatBeijingTime } from '@/lib/format'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** 活动管理：第二杯半价的时间与适用商品配置 */
export function PromoPage() {
  const [activity, setActivity] = useState<PromoActivity | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [status, setStatus] = useState<'active' | 'inactive'>('inactive')
  const [name, setName] = useState('第二杯半价')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [keyword, setKeyword] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [promoState, productResult] = await Promise.all([
        fetchAdminPromo(),
        fetchAdminProducts({ pageSize: 100 }),
      ])
      const current = promoState.activity
      setActivity(current)
      setStatus(current?.status ?? 'inactive')
      setName(current?.name ?? '第二杯半价')
      setStartAt(isoToLocalInput(current?.startAt) || defaultStart())
      setEndAt(isoToLocalInput(current?.endAt) || defaultEnd())
      setSelected(current?.productIds ?? [])
      setProducts(productResult.list)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const phase = useMemo(
    () =>
      promoPhase({
        status,
        startAt: localInputToIso(startAt) ?? new Date().toISOString(),
        endAt: localInputToIso(endAt) ?? new Date().toISOString(),
      }),
    [status, startAt, endAt],
  )

  const filtered = useMemo(() => {
    const text = keyword.trim()
    if (!text) {
      return products
    }
    return products.filter((product) => product.name.includes(text))
  }, [products, keyword])

  const grouped = useMemo(() => {
    const map = new Map<string, AdminProduct[]>()
    for (const product of filtered) {
      const list = map.get(product.categoryName)
      if (list) {
        list.push(product)
      } else {
        map.set(product.categoryName, [product])
      }
    }
    return [...map.entries()]
  }, [filtered])

  const toggleProduct = (id: number) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const toggleCategory = (items: AdminProduct[]) => {
    const ids = items.map((item) => item.id)
    const allSelected = ids.every((id) => selected.includes(id))
    setSelected((current) =>
      allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])],
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const startIso = localInputToIso(startAt)
    const endIso = localInputToIso(endAt)
    if (!startIso || !endIso) {
      setError('请填写完整的活动开始与结束时间')
      return
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError('结束时间必须晚于开始时间')
      return
    }
    if (selected.length === 0) {
      setError('请至少选择一个适用商品')
      return
    }
    setSaving(true)
    try {
      const result = await updatePromo({
        status,
        name: name.trim() || '第二杯半价',
        startAt: startIso,
        endAt: endIso,
        productIds: selected,
      })
      setActivity(result.activity)
      toast.success('活动配置已保存')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        {/* 活动状态与时间 */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">第二杯半价</CardTitle>
                <CardDescription>
                  同一订单中同一适用商品的第 2、4… 杯按半价计价；与优惠券叠加时先算活动价再用券。
                </CardDescription>
              </div>
              <Badge
                variant={
                  phase.key === 'running' ? 'default' : phase.key === 'pending' ? 'secondary' : 'outline'
                }
              >
                {phase.text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="promo-name">活动名称</Label>
                <Input
                  id="promo-name"
                  value={name}
                  maxLength={30}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-status">活动状态</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus((value ?? 'inactive') as 'active' | 'inactive')}
                >
                  <SelectTrigger id="promo-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-start">开始时间（北京时间）</Label>
                <Input
                  id="promo-start"
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-end">结束时间（北京时间）</Label>
                <Input
                  id="promo-end"
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                />
              </div>
            </div>
            {activity ? (
              <p className="text-xs text-muted-foreground">
                当前配置：{activity.name} · {formatBeijingTime(activity.startAt)} 至{' '}
                {formatBeijingTime(activity.endAt)} · 适用 {activity.productIds.length} 款商品
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">尚未创建活动，保存后将自动创建。</p>
            )}
          </CardContent>
        </Card>

        {/* 适用商品 */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">适用商品</CardTitle>
                <CardDescription>已选 {selected.length} 款；可按分类批量选择。</CardDescription>
              </div>
              <Input
                className="w-56"
                placeholder="搜索商品名称"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {grouped.map(([categoryName, items]) => (
              <div key={categoryName} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{categoryName}</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => toggleCategory(items)}>
                    {items.every((item) => selected.includes(item.id)) ? '取消全选' : '全选'}
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((product) => {
                    const checked = selected.includes(product.id)
                    return (
                      <label
                        key={product.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                          checked ? 'border-brand bg-brand-muted/40' : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--brand)]"
                          checked={checked}
                          onChange={() => toggleProduct(product.id)}
                        />
                        <span className="flex-1">{product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {product.onSale ? '' : '已下架'}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <Separator />
              </div>
            ))}
            {grouped.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">没有匹配的商品</p> : null}
          </CardContent>
        </Card>

        {error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="size-4" />
            {saving ? '保存中' : '保存配置'}
          </Button>
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            重置
          </Button>
          {error ? <AlertCircle className="size-4 text-destructive" /> : null}
        </div>
      </form>
    </div>
  )
}

function defaultStart(): string {
  return isoToLocalInput(new Date().toISOString())
}

function defaultEnd(): string {
  return isoToLocalInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
}
