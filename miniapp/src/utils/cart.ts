/** 购物车纯逻辑（无 UI 依赖，便于单元测试） */
import { specExtra, type SpecSelection } from './specs'

export interface CartItem {
  productId: number
  productName: string
  categoryName: string
  spec: SpecSelection
  specText: string
  /** 单价（分）= 商品基础价 + 规格加价 */
  unitPrice: number
  quantity: number
}

/** 同一商品 + 同一规格视为同一行 */
export function sameLine(a: CartItem, b: { productId: number; spec: SpecSelection }): boolean {
  if (a.productId !== b.productId) {
    return false
  }
  const aKeys = Object.keys(a.spec)
  const bKeys = Object.keys(b.spec)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  return aKeys.every((key) => a.spec[key] === b.spec[key])
}

/** 计算一行的小计（分） */
export function lineAmount(item: CartItem): number {
  return item.unitPrice * item.quantity
}

/** 购物车总件数 */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/** 购物车总金额（分） */
export function cartTotalFen(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + lineAmount(item), 0)
}

/**
 * 加入购物车：同商品同规格合并数量，否则新增一行。
 * 返回新数组（不修改原数组）。
 */
export function addToCart(items: CartItem[], incoming: CartItem): CartItem[] {
  const index = items.findIndex((item) => sameLine(item, incoming))
  if (index === -1) {
    return [...items, { ...incoming }]
  }
  return items.map((item, i) =>
    i === index ? { ...item, quantity: Math.min(99, item.quantity + incoming.quantity) } : item,
  )
}

/** 修改某一行的数量（<=0 时移除该行） */
export function setQuantity(items: CartItem[], index: number, quantity: number): CartItem[] {
  if (index < 0 || index >= items.length) {
    return items
  }
  if (quantity <= 0) {
    return items.filter((_, i) => i !== index)
  }
  return items.map((item, i) => (i === index ? { ...item, quantity: Math.min(99, quantity) } : item))
}

/** 由商品信息与规格构造购物车行 */
export function buildCartItem(input: {
  productId: number
  productName: string
  categoryName: string
  basePrice: number
  spec: SpecSelection
  specText: string
  quantity: number
}): CartItem {
  return {
    productId: input.productId,
    productName: input.productName,
    categoryName: input.categoryName,
    spec: input.spec,
    specText: input.specText,
    unitPrice: input.basePrice + specExtra(input.spec),
    quantity: input.quantity,
  }
}
