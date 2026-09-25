/** 下单相关接口：报价、创建订单、模拟支付 */
import { apiFetch } from './client'
import type { MemberOrder, MemberOrderItem } from './member'
import type { SpecSelection } from '@/utils/specs'

export interface QuoteItem {
  productId: number
  spec: SpecSelection
  quantity: number
}

export interface QuoteCoupon {
  id: number
  name: string
  type: 'full_reduction' | 'discount'
  typeText: string
  thresholdFen: number
  reduceFen: number
  discountPercent: number
  maxReduceFen: number
  validTo: string
  usable: boolean
  discountFen: number
}

export interface QuoteResult {
  storeId: number
  storeName: string
  orderType: 'takeout' | 'dine_in'
  items: MemberOrderItem[]
  totalFen: number
  discountFen: number
  payFen: number
  coupons: QuoteCoupon[]
  bestCouponId: number | null
  selectedCouponId: number | null
}

export interface CreateOrderPayload {
  storeId: number
  orderType: 'takeout' | 'dine_in'
  items: QuoteItem[]
  memberCouponId?: number | null
  remark?: string
}

/** 下单报价：金额明细与可用优惠券（服务端计算，保证一致） */
export function quoteOrder(payload: {
  storeId: number
  orderType: 'takeout' | 'dine_in'
  items: QuoteItem[]
  memberCouponId?: number | null
  /** true 表示不使用优惠券 */
  withoutCoupon?: boolean
}): Promise<QuoteResult> {
  return apiFetch<QuoteResult>('/api/v1/orders/quote', { method: 'POST', data: payload })
}

/** 创建订单 */
export function createOrder(payload: CreateOrderPayload): Promise<MemberOrder> {
  return apiFetch<MemberOrder>('/api/v1/orders', { method: 'POST', data: payload })
}

/** 模拟支付 */
export function payOrder(id: number): Promise<MemberOrder> {
  return apiFetch<MemberOrder>(`/api/v1/orders/${id}/pay`, { method: 'POST' })
}

/** 取消订单（支付前） */
export function cancelOrder(id: number): Promise<MemberOrder> {
  return apiFetch<MemberOrder>(`/api/v1/orders/${id}/cancel`, { method: 'POST' })
}

/** 确认取餐 */
export function confirmOrder(id: number): Promise<MemberOrder> {
  return apiFetch<MemberOrder>(`/api/v1/orders/${id}/confirm`, { method: 'POST' })
}
