/** 第二杯半价活动：纯计算逻辑（无 IO，便于单元测试） */

export type PromoType = 'second_half'

export interface PromoActivity {
  id: number
  name: string
  type: PromoType
  status: 'active' | 'inactive'
  /** 活动开始时间（UTC ISO8601） */
  startAt: string
  /** 活动结束时间（UTC ISO8601） */
  endAt: string
  /** 适用商品 id 列表 */
  productIds: number[]
}

export interface PromoLine {
  productId: number
  unitPrice: number
  quantity: number
}

/**
 * 活动是否生效：已启用、在有效期内、且配置了适用商品。
 */
export function isPromoActive(activity: PromoActivity | null | undefined, now: Date = new Date()): boolean {
  if (!activity || activity.status !== 'active') {
    return false
  }
  if (activity.productIds.length === 0) {
    return false
  }
  const start = new Date(activity.startAt).getTime()
  const end = new Date(activity.endAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return false
  }
  const time = now.getTime()
  return time >= start && time <= end
}

/**
 * 第二杯半价优惠金额（分）。
 * 规则：同一订单中同一适用商品，第 2、4、6… 杯按半价计；
 * 半价单价为 `Math.floor(unitPrice / 2)`。
 * 同一商品多种规格时，先把该商品的所有杯按单价从高到低排序再计数，
 * 保证“半价的是更便宜的那杯”，优惠金额与加购顺序无关。
 */
export function secondHalfDiscountFen(lines: PromoLine[], productIds: Set<number> | number[]): number {
  const idSet = productIds instanceof Set ? productIds : new Set(productIds)
  if (idSet.size === 0) {
    return 0
  }
  // 按商品分组（保持行顺序）
  const byProduct = new Map<number, PromoLine[]>()
  for (const line of lines) {
    if (!idSet.has(line.productId)) {
      continue
    }
    const list = byProduct.get(line.productId)
    if (list) {
      list.push(line)
    } else {
      byProduct.set(line.productId, [line])
    }
  }
  let discount = 0
  for (const list of byProduct.values()) {
    // 展开成单杯，按单价从高到低排序：第 1、3、5… 杯原价，第 2、4、6… 杯半价
    const units: number[] = []
    for (const line of list) {
      for (let i = 0; i < line.quantity; i += 1) {
        units.push(line.unitPrice)
      }
    }
    units.sort((a, b) => b - a)
    units.forEach((price, index) => {
      // index 从 0 开始，偶数位是“第 1、3… 杯”
      if (index % 2 === 1) {
        discount += Math.floor(price / 2)
      }
    })
  }
  return discount
}

/** 某商品当前是否参与活动 */
export function isPromoProduct(productId: number, activity: PromoActivity | null | undefined, now: Date = new Date()): boolean {
  if (!isPromoActive(activity, now)) {
    return false
  }
  return activity!.productIds.includes(productId)
}
