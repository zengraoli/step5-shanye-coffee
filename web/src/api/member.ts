/** 会员接口：登录、资料、积分、优惠券、订单 */
import { apiFetch, type MemberProfile } from './client'

export interface LoginResult {
  token: string
  member: MemberProfile
}

export interface MemberCoupon {
  id: number
  couponId: number
  name: string
  type: 'full_reduction' | 'discount'
  typeText: string
  thresholdFen: number
  reduceFen: number
  discountPercent: number
  maxReduceFen: number
  validFrom: string
  validTo: string
  status: 'unused' | 'used' | 'expired'
  statusText: string
  obtainedAt: string
  usedAt: string | null
}

export interface PointsLog {
  id: number
  change: number
  reason: string
  orderId: number | null
  createdAt: string
}

export interface PointsSummary {
  profile: MemberProfile
  totalEarned: number
  logs: PointsLog[]
}

export interface MemberOrderItem {
  productId: number
  productName: string
  specText: string
  unitPrice: number
  quantity: number
  amount: number
}

export interface MemberOrder {
  id: number
  orderNo: string
  storeId: number
  storeName: string
  orderType: 'takeout' | 'dine_in'
  orderTypeText: string
  status: 'pending_pay' | 'paid' | 'making' | 'pickable' | 'completed' | 'cancelled'
  statusText: string
  items: MemberOrderItem[]
  totalFen: number
  discountFen: number
  payFen: number
  coupon: { id: number; name: string; discountFen: number } | null
  pickupCode: string | null
  remark: string
  createdAt: string
  paidAt: string | null
  timeline: { status: string; statusText: string; time: string | null }[]
}

export interface OrderList {
  list: MemberOrder[]
  total: number
  page: number
  pageSize: number
}

/** 获取短信验证码（演示环境固定 123456） */
export function sendSmsCode(phone: string): Promise<{ phone: string; code: string; message: string }> {
  return apiFetch('/api/v1/auth/sms-code', { method: 'POST', body: { phone }, token: null })
}

/** 手机号 + 验证码登录 */
export function memberLogin(phone: string, code: string): Promise<LoginResult> {
  return apiFetch<LoginResult>('/api/v1/auth/login', { method: 'POST', body: { phone, code }, token: null })
}

/** 当前会员资料 */
export function fetchMemberMe(): Promise<MemberProfile> {
  return apiFetch<MemberProfile>('/api/v1/members/me')
}

/** 积分总览与明细 */
export function fetchPointsSummary(): Promise<PointsSummary> {
  return apiFetch<PointsSummary>('/api/v1/members/me/points')
}

/** 我的优惠券 */
export function fetchMemberCoupons(status?: 'unused' | 'used' | 'expired'): Promise<MemberCoupon[]> {
  const query = status ? `?status=${status}` : ''
  return apiFetch<MemberCoupon[]>(`/api/v1/members/me/coupons${query}`)
}

/** 我的订单 */
export function fetchMemberOrders(params: { status?: string; page?: number; pageSize?: number } = {}): Promise<OrderList> {
  const query = new URLSearchParams()
  if (params.status) {
    query.set('status', params.status)
  }
  query.set('page', String(params.page ?? 1))
  query.set('page_size', String(params.pageSize ?? 20))
  return apiFetch<OrderList>(`/api/v1/orders?${query.toString()}`)
}
