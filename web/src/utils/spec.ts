/** 商品规格展示辅助：卡片角标与详情页规格说明共用 */

import type { SpecGroup } from '@/api/catalog'

/** 杯型规格组的 key */
export const CUP_SPEC_KEY = 'cup'

/** 取出杯型规格组（轻食 / 周边等无规格商品返回 undefined） */
export function findCupGroup(specs: SpecGroup[] | null | undefined): SpecGroup | undefined {
  return (specs ?? []).find((group) => group.key === CUP_SPEC_KEY)
}

/** 杯型中的最大加价（分）；无加价或没有杯型时返回 0 */
export function cupUpchargeFen(specs: SpecGroup[] | null | undefined): number {
  const cup = findCupGroup(specs)
  if (!cup) {
    return 0
  }
  return cup.options.reduce(
    (max, option) => Math.max(max, Number.isFinite(option.extra) ? option.extra : 0),
    0,
  )
}

/** 是否展示“大杯 +¥x.xx”角标：规格含杯型且存在加价格式（轻食 / 周边不标） */
export function hasCupUpcharge(specs: SpecGroup[] | null | undefined): boolean {
  return cupUpchargeFen(specs) > 0
}

/** 规格组的中文说明文案，如 “中杯 / 大杯（+¥3.00）、冰 / 热” */
export function formatSpecOptions(group: SpecGroup, formatMoney: (fen: number) => string): string {
  return group.options
    .map((option) => (option.extra > 0 ? `${option.label}（+${formatMoney(option.extra)}）` : option.label))
    .join(' / ')
}
