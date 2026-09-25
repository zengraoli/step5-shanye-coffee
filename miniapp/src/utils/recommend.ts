/** 首页推荐逻辑：按门店轮换，保证切换门店后推荐内容有变化 */
import type { Product } from '@/api/catalog'

const PREFERRED_TAGS = ['招牌', '限定', '人气', '新品']

function isPreferred(product: Product): boolean {
  return PREFERRED_TAGS.some((tag) => product.subtitle.includes(tag))
}

/**
 * 挑选推荐商品：优先带“招牌 / 限定 / 人气 / 新品”标签的商品，
 * 再按门店 id 轮换起始位置，使不同门店的推荐组合有所差异。
 */
export function pickFeatured(list: Product[], storeId: number, count = 4): Product[] {
  const preferred = list.filter(isPreferred)
  const rest = list.filter((item) => !isPreferred(item))
  const ordered = [...preferred, ...rest]
  if (ordered.length === 0) {
    return []
  }
  const offset = ((storeId % ordered.length) + ordered.length) % ordered.length
  const rotated = [...ordered.slice(offset), ...ordered.slice(0, offset)]
  return rotated.slice(0, Math.min(count, rotated.length))
}
