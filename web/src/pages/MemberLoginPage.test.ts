import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import MemberLoginPage from './MemberLoginPage.vue'
import { clearSession, type MemberProfile } from '@/api/client'
import { ApiError } from '@/api/client'

const PROFILE: MemberProfile = {
  id: 1,
  phone: '13812345678',
  maskedPhone: '138****5678',
  nickname: '咖啡友5678',
  points: 560,
  level: 'gold',
  levelText: '金卡',
  nextLevel: 'black',
  nextLevelText: '黑卡',
  pointsToNextLevel: 1440,
  createdAt: '2026-09-20T02:00:00.000Z',
}

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(typeof input === 'string' ? input : (input as Request).url)
  const ok = (data: unknown) =>
    new Response(JSON.stringify({ code: 0, data, message: 'ok' }), {
      headers: { 'content-type': 'application/json' },
    })
  const err = (code: number, message: string) =>
    new Response(JSON.stringify({ code, data: null, message }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  if (url.includes('/api/v1/auth/login')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (body.code && body.code !== '123456') {
      return err(10005, '验证码错误或已过期')
    }
    return ok({ token: 'mock-token', member: PROFILE })
  }
  if (url.includes('/api/v1/auth/sms-code')) {
    return ok({ phone: '13812345678', code: '123456', message: '演示环境验证码固定为 123456' })
  }
  return ok(null)
})

function mountPage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return { wrapper: mount(MemberLoginPage, { global: { plugins: [router] } }), router }
}

beforeEach(() => {
  clearSession()
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

describe('MemberLoginPage', () => {
  test('渲染登录表单', () => {
    const { wrapper } = mountPage()
    expect(wrapper.text()).toContain('会员登录')
    expect(wrapper.find('#phone').exists()).toBe(true)
    expect(wrapper.find('#code').exists()).toBe(true)
    expect(wrapper.text()).toContain('演示环境验证码固定为 123456')
  })

  test('手机号格式错误时提示', async () => {
    const { wrapper } = mountPage()
    await wrapper.find('#phone').setValue('12345')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('请输入正确的 11 位手机号')
  })

  test('获取验证码展示演示提示', async () => {
    const { wrapper } = mountPage()
    await wrapper.find('#phone').setValue('13812345678')
    await wrapper.find('.field__send').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('验证码已发送')
    expect(wrapper.text()).toContain('123456')
  })

  test('验证码错误时展示服务端中文错误', async () => {
    const { wrapper } = mountPage()
    await wrapper.find('#phone').setValue('13812345678')
    await wrapper.find('#code').setValue('000000')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('验证码错误或已过期')
  })

  test('登录成功后写入会话', async () => {
    const { wrapper } = mountPage()
    await wrapper.find('#phone').setValue('13812345678')
    await wrapper.find('#code').setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()
    expect(localStorage.getItem('shanye_member_token')).toBe('mock-token')
    const stored = JSON.parse(localStorage.getItem('shanye_member_profile') as string)
    expect(stored.nickname).toBe('咖啡友5678')
    expect(stored.levelText).toBe('金卡')
  })
})

describe('ApiError', () => {
  test('携带服务端中文 message 与错误码', () => {
    const error = new ApiError(400, { code: 30003, data: null, message: '商品已售罄' })
    expect(error.message).toBe('商品已售罄')
    expect(error.code).toBe(30003)
    expect(error.status).toBe(400)
  })
})
