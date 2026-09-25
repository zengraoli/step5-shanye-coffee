/** 规格定义：与 server 保持一致（大杯加 ¥3.00） */
import type { SpecGroup } from '@/api/catalog'

export type SpecSelection = Record<string, string>

/** 默认规格：中杯 / 冰 / 少糖 */
export const DEFAULT_SPEC: SpecSelection = {
  cup: 'medium',
  temp: 'ice',
  sugar: 'less',
}

/** 服务端下发的规格组（点单页直接用接口数据） */
export type { SpecGroup }

/** 根据规格计算加价（分） */
export function specExtra(spec: SpecSelection, groups?: SpecGroup[]): number {
  if (!groups) {
    // 未下发规格组时的兜底：仅大杯加价
    return spec.cup === 'large' ? 300 : 0
  }
  let extra = 0
  for (const group of groups) {
    const option = group.options.find((item) => item.value === spec[group.key])
    if (option) {
      extra += option.extra
    }
  }
  return extra
}

/** 规格的可读文案，如“大杯 / 冰 / 少糖” */
export function specText(spec: SpecSelection, groups?: SpecGroup[]): string {
  if (!groups) {
    const labels: Record<string, string> = { medium: '中杯', large: '大杯', ice: '冰', hot: '热', none: '无糖', less: '少糖', standard: '标准糖' }
    return Object.values(spec)
      .map((value) => labels[value] ?? value)
      .join(' / ')
  }
  const parts: string[] = []
  for (const group of groups) {
    const option = group.options.find((item) => item.value === spec[group.key])
    if (option) {
      parts.push(option.label)
    }
  }
  return parts.join(' / ')
}

/** 校验规格是否完整 */
export function isSpecComplete(spec: SpecSelection, groups?: SpecGroup[]): boolean {
  if (!groups) {
    return Boolean(spec.cup && spec.temp && spec.sugar)
  }
  return groups.every((group) => Boolean(spec[group.key]))
}
