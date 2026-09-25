import type { Db } from '../db/index.js'
import { fail } from '../lib/errors.js'
import { isValidSpec, specExtra, specLabel } from '../lib/specs.js'

export interface CartItemInput {
  productId: number
  spec: Record<string, string>
  quantity: number
}

export interface PricedLine {
  productId: number
  productName: string
  spec: Record<string, string>
  specText: string
  unitPrice: number
  quantity: number
  amount: number
}

export interface PriceResult {
  lines: PricedLine[]
  totalFen: number
}

/**
 * 购物车计价：校验商品在售、未售罄、规格合法，计算每行小计与总原价（分）。
 */
export function priceCart(db: Db, items: CartItemInput[]): PriceResult {
  if (!Array.isArray(items) || items.length === 0) {
    fail('ORDER_EMPTY')
  }
  const lines: PricedLine[] = []
  let totalFen = 0
  for (const item of items) {
    const productId = Number(item?.productId)
    if (!Number.isInteger(productId) || productId <= 0) {
      fail('BAD_REQUEST', '商品 id 不合法')
    }
    const quantity = Number(item?.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      fail('BAD_REQUEST', '商品数量必须为 1-99 的整数')
    }
    const spec = (item?.spec ?? {}) as Record<string, string>
    if (!isValidSpec(spec)) {
      fail('BAD_REQUEST', '商品规格不完整或不合法')
    }
    const product = db
      .prepare('SELECT id, name, base_price, on_sale, sold_out FROM products WHERE id = ?')
      .get(productId) as unknown as
      | { id: number; name: string; base_price: number; on_sale: number; sold_out: number }
      | undefined
    if (!product) {
      fail('PRODUCT_NOT_FOUND', `商品 ${productId} 不存在`)
    }
    if (product.on_sale !== 1) {
      fail('PRODUCT_OFF_SALE', `${product.name} 已下架`)
    }
    if (product.sold_out === 1) {
      fail('PRODUCT_SOLD_OUT', `${product.name} 已售罄`)
    }
    const unitPrice = product.base_price + specExtra(spec)
    const amount = unitPrice * quantity
    lines.push({
      productId: product.id,
      productName: product.name,
      spec,
      specText: specLabel(spec),
      unitPrice,
      quantity,
      amount,
    })
    totalFen += amount
  }
  return { lines, totalFen }
}
