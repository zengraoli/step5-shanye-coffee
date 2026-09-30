import { reactive, readonly } from 'vue'
import {
  ApiError,
  clearSession,
  getStoredProfile,
  getToken,
  setSession,
  UNAUTHORIZED_CODE,
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

/** 导出可变状态，便于测试与调试 */
export const authState = state

/** 刷新失败的原因分类 */
export type AuthFailureKind = 'auth' | 'network'

/** 登录态刷新的失败信息：区分“认证失败”与“网络 / 服务不可用” */
export class AuthRefreshError extends Error {
  readonly kind: AuthFailureKind

  constructor(kind: AuthFailureKind, message: string) {
    super(message)
    this.name = 'AuthRefreshError'
    this.kind = kind
  }
}

/** 判断错误是否为“登录态失效”（HTTP 401 或业务码 10002） */
export function isAuthFailure(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 401 || err.code === UNAUTHORIZED_CODE
  }
  return false
}

/** 把任意错误归类为登录态刷新失败 */
export function toAuthRefreshError(err: unknown): AuthRefreshError {
  if (err instanceof AuthRefreshError) {
    return err
  }
  const message = err instanceof Error ? err.message : '加载失败，请稍后重试'
  return new AuthRefreshError(isAuthFailure(err) ? 'auth' : 'network', message)
}

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

  /**
   * 用本地 token 拉取最新资料（启动时或刷新后调用）。
   * 仅“认证失败”才清除登录态；“网络 / 服务不可用”保留登录态并把错误抛给页面，
   * 由页面提示重试，避免服务挂掉就被登出。
   */
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
    } catch (err) {
      if (isAuthFailure(err)) {
        clearSession()
        state.profile = null
      }
      throw toAuthRefreshError(err)
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
