import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  couponDiscountFen,
  isWithinValidity,
  pickBestCoupon,
  type CouponLike,
} from '../src/lib/coupon.js'

function fullReduction(overrides: Partial<CouponLike> = {}): CouponLike {
  return {
    id: 1,
    type: 'full_reduction',
    thresholdFen: 5000,
    reduceFen: 1000,
    discountPercent: 100,
    maxReduceFen: 0,
    validFrom: '2026-01-01T00:00:00.000Z',
    validTo: '2026-12-31T23:59:59.000Z',
    ...overrides,
  }
}

function discount(overrides: Partial<CouponLike> = {}): CouponLike {
  return {
    id: 2,
    type: 'discount',
    thresholdFen: 3000,
    reduceFen: 0,
    discountPercent: 85,
    maxReduceFen: 2000,
    validFrom: '2026-01-01T00:00:00.000Z',
    validTo: '2026-12-31T23:59:59.000Z',
    ...overrides,
  }
}

test('满减券：未达门槛减免为 0，达到门槛减免固定金额', () => {
  assert.equal(couponDiscountFen(fullReduction(), 4999), 0)
  assert.equal(couponDiscountFen(fullReduction(), 5000), 1000)
  assert.equal(couponDiscountFen(fullReduction(), 12000), 1000)
})

test('满减券：减免不会超过订单金额', () => {
  assert.equal(couponDiscountFen(fullReduction({ thresholdFen: 100, reduceFen: 1000 }), 500), 500)
})

test('折扣券：按百分比减免并受最高减免限制', () => {
  assert.equal(couponDiscountFen(discount(), 2999), 0)
  assert.equal(couponDiscountFen(discount(), 10000), 1500)
  // 20000 * 15% = 3000，超过最高减免 2000
  assert.equal(couponDiscountFen(discount(), 20000), 2000)
  // 向下取整：3333 * 15% = 499.95 → 499
  assert.equal(couponDiscountFen(discount(), 3333), 499)
})

test('有效期校验：边界与过期', () => {
  const now = new Date('2026-06-01T00:00:00.000Z')
  assert.ok(isWithinValidity(fullReduction(), now))
  assert.ok(!isWithinValidity(fullReduction({ validTo: '2026-05-31T23:59:59.000Z' }), now))
  assert.ok(!isWithinValidity(fullReduction({ validFrom: '2026-06-02T00:00:00.000Z' }), now))
  assert.ok(isWithinValidity(fullReduction({ validFrom: '2026-06-01T00:00:00.000Z' }), now))
  assert.ok(isWithinValidity(fullReduction({ validTo: '2026-06-01T00:00:00.000Z' }), now))
})

test('最优券：选择减免最大者', () => {
  const now = new Date('2026-06-01T00:00:00.000Z')
  // 7000 元订单：满减减 1000，8.5 折减 1050 → 折扣券更优
  const best = pickBestCoupon([fullReduction(), discount()], 7000, now)
  assert.ok(best)
  assert.equal(best?.id, 2)
  assert.equal(best?.type, 'discount')

  // 4000 元订单：满减不可用（未达 5000 门槛），折扣减 600
  const best2 = pickBestCoupon([fullReduction(), discount()], 4000, now)
  assert.equal(best2?.id, 2)
  assert.equal(couponDiscountFen(best2 as CouponLike, 4000), 600)

  // 10000 元订单：满减 1000，折扣 1500 → 折扣券
  const best3 = pickBestCoupon([fullReduction(), discount()], 10000, now)
  assert.equal(best3?.id, 2)
})

test('最优券：减免相同时优先临期券', () => {
  const now = new Date('2026-06-01T00:00:00.000Z')
  const later = fullReduction({ id: 10, validTo: '2026-12-01T00:00:00.000Z' })
  const sooner = fullReduction({ id: 11, validTo: '2026-07-01T00:00:00.000Z' })
  const best = pickBestCoupon([later, sooner], 6000, now)
  assert.equal(best?.id, 11)
})

test('最优券：过期券与不可用券被忽略', () => {
  const now = new Date('2026-06-01T00:00:00.000Z')
  const expired = fullReduction({ validTo: '2026-05-01T00:00:00.000Z' })
  const notStarted = discount({ validFrom: '2026-07-01T00:00:00.000Z' })
  const tooSmall = fullReduction({ id: 12, thresholdFen: 999999 })
  assert.equal(pickBestCoupon([expired, notStarted, tooSmall], 6000, now), null)
})

test('最优券：订单金额为 0 时无推荐', () => {
  assert.equal(pickBestCoupon([fullReduction(), discount()], 0, new Date('2026-06-01T00:00:00.000Z')), null)
})
