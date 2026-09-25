import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { reactive } from 'vue'
import AppHeader from './AppHeader.vue'
import { clearSession, type MemberProfile } from '@/api/client'

const PROFILE: MemberProfile = {
  id: 1,
  phone: '13812345678',
  maskedPhone: '138****5678',
  nickname: '咖啡友5678',
  points: 0,
  level: 'silver',
  levelText: '银卡',
  nextLevel: 'gold',
  nextLevelText: '金卡',
  pointsToNextLevel: 500,
  createdAt: '2026-09-26T02:00:00.000Z',
}

/** 模拟登录态 */
const authState = reactive<{ profile: MemberProfile | null; ready: boolean }>({
  profile: null,
  ready: true,
})

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    state: authState,
    isLoggedIn: () => authState.profile !== null,
    login: vi.fn(),
    logout: () => {
      authState.profile = null
    },
    refresh: vi.fn(),
  }),
}))

function mountHeader() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return mount(AppHeader, {
    global: { plugins: [router] },
  })
}

beforeEach(() => {
  authState.profile = null
  localStorage.clear()
})

describe('AppHeader', () => {
  test('渲染品牌标识与导航', () => {
    clearSession()
    const wrapper = mountHeader()
    expect(wrapper.text()).toContain('山野咖啡')
    for (const label of ['首页', '菜单', '门店', '品牌故事']) {
      expect(wrapper.text()).toContain(label)
    }
    // 未登录展示登录入口
    expect(wrapper.text()).toContain('会员登录')
  })

  test('登录后展示会员昵称', () => {
    authState.profile = PROFILE
    const wrapper = mountHeader()
    expect(wrapper.text()).toContain('咖啡友5678')
    expect(wrapper.text()).not.toContain('会员登录')
  })

  test('手机端菜单按钮可切换', async () => {
    const wrapper = mountHeader()
    const burger = wrapper.find('.site-header__burger')
    expect(burger.exists()).toBe(true)
    expect(wrapper.find('.site-header__mobile').exists()).toBe(false)
    await burger.trigger('click')
    expect(wrapper.find('.site-header__mobile').exists()).toBe(true)
  })
})
