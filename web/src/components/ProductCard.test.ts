import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProductCard from './ProductCard.vue'
import type { Product } from '@/api/catalog'

function product(overrides: Partial<Product> = {}): Product {
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
      {
        key: 'temp',
        label: '温度',
        options: [
          { value: 'ice', label: '冰', extra: 0 },
          { value: 'hot', label: '热', extra: 0 },
        ],
      },
    ],
    ...overrides,
  }
}

function mountCard(target: Product) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/product/:id', name: 'product', component: { template: '<div />' } },
    ],
  })
  return mount(ProductCard, { props: { product: target }, global: { plugins: [router] } })
}

describe('ProductCard', () => {
  test('饮品：规格含杯型加价 → 展示“大杯 +¥3.00”角标', () => {
    const wrapper = mountCard(product())
    expect(wrapper.find('.product-card__specs').text()).toBe('大杯 +¥3.00')
  })

  test('轻食 / 周边：specs 为空数组 → 不展示杯型角标', () => {
    const wrapper = mountCard(product({ id: 13, categoryName: '轻食', name: '海盐芝士可颂', specs: [] }))
    expect(wrapper.find('.product-card__specs').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('大杯')
  })

  test('无杯型规格时不展示角标', () => {
    const specs = [
      {
        key: 'temp',
        label: '温度',
        options: [
          { value: 'ice', label: '冰', extra: 0 },
          { value: 'hot', label: '热', extra: 0 },
        ],
      },
    ]
    const wrapper = mountCard(product({ specs }))
    expect(wrapper.find('.product-card__specs').exists()).toBe(false)
  })

  test('杯型全部不加价时不展示角标', () => {
    const specs = [
      {
        key: 'cup',
        label: '杯型',
        options: [
          { value: 'medium', label: '中杯', extra: 0 },
          { value: 'large', label: '大杯', extra: 0 },
        ],
      },
    ]
    const wrapper = mountCard(product({ specs }))
    expect(wrapper.find('.product-card__specs').exists()).toBe(false)
  })

  test('整卡可点击，跳转对应商品详情', () => {
    const wrapper = mountCard(product({ id: 7, name: '生椰丝绒拿铁' }))
    const link = wrapper.find('.product-card__link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/product/7')
    expect(link.text()).toContain('生椰丝绒拿铁')
  })

  test('售罄商品展示遮罩', () => {
    const wrapper = mountCard(product({ soldOut: true }))
    expect(wrapper.find('.product-card__mask').text()).toBe('已售罄')
  })
})
