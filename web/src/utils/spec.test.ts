import { describe, expect, test } from 'vitest'
import type { SpecGroup } from '@/api/catalog'
import {
  cupUpchargeFen,
  findCupGroup,
  formatSpecOptions,
  hasCupUpcharge,
} from './spec'
import { formatMoney } from './format'

/** 饮品：杯型含大杯加价 + 温度 + 糖度 */
const DRINK_SPECS: SpecGroup[] = [
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

/** 轻食 / 周边：无规格组 */
const NO_SPECS: SpecGroup[] = []

/** 只有温度 / 糖度（无杯型） */
const NO_CUP_SPECS: SpecGroup[] = DRINK_SPECS.filter((group) => group.key !== 'cup')

describe('规格角标显示条件', () => {
  test('饮品：规格含 cup 且大杯加价 → 展示角标', () => {
    expect(hasCupUpcharge(DRINK_SPECS)).toBe(true)
    expect(cupUpchargeFen(DRINK_SPECS)).toBe(300)
    expect(findCupGroup(DRINK_SPECS)?.label).toBe('杯型')
  })

  test('轻食 / 周边：specs 为空数组 → 不展示角标', () => {
    expect(hasCupUpcharge(NO_SPECS)).toBe(false)
    expect(cupUpchargeFen(NO_SPECS)).toBe(0)
    expect(findCupGroup(NO_SPECS)).toBeUndefined()
  })

  test('没有杯型规格组 → 不展示角标', () => {
    expect(hasCupUpcharge(NO_CUP_SPECS)).toBe(false)
    expect(cupUpchargeFen(NO_CUP_SPECS)).toBe(0)
  })

  test('杯型全部不加价 → 不展示角标', () => {
    const samePrice: SpecGroup[] = [
      {
        key: 'cup',
        label: '杯型',
        options: [
          { value: 'medium', label: '中杯', extra: 0 },
          { value: 'large', label: '大杯', extra: 0 },
        ],
      },
    ]
    expect(hasCupUpcharge(samePrice)).toBe(false)
    expect(cupUpchargeFen(samePrice)).toBe(0)
  })

  test('多个加价格式时取最大加价', () => {
    const multi: SpecGroup[] = [
      {
        key: 'cup',
        label: '杯型',
        options: [
          { value: 'medium', label: '中杯', extra: 0 },
          { value: 'large', label: '大杯', extra: 300 },
          { value: 'xl', label: '超大杯', extra: 600 },
        ],
      },
    ]
    expect(cupUpchargeFen(multi)).toBe(600)
    expect(hasCupUpcharge(multi)).toBe(true)
  })

  test('specs 为 null / undefined 时安全降级', () => {
    expect(hasCupUpcharge(null)).toBe(false)
    expect(hasCupUpcharge(undefined)).toBe(false)
    expect(cupUpchargeFen(undefined)).toBe(0)
  })
})

describe('规格说明文案', () => {
  test('加价格式带金额，普通选项不带', () => {
    expect(formatSpecOptions(DRINK_SPECS[0]!, formatMoney)).toBe('中杯 / 大杯（+¥3.00）')
    expect(formatSpecOptions(DRINK_SPECS[1]!, formatMoney)).toBe('冰 / 热')
    expect(formatSpecOptions(DRINK_SPECS[2]!, formatMoney)).toBe('无糖 / 少糖 / 标准糖')
  })
})
