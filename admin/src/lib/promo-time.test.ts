import { describe, expect, test } from 'vitest'
import { isoToLocalInput, localInputToIso, promoPhase } from './promo-time'

describe('活动时间转换', () => {
  test('UTC ISO8601 → 北京时间输入值', () => {
    expect(isoToLocalInput('2026-09-01T00:00:00.000Z')).toBe('2026-09-01T08:00')
    expect(isoToLocalInput('2026-09-26T16:05:00.000Z')).toBe('2026-09-27T00:05')
    expect(isoToLocalInput(null)).toBe('')
    expect(isoToLocalInput('bad')).toBe('')
  })

  test('北京时间输入值 → UTC ISO8601', () => {
    expect(localInputToIso('2026-09-01T08:00')).toBe('2026-09-01T00:00:00.000Z')
    expect(localInputToIso('2026-09-27T00:05')).toBe('2026-09-26T16:05:00.000Z')
    expect(localInputToIso('')).toBeNull()
    expect(localInputToIso('bad')).toBeNull()
  })

  test('往返转换保持一致', () => {
    const iso = '2026-09-26T16:05:00.000Z'
    expect(localInputToIso(isoToLocalInput(iso))).toBe(iso)
  })
})

describe('活动状态', () => {
  const base = { status: 'active' as const, startAt: '2026-09-01T00:00:00.000Z', endAt: '2026-12-31T23:59:59.000Z' }
  test('按当前时间判断', () => {
    expect(promoPhase(base, new Date('2026-09-26T00:00:00.000Z')).key).toBe('running')
    expect(promoPhase(base, new Date('2026-08-01T00:00:00.000Z')).key).toBe('pending')
    expect(promoPhase(base, new Date('2027-01-02T00:00:00.000Z')).key).toBe('ended')
    expect(promoPhase({ ...base, status: 'inactive' }, new Date('2026-09-26T00:00:00.000Z')).key).toBe('inactive')
    expect(promoPhase(null).text).toBe('未配置')
  })
})
