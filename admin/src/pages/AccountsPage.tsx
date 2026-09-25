import { AlertCircle, KeyRound, Pencil, Plus, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createAccount,
  fetchAdminAccounts,
  fetchStoresForAccounts,
  resetAccountPassword,
  updateAccount,
  updateAccountStatus,
  type AdminAccount,
  type AdminRole,
} from '@/api/accounts'
import type { Store } from '@/api/catalog'
import { ApiError, getProfile } from '@/api/client'
import { formatBeijingTime } from '@/lib/format'
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

const ROLE_TEXT: Record<AdminRole, string> = {
  admin: '管理员',
  staff: '店员',
}

/** 账号与角色管理页 */
export function AccountsPage() {
  const current = getProfile()
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AdminAccount | null>(null)
  const [resetting, setResetting] = useState<AdminAccount | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAccounts(await fetchAdminAccounts())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    fetchStoresForAccounts()
      .then(setStores)
      .catch(() => setStores([]))
  }, [load])

  const toggleStatus = async (account: AdminAccount) => {
    try {
      const next = account.status === 'active' ? 'inactive' : 'active'
      await updateAccountStatus(account.id, next)
      toast.success(next === 'active' ? `已启用「${account.username}」` : `已停用「${account.username}」`)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '操作失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          管理员拥有全部权限；店员只能处理本门店订单与商品售罄状态
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => void load()} aria-label="刷新">
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            新增账号
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
                  <TableHead>账号</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>绑定门店</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <p className="flex items-center gap-1.5 font-medium">
                        {account.role === 'admin' ? <ShieldCheck className="size-3.5 text-caramel" /> : null}
                        {account.username}
                        {current?.id === account.id ? (
                          <Badge variant="outline" className="font-normal">
                            当前登录
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.nickname}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.role === 'admin' ? 'default' : 'secondary'}>
                        {ROLE_TEXT[account.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{account.storeName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                        {account.status === 'active' ? '启用' : '已停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatBeijingTime(account.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(account)
                          }}
                        >
                          <Pencil className="size-3.5" />
                          编辑
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setResetting(account)}>
                          <KeyRound className="size-3.5" />
                          重置密码
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={current?.id === account.id}
                          onClick={() => void toggleStatus(account)}
                        >
                          {account.status === 'active' ? '停用' : '启用'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateAccountDialog
        open={createOpen}
        stores={stores}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load()}
      />

      <EditAccountDialog
        account={editing}
        stores={stores}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          await load()
        }}
      />

      <ResetPasswordDialog account={resetting} onClose={() => setResetting(null)} />
    </div>
  )
}

interface CreateAccountDialogProps {
  open: boolean
  stores: Store[]
  onClose: () => void
  /** 创建成功后刷新列表（不关闭弹窗，以便展示一次性密码） */
  onCreated: () => Promise<void>
}

/** 新增账号弹窗 */
function CreateAccountDialog({ open, stores, onClose, onCreated }: CreateAccountDialogProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AdminRole>('staff')
  const [storeId, setStoreId] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [createdPassword, setCreatedPassword] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }
    setUsername('')
    setPassword('')
    setRole('staff')
    setStoreId(stores[0] ? String(stores[0].id) : '')
    setNickname('')
    setError('')
    setCreatedPassword('')
  }, [open, stores])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setError('账号须为 3-20 位字母、数字或下划线')
      return
    }
    if (password.length > 0 && password.length < 6) {
      setError('密码至少 6 位（留空由系统生成）')
      return
    }
    if (role === 'staff' && storeId === '') {
      setError('店员账号必须绑定门店')
      return
    }
    setSaving(true)
    try {
      const result = await createAccount({
        username: username.trim(),
        password: password.length > 0 ? password : undefined,
        role,
        storeId: storeId === '' ? null : Number(storeId),
        nickname: nickname.trim() || undefined,
      })
      setCreatedPassword(result.password)
      toast.success(`已创建账号「${result.account.username}」`)
      await onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增后台账号</DialogTitle>
          <DialogDescription>密码留空时由系统生成，创建成功后请妥善保存。</DialogDescription>
        </DialogHeader>
        {createdPassword ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-brand/30 bg-brand-muted/40 p-4">
              <p className="text-sm font-medium text-brand">账号已创建，初始密码如下（仅显示一次）</p>
              <p className="mt-2 font-mono text-lg select-all">{createdPassword}</p>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" onClick={onClose} />}>完成</DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="account-username">账号</Label>
              <Input
                id="account-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="3-20 位字母、数字或下划线"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-password">密码（留空自动生成）</Label>
              <Input
                id="account-password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="account-role">角色</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole((value ?? 'staff') as AdminRole)}
                >
                  <SelectTrigger id="account-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">店员</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-store">绑定门店</Label>
                <Select
                  value={storeId || 'none'}
                  onValueChange={(value) => setStoreId(value === 'none' || value === null ? '' : value)}
                  disabled={role === 'staff'}
                >
                  <SelectTrigger id="account-store">
                    <SelectValue placeholder="选择门店" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不绑定</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-nickname">昵称（选填）</Label>
              <Input
                id="account-nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={20}
                placeholder="如：三里屯店员"
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" onClick={onClose} />}>取消</DialogClose>
              <Button type="submit" disabled={saving}>
                <Plus className="size-4" />
                {saving ? '创建中' : '创建账号'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface EditAccountDialogProps {
  account: AdminAccount | null
  stores: Store[]
  onClose: () => void
  onSaved: () => Promise<void>
}

/** 角色分配弹窗 */
function EditAccountDialog({ account, stores, onClose, onSaved }: EditAccountDialogProps) {
  const [role, setRole] = useState<AdminRole>('staff')
  const [storeId, setStoreId] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!account) {
      return
    }
    setRole(account.role)
    setStoreId(account.storeId ? String(account.storeId) : '')
    setNickname(account.nickname)
    setError('')
  }, [account])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!account) {
      return
    }
    setError('')
    if (role === 'staff' && storeId === '') {
      setError('店员账号必须绑定门店')
      return
    }
    setSaving(true)
    try {
      await updateAccount(account.id, {
        role,
        storeId: storeId === '' ? null : Number(storeId),
        nickname: nickname.trim() || undefined,
      })
      toast.success(`已更新「${account.username}」的角色`)
      await onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={account !== null} onOpenChange={(value) => (value ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑账号：{account?.username}</DialogTitle>
          <DialogDescription>调整角色与门店绑定，保存后立即生效。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">角色</Label>
            <Select value={role} onValueChange={(value) => setRole((value ?? 'staff') as AdminRole)}>
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">店员</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-store">绑定门店</Label>
            <Select
              value={storeId || 'none'}
              onValueChange={(value) => setStoreId(value === 'none' || value === null ? '' : value)}
              disabled={role === 'staff'}
            >
              <SelectTrigger id="edit-store">
                <SelectValue placeholder="选择门店" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不绑定</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={String(store.id)}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-nickname">昵称</Label>
            <Input
              id="edit-nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
            />
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

interface ResetPasswordDialogProps {
  account: AdminAccount | null
  onClose: () => void
}

/** 重置密码弹窗 */
function ResetPasswordDialog({ account, onClose }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    setPassword('')
    setError('')
    setResult('')
  }, [account])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!account) {
      return
    }
    setError('')
    if (password.length > 0 && password.length < 6) {
      setError('密码至少 6 位（留空由系统生成）')
      return
    }
    setSaving(true)
    try {
      const res = await resetAccountPassword(account.id, password.length > 0 ? password : undefined)
      setResult(res.password)
      toast.success(`已重置「${account.username}」的密码`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重置失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={account !== null} onOpenChange={(value) => (value ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>重置密码：{account?.username}</DialogTitle>
          <DialogDescription>重置后该账号的已登录状态会失效，需使用新密码重新登录。</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-brand/30 bg-brand-muted/40 p-4">
              <p className="text-sm font-medium text-brand">新密码如下（仅显示一次）</p>
              <p className="mt-2 font-mono text-lg select-all">{result}</p>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" onClick={onClose} />}>完成</DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">新密码（留空自动生成）</Label>
              <Input
                id="reset-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" onClick={onClose} />}>取消</DialogClose>
              <Button type="submit" disabled={saving}>
                <KeyRound className="size-4" />
                {saving ? '重置中' : '确认重置'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
