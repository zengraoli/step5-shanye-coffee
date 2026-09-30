import { describe, expect, test } from 'vitest'
import type { Product } from '@/api/catalog'
import { pickFeatured } from './featured'

/** 测试用商品工厂 */
function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    categoryId: 1,
    categoryName: '咖啡',
    name: '山野拿铁',
    subtitle: '清爽',
    description: '云南SOE浓缩与冷藏鲜奶',
    image: '',
    basePrice: 3200,
    onSale: true,
    soldOut: false,
    sort: 1,
    specs: [],
    ...overrides,
  }
}

/** 4 个有货 + 2 个售罄，合计 6 个 */
function listWithTwoSoldOut(): Product[] {
  return [
    product({ id: 1, name: '山野拿铁', subtitle: '招牌' }),
    product({ id: 2, name: '琥珀美式', subtitle: '清爽' }),
    product({ id: 3, name: '生椰丝绒拿铁', subtitle: '人气', soldOut: true }),
    product({ id: 4, name: '海盐焦糖玛奇朵', subtitle: '香甜' }),
    product({ id: 5, name: '白桃乌龙气泡', subtitle: '气泡', soldOut: true }),
    product({ id: 6, name: '抹茶牛乳', subtitle: '无咖啡因' }),
  ]
}

describe('pickFeatured', () => {
  test('过滤售罀商品：结果不含已售罄商品', () => {
    const picked = pickFeatured(listWithTwoSoldOut())
    expect(picked).toHaveLength(4)
    expect(picked.every((item) => !item.soldOut)).toBe(true)
    expect(picked.map((item) => item.id)).toEqual([1, 2, 4, 6])
  })

  test('售罄不占用推荐位：有货商品补齐到 6 个', () => {
    const list = [
      product({ id: 1, name: '招牌拿铁', subtitle: '招牌' }),
      product({ id: 2, name: '售罄美式', subtitle: '清爽', soldOut: true }),
      product({ id: 3, name: '售罄手冲', subtitle: '单一产区', soldOut: true }),
      ...Array.from({ length: 5 }, (_, index) => product({ id: 10 + index, name: `补齐${index}`, subtitle: '清爽' })),
    ]
    const picked = pickFeatured(list)
    expect(picked).toHaveLength(6)
    expect(picked.map((item) => item.id)).toEqual([1, 10, 11, 12, 13, 14])
  })

  test('有货不足推荐位时返回全部有货', () => {
    const list = [
      product({ id: 1, subtitle: '招牌' }),
      product({ id: 2, subtitle: '清爽' }),
      product({ id: 3, subtitle: '香甜', soldOut: true }),
    ]
    expect(pickFeatured(list).map((item) => item.id)).toEqual([1, 2])
  })

  test('带推荐标签的有货商品排在前面', () => {
    const list = [
      product({ id: 1, subtitle: '清爽' }),
      product({ id: 2, subtitle: '人气' }),
      product({ id: 3, subtitle: '限定' }),
      product({ id: 4, subtitle: '香甜' }),
    ]
    expect(pickFeatured(list).map((item) => item.id)).toEqual([2, 3, 1, 4])
  })

  test('全部售罄时返回空列表', () => {
    const list = [
      product({ id: 1, subtitle: '招牌', soldOut: true }),
      product({ id: 2, subtitle: '人气', soldOut: true }),
    ]
    expect(pickFeatured(list)).toEqual([])
  })

  test('非咖啡分类同样生效（轻食 / 周边）', () => {
    const list: Product[] = [
      product({ id: 1, categoryId: 3, categoryName: '轻食', name: '可颂', subtitle: '现烤' }),
      product({ id: 2, categoryId: 4, categoryName: '周边', name: '随行杯', subtitle: '周边', soldOut: true }),
    ]
    expect(pickFeatured(list).map((item) => item.categoryName)).toEqual(['轻食'])
  })
})
