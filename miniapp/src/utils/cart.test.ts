import { describe, expect, test } from 'vitest'
import {
  addToCart,
  buildCartItem,
  cartCount,
  cartTotalFen,
  lineAmount,
  sameLine,
  setQuantity,
  type CartItem,
} from './cart'

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 1,
    productName: '山野拿铁',
    categoryName: '咖啡',
    spec: { cup: 'medium', temp: 'ice', sugar: 'less' },
    specText: '中杯 / 冰 / 少糖',
    unitPrice: 3200,
    quantity: 1,
    ...overrides,
  }
}

describe('购物车计算', () => {
  test('规格加价计入单价（大杯 +300 分）', () => {
    const large = buildCartItem({
      productId: 1,
      productName: '山野拿铁',
      categoryName: '咖啡',
      basePrice: 3200,
      spec: { cup: 'large', temp: 'ice', sugar: 'less' },
      specText: '大杯 / 冰 / 少糖',
      quantity: 1,
    })
    expect(large.unitPrice).toBe(3500)
    expect(lineAmount(large)).toBe(3500)

    const medium = buildCartItem({
      productId: 1,
      productName: '山野拿铁',
      categoryName: '咖啡',
      basePrice: 3200,
      spec: { cup: 'medium', temp: 'hot', sugar: 'none' },
      specText: '中杯 / 热 / 无糖',
      quantity: 2,
    })
    expect(medium.unitPrice).toBe(3200)
    expect(lineAmount(medium)).toBe(6400)
  })

  test('同商品同规格合并，不同规格分行', () => {
    let cart: CartItem[] = []
    cart = addToCart(cart, item())
    cart = addToCart(cart, item({ quantity: 2 }))
    expect(cart.length).toBe(1)
    expect(cart[0]!.quantity).toBe(3)

    cart = addToCart(cart, item({ spec: { cup: 'large', temp: 'ice', sugar: 'less' }, unitPrice: 3500 }))
    expect(cart.length).toBe(2)
  })

  test('同一商品不同规格不算同一行', () => {
    const a = item()
    const b = item({ spec: { cup: 'large', temp: 'ice', sugar: 'less' } })
    expect(sameLine(a, b)).toBe(false)
    expect(sameLine(a, item())).toBe(true)
  })

  test('总件数与总金额', () => {
    const cart = [
      item({ quantity: 2, unitPrice: 3500 }),
      item({ productId: 2, productName: '琥珀美式', unitPrice: 2800, quantity: 1 }),
    ]
    expect(cartCount(cart)).toBe(3)
    expect(cartTotalFen(cart)).toBe(9800)
  })

  test('修改数量与移除', () => {
    let cart = [item(), item({ productId: 2, unitPrice: 2800 })]
    cart = setQuantity(cart, 0, 5)
    expect(cart[0]!.quantity).toBe(5)
    cart = setQuantity(cart, 0, 0)
    expect(cart.length).toBe(1)
    expect(cart[0]!.productId).toBe(2)
    // 越界索引不变
    expect(setQuantity(cart, 9, 3)).toEqual(cart)
  })

  test('数量上限 99', () => {
    let cart = addToCart([], item({ quantity: 98 }))
    cart = addToCart(cart, item({ quantity: 5 }))
    expect(cart[0]!.quantity).toBe(99)
  })
})
