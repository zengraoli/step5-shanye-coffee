/** 商品、分类、门店公开接口 */
import { apiFetch } from './client'

export interface SpecOption {
  value: string
  label: string
  extra: number
}

export interface SpecGroup {
  key: string
  label: string
  options: SpecOption[]
}

export interface Product {
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
  specs: SpecGroup[]
}

export interface ProductList {
  list: Product[]
  total: number
  page: number
  pageSize: number
}

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
  status: 'open' | 'rest'
  statusText: string
}

/** 分类列表 */
export function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/v1/categories')
}

/** 商品列表（仅上架商品） */
export function fetchProducts(
  params: { categoryId?: number; keyword?: string; page?: number; pageSize?: number } = {},
): Promise<ProductList> {
  const query: string[] = []
  if (params.categoryId) {
    query.push(`category_id=${params.categoryId}`)
  }
  if (params.keyword) {
    query.push(`keyword=${encodeURIComponent(params.keyword)}`)
  }
  query.push(`page=${params.page ?? 1}`)
  query.push(`page_size=${params.pageSize ?? 60}`)
  return apiFetch<ProductList>(`/api/v1/products?${query.join('&')}`)
}

/** 门店列表 */
export function fetchStores(): Promise<Store[]> {
  return apiFetch<Store[]>('/api/v1/stores')
}
