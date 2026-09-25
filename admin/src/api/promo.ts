/** 活动（第二杯半价）接口 */
import { apiFetch } from './client'

export interface PromoActivity {
  id: number
  name: string
  type: 'second_half'
  status: 'active' | 'inactive'
  startAt: string
  endAt: string
  productIds: number[]
}

export interface PromoState {
  active: boolean
  activity: PromoActivity | null
}

/** 当前活动（公开） */
export function fetchPromo(): Promise<PromoState> {
  return apiFetch<PromoState>('/api/v1/promo')
}

/** 读取活动配置（后台） */
export function fetchAdminPromo(): Promise<PromoState> {
  return apiFetch<PromoState>('/api/v1/admin/promo')
}

export interface PromoPayload {
  status?: 'active' | 'inactive'
  startAt?: string
  endAt?: string
  productIds?: number[]
  name?: string
}

/** 保存活动配置（后台） */
export function updatePromo(payload: PromoPayload): Promise<PromoState> {
  return apiFetch<PromoState>('/api/v1/admin/promo', { method: 'PUT', body: payload })
}
