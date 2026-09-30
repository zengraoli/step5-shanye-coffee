/** 后台商品管理接口 */
import { apiFetch } from './client'

/** 规格组 key（与 server/lib/specs.ts 的 ALL_SPEC_KEYS 保持一致） */
export const ALL_SPEC_KEYS = ['cup', 'temp', 'sugar'] as const

export type SpecKey = (typeof ALL_SPEC_KEYS)[number]

export const SPEC_GROUP_LABELS: Record<SpecKey, string> = {
  cup: '杯型',
  temp: '温度',
  sugar: '糖度',
}

export interface AdminProduct {
  id: number
  categoryId: number
  categoryName: string
  name: string
  subtitle: string
  description: string
  image: string
  basePrice: number
  onSale: boolean
  soldOut: boolean
  /** 被单独标记售罄的门店 id 列表（未指定门店时为全局售罄） */
  soldOutStoreIds?: number[]
  sort: number
  specs: {
    key: string
    label: string
    options: { value: string; label: string; extra: number }[]
  }[]
  /** 该商品启用的规格组 key 列表 */
  specKeys?: SpecKey[]
}

export interface AdminProductList {
  list: AdminProduct[]
  total: number
  page: number
  pageSize: number
}

export interface ProductPayload {
  categoryId: number
  name: string
  subtitle?: string
  description?: string
  basePrice: number
  sort?: number
  /** 启用的规格组 key 列表，如 ["cup","temp","sugar"]；轻食 / 周边传 [] */
  specGroups?: SpecKey[]
}

/** 上下架 / 售罄；storeId 传了只改该门店，不传改全局 */
export interface ProductStatusPayload {
  onSale?: boolean
  soldOut?: boolean
  storeId?: number
}

export interface ProductQuery {
  categoryId?: string
  keyword?: string
  onSale?: string
  soldOut?: string
  page?: number
  pageSize?: number
}

function toQueryString(query: ProductQuery): string {
  const params = new URLSearchParams()
  if (query.categoryId) {
    params.set('category_id', query.categoryId)
  }
  if (query.keyword) {
    params.set('keyword', query.keyword)
  }
  if (query.onSale) {
    params.set('on_sale', query.onSale)
  }
  if (query.soldOut) {
    params.set('sold_out', query.soldOut)
  }
  params.set('page', String(query.page ?? 1))
  params.set('page_size', String(query.pageSize ?? 10))
  return params.toString()
}

/** 后台商品列表（含下架商品） */
export function fetchAdminProducts(query: ProductQuery = {}): Promise<AdminProductList> {
  return apiFetch<AdminProductList>(`/api/v1/admin/products?${toQueryString(query)}`)
}

/** 新增商品 */
export function createProduct(payload: ProductPayload): Promise<AdminProduct> {
  return apiFetch<AdminProduct>('/api/v1/admin/products', { method: 'POST', body: payload })
}

/** 编辑商品 */
export function updateProduct(id: number, payload: Partial<ProductPayload>): Promise<AdminProduct> {
  return apiFetch<AdminProduct>(`/api/v1/admin/products/${id}`, { method: 'PUT', body: payload })
}

/** 上下架 / 售罄（可传 storeId 只改某门店） */
export function updateProductStatus(
  id: number,
  status: ProductStatusPayload,
): Promise<AdminProduct> {
  return apiFetch<AdminProduct>(`/api/v1/admin/products/${id}/status`, { method: 'PATCH', body: status })
}
