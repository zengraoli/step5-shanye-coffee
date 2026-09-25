import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/config'
import type { CartItem } from '@/utils/cart'
import { addToCart, cartCount, cartTotalFen, setQuantity } from '@/utils/cart'

/** 购物车（模块级单例，跨页面共享，切店不清空） */
const items = ref<CartItem[]>(readStoredItems())

function readStoredItems(): CartItem[] {
  const raw = uni.getStorageSync(STORAGE_KEYS.cart)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(): void {
  uni.setStorageSync(STORAGE_KEYS.cart, JSON.stringify(items.value))
}

export function useCart() {
  const add = (incoming: CartItem): void => {
    items.value = addToCart(items.value, incoming)
    persist()
  }

  const updateQuantity = (index: number, quantity: number): void => {
    items.value = setQuantity(items.value, index, quantity)
    persist()
  }

  const clear = (): void => {
    items.value = []
    persist()
  }

  return {
    items,
    count: computed(() => cartCount(items.value)),
    totalFen: computed(() => cartTotalFen(items.value)),
    add,
    updateQuantity,
    clear,
  }
}
