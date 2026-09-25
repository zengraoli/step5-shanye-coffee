import { readonly, ref } from 'vue'
import { fetchPromo, type PromoActivity } from '@/api/promo'
import { ApiError } from '@/api/client'

/** 当前活动（模块级单例，首页 / 点单 / 结算共用） */
const activity = ref<PromoActivity | null>(null)
const loaded = ref(false)

export function usePromo() {
  /** 拉取当前活动（已加载过则不重复请求） */
  const load = async (force = false): Promise<void> => {
    if (loaded.value && !force) {
      return
    }
    try {
      const state = await fetchPromo()
      activity.value = state.active ? state.activity : null
    } catch (err) {
      // 活动信息不影响主流程，失败时静默降级
      if (err instanceof ApiError) {
        activity.value = null
      }
    } finally {
      loaded.value = true
    }
  }

  return {
    activity: readonly(activity),
    /** 商品是否参与第二杯半价 */
    isPromoProduct: (productId: number) => activity.value?.productIds.includes(productId) ?? false,
    load,
  }
}
