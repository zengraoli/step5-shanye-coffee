/** 当季推荐挑选逻辑：官网首页复用 */

import type { Product } from '@/api/catalog'

/** 命中这些副标题关键词的商品视为“当季主推” */
const FEATURED_TAGS = ['招牌', '限定', '人气', '新品']

/** 官网首屏推荐位固定 6 个 */
export const FEATURED_LIMIT = 6

/** 取有货商品（过滤售罀），不足 6 个时用剩余有货商品补齐 */
export function pickFeatured(list: Product[]): Product[] {
  const inStock = list.filter((item) => !item.soldOut)
  const preferred = inStock.filter((item) =>
    FEATURED_TAGS.some((tag) => item.subtitle.includes(tag)),
  )
  const rest = inStock.filter((item) => !preferred.includes(item))
  return [...preferred, ...rest].slice(0, FEATURED_LIMIT)
}
