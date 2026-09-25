import { readonly, ref } from 'vue'
import { STORAGE_KEYS } from '@/config'
import type { Store } from '@/api/catalog'

/** 当前门店（全局共享，选择后持久化到本地缓存） */
const currentStore = ref<Store | null>(readStoredStore())

function readStoredStore(): Store | null {
  const raw = uni.getStorageSync(STORAGE_KEYS.currentStore)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as Store
  } catch {
    return null
  }
}

export function useCurrentStore() {
  const select = (store: Store): void => {
    currentStore.value = store
    uni.setStorageSync(STORAGE_KEYS.currentStore, JSON.stringify(store))
  }

  return {
    currentStore: readonly(currentStore),
    select,
  }
}

/** 供测试与调试使用 */
export const _internal = { currentStore }
