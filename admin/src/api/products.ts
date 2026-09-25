/** 商品管理接口 */
import { apiFetch } from './client'

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
  sort: number
  specs: {
    key: string
    label: string
    options: { value: string; label: string; extra: number }[]
  }[]
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

/** 上下架 / 售罄 */
export function updateProductStatus(
  id: number,
  status: { onSale?: boolean; soldOut?: boolean },
): Promise<AdminProduct> {
  return apiFetch<AdminProduct>(`/api/v1/admin/products/${id}/status`, { method: 'PATCH', body: status })
}
