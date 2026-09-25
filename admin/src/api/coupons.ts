/** 后台优惠券管理接口 */
import { apiFetch } from './client'

export type CouponType = 'full_reduction' | 'discount'

export interface AdminCoupon {
  id: number
  name: string
  type: CouponType
  typeText: string
  thresholdFen: number
  reduceFen: number
  discountPercent: number
  maxReduceFen: number
  validDays: number
  total: number
  remaining: number
  status: 'active' | 'inactive'
  claimedCount?: number
}

export interface CouponPayload {
  name: string
  type: CouponType
  thresholdFen?: number
  reduceFen?: number
  discountPercent?: number
  maxReduceFen?: number
  validDays: number
  total?: number
}

/** 优惠券模板列表 */
export function fetchAdminCoupons(): Promise<AdminCoupon[]> {
  return apiFetch<AdminCoupon[]>('/api/v1/admin/coupons')
}

/** 新增优惠券模板 */
export function createCoupon(payload: CouponPayload): Promise<AdminCoupon> {
  return apiFetch<AdminCoupon>('/api/v1/admin/coupons', { method: 'POST', body: payload })
}

/** 编辑优惠券模板 */
export function updateCoupon(id: number, payload: Partial<CouponPayload>): Promise<AdminCoupon> {
  return apiFetch<AdminCoupon>(`/api/v1/admin/coupons/${id}`, { method: 'PUT', body: payload })
}

/** 停用 / 启用优惠券模板 */
export function updateCouponStatus(id: number, status: 'active' | 'inactive'): Promise<AdminCoupon> {
  return apiFetch<AdminCoupon>(`/api/v1/admin/coupons/${id}/status`, { method: 'PATCH', body: { status } })
}

/** 券规则描述（金额统一格式化为 ¥xx.xx） */
export function describeCoupon(coupon: AdminCoupon): string {
  const yuan = (fen: number): string => `¥${(fen / 100).toFixed(2)}`
  if (coupon.type === 'full_reduction') {
    return `满 ${yuan(coupon.thresholdFen)} 减 ${yuan(coupon.reduceFen)}`
  }
  const max = coupon.maxReduceFen > 0 ? `，最高减 ${yuan(coupon.maxReduceFen)}` : ''
  return `${(coupon.discountPercent / 10).toFixed(1)} 折（满 ${yuan(coupon.thresholdFen)} 可用${max}）`
}
