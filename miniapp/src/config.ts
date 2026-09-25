/** 全局配置：接口基地址可配置，默认 http://127.0.0.1:3000 */

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000'

/** 接口基地址（可用 VITE_API_BASE_URL 覆盖） */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL

/** 会员登录后本地存储的 key */
export const STORAGE_KEYS = {
  token: 'shanye_member_token',
  profile: 'shanye_member_profile',
  cart: 'shanye_cart',
  currentStore: 'shanye_current_store',
} as const
