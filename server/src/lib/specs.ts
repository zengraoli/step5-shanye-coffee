/**
 * 商品规格定义。大杯加价 3 元（300 分），温度与糖度不加价。
 * 规格为全局固定选项，前端点单与后端计价共用。
 */
export interface SpecOption {
  value: string
  label: string
  /** 加价，单位：分 */
  extra: number
}

export interface SpecGroup {
  key: string
  label: string
  options: SpecOption[]
}

export const SPEC_GROUPS: SpecGroup[] = [
  {
    key: 'cup',
    label: '杯型',
    options: [
      { value: 'medium', label: '中杯', extra: 0 },
      { value: 'large', label: '大杯', extra: 300 },
    ],
  },
  {
    key: 'temp',
    label: '温度',
    options: [
      { value: 'ice', label: '冰', extra: 0 },
      { value: 'hot', label: '热', extra: 0 },
    ],
  },
  {
    key: 'sugar',
    label: '糖度',
    options: [
      { value: 'none', label: '无糖', extra: 0 },
      { value: 'less', label: '少糖', extra: 0 },
      { value: 'standard', label: '标准糖', extra: 0 },
    ],
  },
]

export type SpecSelection = Record<string, string>

/** 校验规格选择是否合法 */
export function isValidSpec(spec: SpecSelection): boolean {
  for (const group of SPEC_GROUPS) {
    const value = spec[group.key]
    if (!value || !group.options.some((option) => option.value === value)) {
      return false
    }
  }
  return true
}

/** 根据规格计算加价（分） */
export function specExtra(spec: SpecSelection): number {
  let extra = 0
  for (const group of SPEC_GROUPS) {
    const value = spec[group.key]
    const option = group.options.find((item) => item.value === value)
    if (option) {
      extra += option.extra
    }
  }
  return extra
}

/** 规格的可读文案，如“大杯 / 冰 / 少糖” */
export function specLabel(spec: SpecSelection): string {
  const parts: string[] = []
  for (const group of SPEC_GROUPS) {
    const value = spec[group.key]
    const option = group.options.find((item) => item.value === value)
    if (option) {
      parts.push(option.label)
    }
  }
  return parts.join(' / ')
}
