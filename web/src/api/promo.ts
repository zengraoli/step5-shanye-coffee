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
