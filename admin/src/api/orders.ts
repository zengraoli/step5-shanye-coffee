/** 订单管理接口（后台） */
import { apiFetch } from './client'

export type OrderStatus =
  | 'pending_pay'
  | 'paid'
  | 'making'
  | 'pickable'
  | 'completed'
  | 'cancelled'

export interface AdminOrderSummary {
  id: number
  orderNo: string
  storeId: number
  storeName: string
  memberPhone: string
  memberNickname: string
  orderType: 'takeout' | 'dine_in'
  orderTypeText: string
  status: OrderStatus
  statusText: string
  totalFen: number
  discountFen: number
  payFen: number
  pickupCode: string | null
  remark: string
  createdAt: string
  paidAt: string | null
}

export interface AdminOrderItem {
  productId: number
  productName: string
  specText: string
  unitPrice: number
  quantity: number
  amount: number
}

export interface AdminOrderDetail extends AdminOrderSummary {
  /** 第二杯半价活动优惠金额（分） */
  promoDiscountFen: number
  items: AdminOrderItem[]
  coupon: { id: number; name: string; discountFen: number } | null
  timeline: { status: OrderStatus; statusText: string; time: string | null }[]
}

export interface AdminOrderList {
  list: AdminOrderSummary[]
  total: number
  page: number
  pageSize: number
}

export interface OrderQuery {
  storeId?: string
  status?: string
  date?: string
  keyword?: string
  page?: number
  pageSize?: number
}

function toQueryString(query: OrderQuery): string {
  const params = new URLSearchParams()
  if (query.storeId) {
    params.set('store_id', query.storeId)
  }
  if (query.status) {
    params.set('status', query.status)
  }
  if (query.date) {
    params.set('date', query.date)
  }
  if (query.keyword) {
    params.set('keyword', query.keyword)
  }
  params.set('page', String(query.page ?? 1))
  params.set('page_size', String(query.pageSize ?? 10))
  return params.toString()
}

/** 后台订单列表 */
export function fetchAdminOrders(query: OrderQuery = {}): Promise<AdminOrderList> {
  return apiFetch<AdminOrderList>(`/api/v1/admin/orders?${toQueryString(query)}`)
}

/** 订单详情 */
export function fetchAdminOrder(id: number): Promise<AdminOrderDetail> {
  return apiFetch<AdminOrderDetail>(`/api/v1/admin/orders/${id}`)
}

/** 推进订单状态 */
export function advanceOrder(id: number): Promise<AdminOrderDetail> {
  return apiFetch<AdminOrderDetail>(`/api/v1/admin/orders/${id}/advance`, { method: 'POST' })
}

/** 下一状态操作文案 */
export const NEXT_ACTION_TEXT: Partial<Record<OrderStatus, string>> = {
  paid: '开始制作',
  making: '出餐完成',
  pickable: '完成订单',
}
