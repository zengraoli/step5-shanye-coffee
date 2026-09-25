import { describe, expect, test } from 'vitest'
import { formatBeijingDate, formatBeijingTime, formatMoney } from './format'

describe('金额格式化', () => {
  test('整数分格式化为 ¥xx.xx', () => {
    expect(formatMoney(0)).toBe('¥0.00')
    expect(formatMoney(5)).toBe('¥0.05')
    expect(formatMoney(3200)).toBe('¥32.00')
    expect(formatMoney(6999)).toBe('¥69.99')
    expect(formatMoney(123456)).toBe('¥1234.56')
    expect(formatMoney(-500)).toBe('-¥5.00')
    expect(formatMoney(Number.NaN)).toBe('¥0.00')
  })
})

describe('时间格式化', () => {
  test('UTC ISO8601 转北京时间', () => {
    expect(formatBeijingTime('2026-09-26T10:30:00.000Z')).toBe('2026-09-26 18:30')
    expect(formatBeijingTime('2026-09-26T16:05:00.000Z')).toBe('2026-09-27 00:05')
    expect(formatBeijingDate('2026-09-26T16:05:00.000Z')).toBe('2026-09-27')
    expect(formatBeijingTime(null)).toBe('-')
    expect(formatBeijingTime('bad')).toBe('-')
  })
})
