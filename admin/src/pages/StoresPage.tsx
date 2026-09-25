import { AlertCircle, Clock, MapPin, Pencil, Phone, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { fetchAdminStores, updateStore, type Store, type StorePayload } from '@/api/stores'
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
import { Skeleton } from '@/components/ui/skeleton'

/** 门店管理页 */
export function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Store | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStores(await fetchAdminStores())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">共 {stores.length} 家门店，营业状态按北京时间自动计算</p>
        <Button variant="outline" size="icon" onClick={() => void load()} aria-label="刷新">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <AlertCircle className="size-9 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              重新加载
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold">{store.name}</h3>
                  <Badge variant={store.status === 'open' ? 'default' : 'secondary'}>
                    {store.statusText}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    {store.address}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 shrink-0" />
                    {store.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0" />
                    每日 {store.openTime} - {store.closeTime}
                  </p>
                </div>
                <div className="mt-auto flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(store)
                      setDialogOpen(true)
                    }}
                  >
                    <Pencil className="size-3.5" />
                    编辑
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StoreDialog
        open={dialogOpen}
        store={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={async () => {
          setDialogOpen(false)
          await load()
        }}
      />
    </div>
  )
}

interface StoreDialogProps {
  open: boolean
  store: Store | null
  onClose: () => void
  onSaved: () => Promise<void>
}

/** 门店编辑弹窗 */
function StoreDialog({ open, store, onClose, onSaved }: StoreDialogProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [openTime, setOpenTime] = useState('')
  const [closeTime, setCloseTime] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !store) {
      return
    }
    setName(store.name)
    setAddress(store.address)
    setPhone(store.phone)
    setOpenTime(store.openTime)
    setCloseTime(store.closeTime)
    setError('')
  }, [open, store])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (name.trim().length === 0) {
      setError('请填写门店名称')
      return
    }
    if (address.trim().length === 0) {
      setError('请填写门店地址')
      return
    }
    const payload: StorePayload = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      openTime,
      closeTime,
    }
    setSaving(true)
    try {
      await updateStore(store!.id, payload)
      toast.success(`已保存「${payload.name}」`)
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
          <DialogTitle>编辑门店</DialogTitle>
          <DialogDescription>修改门店信息与营业时间，保存后立即生效。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="store-name">门店名称</Label>
            <Input id="store-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-address">门店地址</Label>
            <Input
              id="store-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-phone">门店电话</Label>
            <Input id="store-phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="store-open">开始时间</Label>
              <Input
                id="store-open"
                type="time"
                value={openTime}
                onChange={(event) => setOpenTime(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-close">打烊时间</Label>
              <Input
                id="store-close"
                type="time"
                value={closeTime}
                onChange={(event) => setCloseTime(event.target.value)}
              />
            </div>
          </div>
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
