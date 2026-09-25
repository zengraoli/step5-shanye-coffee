/** 优惠券纯计算逻辑（无 IO，便于单元测试） */

export type CouponType = 'full_reduction' | 'discount'

export interface CouponLike {
  id: number
  type: CouponType
  /** 使用门槛，单位分 */
  thresholdFen: number
  /** 满减券减免金额，单位分 */
  reduceFen: number
  /** 折扣券百分比，85 表示 8.5 折 */
  discountPercent: number
  /** 折扣券最高减免，单位分，0 表示不限 */
  maxReduceFen: number
  /** 有效期起（UTC ISO8601） */
  validFrom: string
  /** 有效期止（UTC ISO8601） */
  validTo: string
}

export function couponTypeText(type: CouponType): string {
  return type === 'full_reduction' ? '满减券' : '折扣券'
}

/** 是否在有效期内 */
export function isWithinValidity(coupon: CouponLike, now: Date = new Date()): boolean {
  const from = new Date(coupon.validFrom).getTime()
  const to = new Date(coupon.validTo).getTime()
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return false
  }
  const time = now.getTime()
  return time >= from && time <= to
}

/**
 * 计算优惠券在指定订单金额下的减免金额（分）。
 * 未达门槛或金额非正数时返回 0；减免不会超过订单金额。
 */
export function couponDiscountFen(coupon: CouponLike, totalFen: number): number {
  if (totalFen <= 0 || totalFen < coupon.thresholdFen) {
    return 0
  }
  let discount: number
  if (coupon.type === 'full_reduction') {
    discount = coupon.reduceFen
  } else {
    discount = Math.floor((totalFen * (100 - coupon.discountPercent)) / 100)
    if (coupon.maxReduceFen > 0) {
      discount = Math.min(discount, coupon.maxReduceFen)
    }
  }
  return Math.max(0, Math.min(discount, totalFen))
}

/**
 * 从候选券中挑选最优券：减免金额最大者胜；
 * 减免相同则有效期更早结束者胜（避免浪费临期券）；仍相同取 id 更小者。
 */
export function pickBestCoupon(
  coupons: CouponLike[],
  totalFen: number,
  now: Date = new Date(),
): CouponLike | null {
  let best: CouponLike | null = null
  let bestDiscount = 0
  for (const coupon of coupons) {
    if (!isWithinValidity(coupon, now)) {
      continue
    }
    const discount = couponDiscountFen(coupon, totalFen)
    if (discount <= 0) {
      continue
    }
    if (
      best === null ||
      discount > bestDiscount ||
      (discount === bestDiscount &&
        new Date(coupon.validTo).getTime() < new Date(best.validTo).getTime())
    ) {
      best = coupon
      bestDiscount = discount
    }
  }
  return best
}
