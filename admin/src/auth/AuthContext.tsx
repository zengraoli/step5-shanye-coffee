import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  apiFetch,
  clearSession,
  getProfile,
  getToken,
  setSession,
  type AdminProfile,
} from '@/api/client'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  profile: AdminProfile | null
  /** 后台账号密码登录 */
  login: (username: string, password: string) => Promise<void>
  /** 退出登录 */
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** 登录态提供者：启动时校验本地 token，登录后写入会话 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      const token = getToken()
      if (!token) {
        if (!cancelled) {
          setStatus('anonymous')
        }
        return
      }
      try {
        const me = await apiFetch<AdminProfile>('/api/v1/admin/auth/me')
        if (cancelled) {
          return
        }
        setProfile(me)
        setSession(token, me)
        setStatus('authenticated')
      } catch {
        if (cancelled) {
          return
        }
        clearSession()
        setProfile(null)
        setStatus('anonymous')
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiFetch<{ token: string; admin: AdminProfile }>(
      '/api/v1/admin/auth/login',
      { method: 'POST', body: { username, password }, token: null },
    )
    setSession(result.token, result.admin)
    setProfile(result.admin)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setProfile(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, profile, login, logout }),
    [status, profile, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** 读取登录态 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用')
  }
  return context
}

/** 当前角色（未登录为 undefined） */
export function useRole(): AdminProfile['role'] | undefined {
  return useAuth().profile?.role
}

export { getProfile }
