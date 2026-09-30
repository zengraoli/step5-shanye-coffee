import { readonly, ref } from 'vue'
import {
  clearSession,
  getStoredProfile,
  getToken,
  setSession,
  type MemberProfile,
} from '@/api/client'
import { fetchMemberMe, memberLogin, sendSmsCode } from '@/api/member'

/** 会员登录态（模块级单例，整个应用共享） */
const state = ref<{
  profile: MemberProfile | null
  ready: boolean
}>({
  profile: getStoredProfile(),
  ready: false,
})

export function useAuth() {
  /** 手机号 + 验证码登录 */
  const login = async (phone: string, code: string): Promise<MemberProfile> => {
    const result = await memberLogin(phone, code)
    setSession(result.token, result.member)
    state.value.profile = result.member
    return result.member
  }

  /** 退出登录 */
  const logout = (): void => {
    clearSession()
    state.value.profile = null
  }

  /** 用本地 token 拉取最新资料 */
  const refresh = async (): Promise<void> => {
    if (!getToken()) {
      state.value.ready = true
      return
    }
    try {
      const profile = await fetchMemberMe()
      state.value.profile = profile
    } catch {
      clearSession()
      state.value.profile = null
    } finally {
      state.value.ready = true
    }
  }

  /** 发送验证码（演示环境固定 123456） */
  const sendCode = (phone: string): Promise<string> => {
    return sendSmsCode(phone).then((result) => result.code)
  }

  /** 用服务端返回的最新资料刷新本地登录态（如支付后的积分） */
  const updateProfile = (profile: MemberProfile): void => {
    const token = getToken()
    if (!token) {
      return
    }
    setSession(token, profile)
  }

  return {
    state: readonly(state),
    isLoggedIn: () => state.value.profile !== null,
    login,
    logout,
    refresh,
    sendCode,
    updateProfile,
  }
}
