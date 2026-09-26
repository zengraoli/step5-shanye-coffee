import { AlertCircle, Pencil, Plus, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createProduct,
  fetchAdminProducts,
  updateProduct,
  updateProductStatus,
  type AdminProduct,
  type AdminProductList,
  type ProductPayload,
} from '@/api/products'
import { fetchCategories, type Category } from '@/api/catalog'
import { ApiError } from '@/api/client'
import { RoleGuard } from '@/auth/RoleGuard'
import { formatMoney } from '@/lib/format'
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
import { Textarea } from '@/components/ui/textarea'

const STATUS_FILTERS = [
  { value: '', label: '全部状态' },
  { value: 'on', label: '上架中' },
  { value: 'off', label: '已下架' },
  { value: 'soldout', label: '已售罄' },
]

/** 商品管理页 */
export function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [data, setData] = useState<AdminProductList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [categoryId, setCategoryId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(
        await fetchAdminProducts({
          categoryId: categoryId || undefined,
          keyword: keyword.trim() || undefined,
          onSale: status === 'off' ? '0' : status === 'on' ? '1' : undefined,
          soldOut: status === 'soldout' ? '1' : undefined,
          page,
          pageSize: 10,
        }),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [categoryId, keyword, status, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  const toggleSale = async (product: AdminProduct) => {
    try {
      await updateProductStatus(product.id, { onSale: !product.onSale })
      toast.success(product.onSale ? `已下架「${product.name}」` : `已上架「${product.name}」`)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '操作失败')
    }
  }

  const toggleSoldOut = async (product: AdminProduct) => {
    try {
      await updateProductStatus(product.id, { soldOut: !product.soldOut })
      toast.success(product.soldOut ? `已恢复「${product.name}」` : `已标记「${product.name}」售罄`)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '操作失败')
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="w-40 space-y-1.5">
            <Label htmlFor="filter-category">分类</Label>
            <Select
              value={categoryId || 'all'}
              onValueChange={(value) => {
                setCategoryId(value === 'all' || value === null ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger id="filter-category">
                <SelectValue>
                  {(categoryId && categories.find((item) => String(item.id) === categoryId)?.name) || '全部分类'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-56 space-y-1.5">
            <Label htmlFor="filter-keyword">商品名称</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filter-keyword"
                className="pl-9"
                placeholder="搜索商品名称"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <div className="w-36 space-y-1.5">
            <Label htmlFor="filter-status">状态</Label>
            <Select
              value={status || 'all'}
              onValueChange={(value) => {
                setStatus(value === 'all' || value === null ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger id="filter-status">
                <SelectValue>
                  {(status && STATUS_FILTERS.find((item) => item.value === status)?.label) || '全部状态'}
                </SelectValue>
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
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCategoryId('')
                setKeyword('')
                setStatus('')
                setPage(1)
              }}
            >
              重置
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void load()}
              aria-label="刷新"
            >
              <RefreshCw className="size-4" />
            </Button>
            <RoleGuard roles={['admin']}>
              <Button
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
              >
                <Plus className="size-4" />
                新增商品
              </Button>
            </RoleGuard>
          </div>
        </CardContent>
      </Card>

      {/* 商品表格 */}
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
                  <TableHead>商品</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead className="text-right">价格</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.list.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.subtitle || '—'}</p>
                    </TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(product.basePrice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Badge variant={product.onSale ? 'default' : 'secondary'}>
                          {product.onSale ? '上架中' : '已下架'}
                        </Badge>
                        {product.soldOut ? <Badge variant="destructive">售罄</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <RoleGuard roles={['admin']}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(product)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil className="size-3.5" />
                            编辑
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => void toggleSale(product)}>
                            {product.onSale ? '下架' : '上架'}
                          </Button>
                        </RoleGuard>
                        <Button variant="ghost" size="sm" onClick={() => void toggleSoldOut(product)}>
                          {product.soldOut ? '恢复' : '售罄'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      没有符合条件的商品
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}

          {/* 分页 */}
          {data && data.total > 0 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                共 {data.total} 个商品，第 {data.page} / {totalPages} 页
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

      <ProductDialog
        open={dialogOpen}
        product={editing}
        categories={categories}
        onClose={() => setDialogOpen(false)}
        onSaved={async () => {
          setDialogOpen(false)
          await load()
        }}
      />
    </div>
  )
}

interface ProductDialogProps {
  open: boolean
  product: AdminProduct | null
  categories: Category[]
  onClose: () => void
  onSaved: () => Promise<void>
}

/** 新增 / 编辑商品弹窗 */
function ProductDialog({ open, product, categories, onClose, onSaved }: ProductDialogProps) {
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [sort, setSort] = useState('0')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setName(product?.name ?? '')
    setSubtitle(product?.subtitle ?? '')
    setDescription(product?.description ?? '')
    setCategoryId(product ? String(product.categoryId) : (categories[0] ? String(categories[0].id) : ''))
    setPrice(product ? (product.basePrice / 100).toFixed(2) : '')
    setSort(String(product?.sort ?? 0))
    setError('')
  }, [open, product, categories])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const priceFen = Math.round(Number(price) * 100)
    if (name.trim().length === 0) {
      setError('请填写商品名称')
      return
    }
    if (name.trim().length > 30) {
      setError('商品名称不能超过 30 个字')
      return
    }
    if (!Number.isInteger(priceFen) || priceFen <= 0) {
      setError('商品价格必须为大于 0 的金额')
      return
    }
    const sortValue = Number(sort)
    if (!Number.isInteger(sortValue)) {
      setError('排序必须为整数')
      return
    }
    setSaving(true)
    try {
      const payload: ProductPayload = {
        categoryId: Number(categoryId),
        name: name.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        basePrice: priceFen,
        sort: sortValue,
      }
      if (product) {
        await updateProduct(product.id, payload)
        toast.success(`已保存「${payload.name}」`)
      } else {
        await createProduct(payload)
        toast.success(`已创建「${payload.name}」`)
      }
      await onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const specs = product?.specs ?? []

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? `编辑商品：${product.name}` : '新增商品'}</DialogTitle>
          <DialogDescription>
            规格为全局固定选项：杯型（中 / 大，大杯加 ¥3.00）、温度（冰 / 热）、糖度（无 / 少 / 标准）。
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">商品名称</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="如：山野拿铁"
                maxLength={30}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-category">分类</Label>
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? '')}>
                <SelectTrigger id="product-category">
                  <SelectValue>
                    {(categoryId && categories.find((item) => String(item.id) === categoryId)?.name) || '选择分类'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">价格（元）</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="如：32.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-sort">排序</Label>
              <Input
                id="product-sort"
                inputMode="numeric"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-subtitle">副标题</Label>
            <Input
              id="product-subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="如：招牌"
              maxLength={20}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-description">商品描述</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="风味、做法等介绍"
              rows={3}
            />
          </div>
          {specs.length > 0 ? (
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">规格与加价</p>
              <ul className="space-y-0.5">
                {specs.map((group) => (
                  <li key={group.key}>
                    {group.label}：
                    {group.options
                      .map((option) => `${option.label}${option.extra > 0 ? `（+${formatMoney(option.extra)}）` : ''}`)
                      .join(' / ')}
                  </li>
                ))}
              </ul>
            </div>
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
