import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import MenuPage from './MenuPage.vue'
import type { Category, Product } from '@/api/catalog'

const CATEGORIES: Category[] = [
  { id: 1, name: '咖啡', sort: 1, productCount: 2 },
  { id: 2, name: '茶饮', sort: 2, productCount: 1 },
]

function product(overrides: Partial<Product>): Product {
  return {
    id: 1,
    categoryId: 1,
    categoryName: '咖啡',
    name: '山野拿铁',
    subtitle: '招牌',
    description: '云南SOE浓缩与冷藏鲜奶',
    image: '',
    basePrice: 3200,
    onSale: true,
    soldOut: false,
    sort: 1,
    specs: [
      {
        key: 'cup',
        label: '杯型',
        options: [
          { value: 'medium', label: '中杯', extra: 0 },
          { value: 'large', label: '大杯', extra: 300 },
        ],
      },
    ],
    ...overrides,
  }
}

const PRODUCTS: Product[] = [
  product({ id: 1, name: '山野拿铁', subtitle: '招牌', categoryId: 1, categoryName: '咖啡' }),
  product({ id: 2, name: '琥珀美式', subtitle: '清爽', basePrice: 2800, categoryId: 1, categoryName: '咖啡' }),
  product({
    id: 3,
    name: '白桃乌龙气泡',
    subtitle: '气泡',
    basePrice: 2800,
    categoryId: 2,
    categoryName: '茶饮',
    soldOut: true,
  }),
]

vi.mock('@/api/catalog', () => ({
  fetchCategories: vi.fn(async () => CATEGORIES),
  fetchProducts: vi.fn(async () => ({ list: PRODUCTS, total: 3, page: 1, pageSize: 60 })),
}))

vi.mock('@/api/promo', () => ({
  fetchPromo: vi.fn(async () => ({
    active: true,
    activity: {
      id: 1,
      name: '第二杯半价',
      type: 'second_half',
      status: 'active',
      startAt: '2026-09-01T00:00:00.000Z',
      endAt: '2026-12-31T23:59:59.000Z',
      productIds: [1],
    },
  })),
}))

function mountPage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return mount(MenuPage, { global: { plugins: [router] } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MenuPage', () => {
  test('渲染分类标签与全部商品', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('全部菜单')
    expect(text).toContain('咖啡')
    expect(text).toContain('茶饮')
    expect(text).toContain('山野拿铁')
    expect(text).toContain('琥珀美式')
    expect(text).toContain('白桃乌龙气泡')
    // 金额格式化
    expect(text).toContain('¥32.00')
    expect(text).toContain('¥28.00')
    // 售罄标记
    expect(text).toContain('已售罄')
    // 规格说明
    expect(text).toContain('+¥3.00')
  })

  test('展示第二杯半价活动标识', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('第二杯半价')
    expect(text).toContain('活动商品同单第 2、4… 杯半价')
    // 商品 1 参与活动，商品 2 不参与
    const cards = wrapper.findAll('.product-card')
    expect(cards[0]!.find('.product-card__promo').exists()).toBe(true)
    expect(cards[1]!.find('.product-card__promo').exists()).toBe(false)
  })

  test('点击分类后只显示该分类商品', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const tabs = wrapper.findAll('.menu-tabs__item')
    expect(tabs.length).toBe(3) // 全部 + 2 个分类
    // 点击“茶饮”
    await tabs[2]!.trigger('click')
    await flushPromises()
    const cards = wrapper.findAll('.product-card')
    expect(cards.length).toBe(1)
    expect(cards[0]!.text()).toContain('白桃乌龙气泡')
    // 分类计数
    expect(tabs[0]!.text()).toContain('3')
    expect(tabs[1]!.text()).toContain('2')
  })

  test('接口错误时展示中文错误', async () => {
    const { fetchProducts } = await import('@/api/catalog')
    vi.mocked(fetchProducts).mockRejectedValueOnce(new Error('菜单加载失败，请稍后重试'))
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('菜单加载失败，请稍后重试')
  })
})
