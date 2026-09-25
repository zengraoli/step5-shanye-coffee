import { reactive, readonly } from 'vue'
import {
  clearSession,
  getStoredProfile,
  getToken,
  setSession,
  type MemberProfile,
} from '@/api/client'
import { fetchMemberMe, memberLogin } from '@/api/member'

/** 模块级共享的登录态（整个应用单一实例） */
const state = reactive<{
  profile: MemberProfile | null
  /** 是否已完成首次 token 校验 */
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
    state.profile = result.member
    return result.member
  }

  /** 退出登录 */
  const logout = (): void => {
    clearSession()
    state.profile = null
  }

  /** 用本地 token 拉取最新资料（启动时或刷新后调用） */
  const refresh = async (): Promise<void> => {
    if (!getToken()) {
      state.ready = true
      return
    }
    try {
      const profile = await fetchMemberMe()
      state.profile = profile
      const token = getToken()
      if (token) {
        setSession(token, profile)
      }
    } catch {
      clearSession()
      state.profile = null
    } finally {
      state.ready = true
    }
  }

  return {
    state: readonly(state),
    isLoggedIn: () => state.profile !== null,
    login,
    logout,
    refresh,
  }
}
