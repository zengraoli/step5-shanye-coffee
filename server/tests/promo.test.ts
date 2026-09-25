import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isPromoActive,
  isPromoProduct,
  secondHalfDiscountFen,
  type PromoActivity,
} from '../src/lib/promo.js'
import { createTestApp, forceStoreOpen, loginAdmin, loginMember } from './helpers.js'

function activity(overrides: Partial<PromoActivity> = {}): PromoActivity {
  return {
    id: 1,
    name: '第二杯半价',
    type: 'second_half',
    status: 'active',
    startAt: '2026-09-01T00:00:00.000Z',
    endAt: '2026-12-31T23:59:59.000Z',
    productIds: [1, 2],
    ...overrides,
  }
}

const NOW = new Date('2026-09-26T00:00:00.000Z')

test('第二杯半价：第 2、4… 杯半价，向下取整到分', () => {
  const lines = [
    { productId: 1, unitPrice: 3500, quantity: 1 },
    { productId: 1, unitPrice: 3500, quantity: 2 },
  ]
  // 共 3 杯：第 2 杯半价 1750
  assert.equal(secondHalfDiscountFen(lines, [1]), 1750)
  // 4 杯：第 2、4 杯各 1750
  assert.equal(secondHalfDiscountFen([{ productId: 1, unitPrice: 3500, quantity: 4 }], [1]), 3500)
  // 奇数单价向下取整：3201 → 1600
  assert.equal(secondHalfDiscountFen([{ productId: 1, unitPrice: 3201, quantity: 2 }], [1]), 1600)
})

test('第二杯半价：非适用商品不优惠，多商品分别计数', () => {
  assert.equal(secondHalfDiscountFen([{ productId: 9, unitPrice: 3500, quantity: 4 }], [1]), 0)
  const lines = [
    { productId: 1, unitPrice: 3000, quantity: 2 },
    { productId: 2, unitPrice: 2000, quantity: 3 },
  ]
  // 商品1：1 杯半价 1500；商品2：1 杯半价 1000
  assert.equal(secondHalfDiscountFen(lines, [1, 2]), 2500)
  // 只适用商品 1
  assert.equal(secondHalfDiscountFen(lines, [1]), 1500)
})

test('第二杯半价：同一商品多规格按行顺序累计', () => {
  const lines = [
    { productId: 1, unitPrice: 3200, quantity: 1 },
    { productId: 1, unitPrice: 3500, quantity: 1 },
  ]
  // 第 2 杯（大杯 3500）半价 1750
  assert.equal(secondHalfDiscountFen(lines, [1]), 1750)
})

test('活动生效判断：状态、时间边界与适用商品', () => {
  assert.ok(isPromoActive(activity(), NOW))
  assert.ok(!isPromoActive(activity({ status: 'inactive' }), NOW))
  assert.ok(!isPromoActive(activity({ productIds: [] }), NOW))
  // 边界
  assert.ok(isPromoActive(activity(), new Date('2026-09-01T00:00:00.000Z')))
  assert.ok(!isPromoActive(activity(), new Date('2026-08-31T23:59:59.999Z')))
  assert.ok(isPromoActive(activity(), new Date('2026-12-31T23:59:59.000Z')))
  assert.ok(!isPromoActive(activity(), new Date('2027-01-01T00:00:00.000Z')))
  assert.ok(!isPromoActive(null, NOW))
})

test('商品是否参与活动', () => {
  assert.ok(isPromoProduct(1, activity(), NOW))
  assert.ok(!isPromoProduct(3, activity(), NOW))
  assert.ok(!isPromoProduct(1, activity({ status: 'inactive' }), NOW))
})

test('公开接口返回当前活动（种子默认启用，适用咖啡类 6 款）', async () => {
  const { app } = await createTestApp()
  try {
    const res = await app.inject({ method: 'GET', url: '/api/v1/promo' })
    assert.equal(res.statusCode, 200)
    const data = res.json().data
    assert.equal(data.active, true)
    assert.equal(data.activity.name, '第二杯半价')
    assert.equal(data.activity.type, 'second_half')
    assert.deepEqual(data.activity.productIds, [1, 2, 3, 4, 5, 6])
  } finally {
    await app.close()
  }
})

test('后台可修改活动配置并立即生效', async () => {
  const { app, db } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    forceStoreOpen(db, 1)
    // 停用活动
    const off = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/promo',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'inactive' },
    })
    assert.equal(off.statusCode, 200, off.body)
    assert.equal(off.json().data.active, false)

    // 重新启用并改为仅适用商品 13
    const on = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/promo',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        status: 'active',
        startAt: '2026-01-01T00:00:00.000Z',
        endAt: '2027-01-01T00:00:00.000Z',
        productIds: [13],
      },
    })
    assert.equal(on.statusCode, 200, on.body)
    assert.deepEqual(on.json().data.activity.productIds, [13])

    // 生效后：商品 13 两杯有优惠，商品 1 两杯无优惠
    const token = await loginMember(app, '13800099010')
    const quote = async (productId: number) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/orders/quote',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          storeId: 1,
          orderType: 'takeout',
          items: [{ productId, spec: { cup: 'medium', temp: 'ice', sugar: 'less' }, quantity: 2 }],
        },
      })
    const promoQuote = await quote(13)
    assert.equal(promoQuote.json().data.promoDiscountFen, 900) // 1800 / 2
    const normalQuote = await quote(1)
    assert.equal(normalQuote.json().data.promoDiscountFen, 0)

    // 恢复种子配置，避免影响其他测试的共享状态
    db.prepare('UPDATE promo_activities SET status = ? WHERE id = 1').run('active')
    db.prepare('DELETE FROM promo_activity_products WHERE activity_id = 1').run()
    for (const id of [1, 2, 3, 4, 5, 6]) {
      db.prepare('INSERT OR REPLACE INTO promo_activity_products (activity_id, product_id) VALUES (1, ?)').run(id)
    }
  } finally {
    await app.close()
  }
})

test('活动配置校验：时间与商品', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const badTime = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/promo',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { startAt: '2026-12-31T00:00:00.000Z', endAt: '2026-01-01T00:00:00.000Z' },
    })
    assert.equal(badTime.statusCode, 400)
    assert.match(badTime.json().message, /结束时间必须晚于开始时间/)

    const badProduct = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/promo',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { productIds: [999] },
    })
    assert.equal(badProduct.statusCode, 400)
    assert.match(badProduct.json().message, /不存在的商品/)

    const staffToken = await loginAdmin(app, 'staff')
    const forbidden = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/promo',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { status: 'inactive' },
    })
    assert.equal(forbidden.statusCode, 403)
    assert.equal(forbidden.json().code, 10003)
  } finally {
    await app.close()
  }
})

test('订单记录活动优惠金额', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13800099011')
  try {
    db.prepare('UPDATE stores SET open_time = ?, close_time = ? WHERE id = 1').run('00:00', '23:59')
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        storeId: 1,
        orderType: 'takeout',
        items: [{ productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 2 }],
      },
    })
    assert.equal(created.statusCode, 201, created.body)
    const order = created.json().data
    assert.equal(order.totalFen, 7000)
    assert.equal(order.promoDiscountFen, 1750)
    assert.equal(order.payFen, 5250)

    // 后台订单详情同样返回活动优惠
    const adminToken = await loginAdmin(app, 'admin')
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/orders/${order.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(detail.json().data.promoDiscountFen, 1750)
  } finally {
    await app.close()
  }
})
