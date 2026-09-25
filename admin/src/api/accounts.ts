/** 后台账号管理接口 */
import { apiFetch } from './client'
import type { Store } from './catalog'

export type AdminRole = 'admin' | 'staff'

export interface AdminAccount {
  id: number
  username: string
  role: AdminRole
  storeId: number | null
  storeName: string | null
  nickname: string
  status: 'active' | 'inactive'
  createdAt: string
}

export interface CreateAccountPayload {
  username: string
  password?: string
  role: AdminRole
  storeId?: number | null
  nickname?: string
}

export interface CreateAccountResult {
  account: AdminAccount
  password: string
}

export interface ResetPasswordResult {
  id: number
  username: string
  password: string
  generated: boolean
}

/** 账号列表 */
export function fetchAdminAccounts(): Promise<AdminAccount[]> {
  return apiFetch<AdminAccount[]>('/api/v1/admin/accounts')
}

/** 新增账号（密码留空由服务端生成） */
export function createAccount(payload: CreateAccountPayload): Promise<CreateAccountResult> {
  return apiFetch<CreateAccountResult>('/api/v1/admin/accounts', { method: 'POST', body: payload })
}

/** 停用 / 启用账号 */
export function updateAccountStatus(id: number, status: 'active' | 'inactive'): Promise<AdminAccount> {
  return apiFetch<AdminAccount>(`/api/v1/admin/accounts/${id}/status`, { method: 'PATCH', body: { status } })
}

/** 重置密码 */
export function resetAccountPassword(id: number, password?: string): Promise<ResetPasswordResult> {
  return apiFetch<ResetPasswordResult>(`/api/v1/admin/accounts/${id}/reset-password`, {
    method: 'POST',
    body: password ? { password } : {},
  })
}

/** 修改角色与门店绑定 */
export function updateAccount(
  id: number,
  payload: { role?: AdminRole; storeId?: number | null; nickname?: string },
): Promise<AdminAccount> {
  return apiFetch<AdminAccount>(`/api/v1/admin/accounts/${id}`, { method: 'PATCH', body: payload })
}

/** 门店列表（账号绑定用） */
export function fetchStoresForAccounts(): Promise<Store[]> {
  return apiFetch<Store[]>('/api/v1/admin/stores')
}
