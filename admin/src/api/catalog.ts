/** 门店与分类公共接口 */
import { apiFetch } from './client'

export interface Category {
  id: number
  name: string
  sort: number
  productCount: number
}

export interface Store {
  id: number
  name: string
  address: string
  phone: string
  openTime: string
  closeTime: string
  /** 手动休息开关：true 表示临时闭店（无需改营业时间） */
  manualClosed?: boolean
  status: 'open' | 'rest'
  statusText: string
}

/** 分类列表 */
export function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/v1/categories')
}

/** 门店列表 */
export function fetchStores(): Promise<Store[]> {
  return apiFetch<Store[]>('/api/v1/stores')
}
