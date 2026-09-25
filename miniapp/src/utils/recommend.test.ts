import { describe, expect, test } from 'vitest'
import { pickFeatured } from './recommend'
import type { Product } from '@/api/catalog'

function product(overrides: Partial<Product>): Product {
  return {
    id: 1,
    categoryId: 1,
    categoryName: '咖啡',
    name: '山野拿铁',
    subtitle: '',
    description: '',
    image: '',
    basePrice: 3200,
    onSale: true,
    soldOut: false,
    sort: 1,
    specs: [],
    ...overrides,
  }
}

const LIST: Product[] = [
  product({ id: 1, name: '山野拿铁', subtitle: '招牌' }),
  product({ id: 2, name: '琥珀美式', subtitle: '' }),
  product({ id: 3, name: '白桃乌龙气泡', subtitle: '气泡' }),
  product({ id: 4, name: '生椰丝绒拿铁', subtitle: '人气' }),
  product({ id: 5, name: '海盐焦糖玛奇朵', subtitle: '' }),
  product({ id: 6, name: '燕麦Dirty', subtitle: '限定' }),
]

describe('pickFeatured', () => {
  test('优先推荐带标签的商品', () => {
    // 带标签的排在前面，再按门店 id 轮换（门店 1 偏移 1 位）
    const result = pickFeatured(LIST, 1, 4)
    expect(result.map((item) => item.name)).toEqual([
      '生椰丝绒拿铁',
      '燕麦Dirty',
      '琥珀美式',
      '白桃乌龙气泡',
    ])
  })

  test('门店 0 / 无偏移时标签商品在最前', () => {
    const result = pickFeatured(LIST, 0, 3)
    expect(result.map((item) => item.name)).toEqual(['山野拿铁', '生椰丝绒拿铁', '燕麦Dirty'])
  })

  test('不同门店的推荐组合不同', () => {
    const store1 = pickFeatured(LIST, 1, 4).map((item) => item.name)
    const store2 = pickFeatured(LIST, 2, 4).map((item) => item.name)
    expect(store1).not.toEqual(store2)
  })

  test('数量不超过可选总数', () => {
    const short = LIST.slice(0, 2)
    const result = pickFeatured(short, 1, 4)
    expect(result.length).toBe(2)
  })

  test('空列表返回空数组', () => {
    expect(pickFeatured([], 1, 4)).toEqual([])
  })
})
