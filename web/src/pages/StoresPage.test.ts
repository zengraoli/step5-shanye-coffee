import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import StoresPage from './StoresPage.vue'
import type { Store } from '@/api/catalog'

const STORES: Store[] = [
  {
    id: 1,
    name: '山野咖啡 · 望京店',
    address: '北京市朝阳区望京南湖东园一区 212 号',
    phone: '010-64781234',
    openTime: '08:00',
    closeTime: '22:00',
    status: 'open',
    statusText: '营业中',
  },
  {
    id: 2,
    name: '山野咖啡 · 三里屯店',
    address: '北京市朝阳区工人体育场北路 8 号院 3 号楼',
    phone: '010-64168899',
    openTime: '09:00',
    closeTime: '22:30',
    status: 'rest',
    statusText: '休息中',
  },
  {
    id: 3,
    name: '山野咖啡 · 五道口店',
    address: '北京市海淀区成府路 28 号购物中心 1 层',
    phone: '010-62341200',
    openTime: '08:30',
    closeTime: '21:30',
    status: 'open',
    statusText: '营业中',
  },
]

vi.mock('@/api/catalog', () => ({
  fetchStores: vi.fn(async () => STORES),
}))

function mountPage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return mount(StoresPage, { global: { plugins: [router] } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StoresPage', () => {
  test('渲染门店列表、营业状态与营业时间', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('门店网络')
    expect(text).toContain('山野咖啡 · 望京店')
    expect(text).toContain('山野咖啡 · 三里屯店')
    expect(text).toContain('山野咖啡 · 五道口店')
    expect(text).toContain('营业中')
    expect(text).toContain('休息中')
    expect(text).toContain('每日 08:00 - 22:00')
    expect(text).toContain('每日 09:00 - 22:30')
    expect(text).toContain('010-64781234')
    expect(text).toContain('北京市朝阳区望京南湖东园一区 212 号')
    // 休息中门店提示
    expect(text).toContain('休息中，可先浏览菜单')
  })

  test('接口错误时展示中文错误', async () => {
    const { fetchStores } = await import('@/api/catalog')
    vi.mocked(fetchStores).mockRejectedValueOnce(new Error('门店加载失败，请稍后重试'))
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('门店加载失败，请稍后重试')
  })
})
