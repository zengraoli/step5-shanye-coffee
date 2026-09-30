import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProductDetailPage from './ProductDetailPage.vue'
import type { Product } from '@/api/catalog'

const LATTE: Product = {
  id: 1,
  categoryId: 1,
  categoryName: '咖啡',
  name: '山野拿铁',
  subtitle: '招牌',
  description: '云南SOE浓缩与冷藏鲜奶的柔和平衡。',
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
      key: 'sugar',
      label: '糖度',
      options: [
        { value: 'none', label: '无糖', extra: 0 },
        { value: 'less', label: '少糖', extra: 0 },
      ],
    },
  ],
}

const CROISSANT: Product = {
  ...LATTE,
  id: 13,
  categoryId: 3,
  categoryName: '轻食',
  name: '海盐芝士可颂',
  subtitle: '现烤',
  basePrice: 1800,
  specs: [],
}

const PROMO = {
  active: true,
  activity: {
    id: 1,
    name: '第二杯半价',
    type: 'second_half' as const,
    status: 'active' as const,
    startAt: '2026-09-01T00:00:00.000Z',
    endAt: '2026-12-31T23:59:59.000Z',
    productIds: [1],
  },
}

const fetchProduct = vi.fn(async (id: number) => (id === 13 ? CROISSANT : LATTE))
const fetchPromo = vi.fn(async () => PROMO)

vi.mock('@/api/catalog', () => ({
  fetchProduct: (id: number) => fetchProduct(id),
}))

vi.mock('@/api/promo', () => ({
  fetchPromo: () => fetchPromo(),
}))

async function mountPage(id = 1) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/menu', component: { template: '<div />' } },
      { path: '/product/:id', name: 'product', component: { template: '<div />' } },
    ],
  })
  await router.push(`/product/${id}`)
  await router.isReady()
  return mount(ProductDetailPage, { global: { plugins: [router] } })
}

beforeEach(() => {
  fetchProduct.mockClear()
  fetchPromo.mockClear()
})

describe('ProductDetailPage', () => {
  test('展示插画、名称、副标题、描述、价格与规格说明', async () => {
    const wrapper = await mountPage(1)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('山野拿铁')
    expect(text).toContain('招牌')
    expect(text).toContain('云南SOE浓缩与冷藏鲜奶的柔和平衡。')
    expect(text).toContain('¥32.00')
    expect(text).toContain('杯型')
    expect(text).toContain('中杯 / 大杯（+¥3.00）')
    expect(text).toContain('糖度')
    expect(text).toContain('无糖 / 少糖')
    expect(text).toContain('有货')
  })

  test('活动商品展示第二杯半价角标', async () => {
    const wrapper = await mountPage(1)
    await flushPromises()
    expect(wrapper.find('.product-detail__promo').text()).toBe('第二杯半价')
  })

  test('非活动商品不展示半价角标', async () => {
    const wrapper = await mountPage(13)
    await flushPromises()
    expect(wrapper.find('.product-detail__promo').exists()).toBe(false)
  })

  test('轻食 / 周边：无规格时给出说明文案', async () => {
    const wrapper = await mountPage(13)
    await flushPromises()
    expect(wrapper.text()).toContain('该商品无需选择规格（轻食 / 周边类），按标价直接购买。')
    expect(wrapper.find('.product-detail__spec-list').exists()).toBe(false)
  })

  test('售罄商品展示遮罩与提示', async () => {
    fetchProduct.mockImplementationOnce(async () => ({ ...LATTE, soldOut: true }) as Product)
    const wrapper = await mountPage(1)
    await flushPromises()
    expect(wrapper.find('.product-detail__mask').text()).toBe('已售罄')
    expect(wrapper.text()).toContain('该商品当前门店已售罄，可先浏览其他商品。')
  })

  test('下架商品给出下架提示', async () => {
    fetchProduct.mockImplementationOnce(async () => ({ ...LATTE, onSale: false }) as Product)
    const wrapper = await mountPage(1)
    await flushPromises()
    expect(wrapper.text()).toContain('该商品已下架，去看看其他饮品吧。')
  })

  test('接口错误时展示中文错误', async () => {
    fetchProduct.mockImplementationOnce(async () => {
      throw new Error('商品加载失败，请稍后重试')
    })
    const wrapper = await mountPage(1)
    await flushPromises()
    expect(wrapper.text()).toContain('商品加载失败，请稍后重试')
  })
})
