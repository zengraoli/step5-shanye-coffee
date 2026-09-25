/** 后台门店管理接口 */
import { apiFetch } from './client'
import type { Store } from './catalog'

export type { Store }

export interface StorePayload {
  name?: string
  address?: string
  phone?: string
  openTime?: string
  closeTime?: string
}

/** 后台门店列表（含营业状态） */
export function fetchAdminStores(): Promise<Store[]> {
  return apiFetch<Store[]>('/api/v1/admin/stores')
}

/** 编辑门店信息与营业时间 */
export function updateStore(id: number, payload: StorePayload): Promise<Store> {
  return apiFetch<Store>(`/api/v1/admin/stores/${id}`, { method: 'PUT', body: payload })
}
