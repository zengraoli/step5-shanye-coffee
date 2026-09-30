import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, forceStoreOpen, loginAdmin, loginMember } from './helpers.js'

const CART = [
  { productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 2 },
]

async function setupMember(app: Awaited<ReturnType<typeof createTestApp>>['app']) {
  const token = await loginMember(app, '13800000001')
  const claim = await app.inject({
    method: 'POST',
    url: '/api/v1/coupons/1/claim',
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(claim.statusCode, 201, claim.body)
  return { token, couponId: claim.json().data.id as number }
}

async function placeOrder(
  app: Awaited<ReturnType<typeof createTestApp>>['app'],
  token: string,
  memberCouponId: number,
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${token}` },
    payload: { storeId: 1, orderType: 'takeout', items: CART, memberCouponId },
  })
  assert.equal(res.statusCode, 201, res.body)
  return res.json().data.id as number
}

test('同一张券连下两单，第二单支付被拒绝（券只核销一次）', async () => {
  const { app, db } = await createTestApp()
  forceStoreOpen(db, 1)
  const { token, couponId } = await setupMember(app)
  try {
    const first = await placeOrder(app, token, couponId)
    const second = await placeOrder(app, token, couponId)
    assert.notEqual(first, second)

    const paid = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${first}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(paid.statusCode, 200, paid.body)
    assert.equal(paid.json().data.payFen, 4250)

    const paidAgain = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${second}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(paidAgain.statusCode, 400, paidAgain.body)
    assert.equal(paidAgain.json().code, 40003)

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/coupons',
      headers: { authorization: `Bearer ${token}` },
    })
    const used = list.json().data.filter((item: { id: number }) => item.id === couponId)
    assert.equal(used[0].status, 'used')
    assert.equal(used[0].statusText, '已使用')
    assert.equal(used[0].usable, false)
  } finally {
    await app.close()
  }
})

test('券在下单后过期的，支付被拒绝', async () => {
  const { app, db } = await createTestApp()
  forceStoreOpen(db, 1)
  const { token, couponId } = await setupMember(app)
  try {
    const orderId = await placeOrder(app, token, couponId)
    db.prepare('UPDATE member_coupons SET valid_to = ? WHERE id = ?').run(
      new Date(Date.now() - 60_000).toISOString(),
      couponId,
    )
    const paid = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(paid.statusCode, 400, paid.body)
    assert.equal(paid.json().code, 40004)
  } finally {
    await app.close()
  }
})

test('编辑券模板后，已领取的券按领取时条件生效', async () => {
  const { app, db } = await createTestApp()
  forceStoreOpen(db, 1)
  const adminToken = await loginAdmin(app, 'admin')
  const { token, couponId } = await setupMember(app)
  try {
    const updated = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/coupons/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { type: 'full_reduction', thresholdFen: 3000, reduceFen: 3000 },
    })
    assert.equal(updated.statusCode, 200, updated.body)

    // 已领的券仍是“满 50 减 10”：36 元订单不能减 30
    const quote = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: [{ productId: 3, spec: { cup: 'medium', temp: 'ice', sugar: 'less' }, quantity: 1 }] },
    })
    assert.equal(quote.statusCode, 200, quote.body)
    assert.equal(quote.json().data.discountFen, 0)
    assert.ok(!quote.json().data.coupons.some((item: { id: number; discountFen: number }) => item.id === couponId && item.discountFen > 0))

    // 原门槛下的 50 元订单仍然减 10
    const quote2 = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART },
    })
    assert.equal(quote2.json().data.discountFen, 1000)
    assert.equal(quote2.json().data.selectedCouponId, couponId)
  } finally {
    await app.close()
  }
})

test('编辑优惠券可以切换类型并重置对侧字段', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/coupons',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: '满 30 减 6', type: 'full_reduction', thresholdFen: 3000, reduceFen: 600, validDays: 7, total: 50 },
    })
    assert.equal(created.statusCode, 201, created.body)
    const id = created.json().data.id as number

    // 切成折扣券：门槛清空、填 80% 折扣
    const switched = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/coupons/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { type: 'discount', thresholdFen: '', discountPercent: 80 },
    })
    assert.equal(switched.statusCode, 200, switched.body)
    assert.equal(switched.json().data.type, 'discount')
    assert.equal(switched.json().data.thresholdFen, 0)
    assert.equal(switched.json().data.reduceFen, 0)
    assert.equal(switched.json().data.typeText, '折扣券')

    // 折扣券缺失折扣参数应报错
    const bad = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/coupons/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { type: 'discount', discountPercent: 120 },
    })
    assert.equal(bad.statusCode, 400)
    assert.equal(bad.json().code, 10000)
  } finally {
    await app.close()
  }
})

test('编辑优惠券可以调整发放总量，剩余量同步变化', async () => {
  const { app, db } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  const token = await loginMember(app, '13800000002')
  try {
    // 先领一张，剩余 9
    await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    const row = db.prepare('SELECT * FROM coupons WHERE id = 1').get() as { total: number; remaining: number }
    assert.equal(row.total, 1000)
    assert.equal(row.remaining, 999)

    const grown = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/coupons/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { total: 2000 },
    })
    assert.equal(grown.statusCode, 200, grown.body)
    assert.equal(grown.json().data.total, 2000)
    assert.equal(grown.json().data.remaining, 1999)

    // 小于已领取数量时拒绝
    const tooSmall = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/coupons/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { total: 0 },
    })
    assert.equal(tooSmall.statusCode, 400)
    assert.match(tooSmall.json().message, /发放总量/)
  } finally {
    await app.close()
  }
})

test('停用券模板后不再推荐，会员券显示已失效', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  const { token, couponId } = await setupMember(app)
  try {
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/coupons/1/status',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'inactive' },
    })
    const quote = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART },
    })
    assert.equal(quote.statusCode, 200, quote.body)
    assert.equal(quote.json().data.discountFen, 0)
    assert.equal(quote.json().data.bestCouponId, null)
    assert.ok(!quote.json().data.coupons.some((item: { id: number }) => item.id === couponId))

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/coupons',
      headers: { authorization: `Bearer ${token}` },
    })
    const item = list.json().data.find((row: { id: number }) => row.id === couponId)
    assert.equal(item.statusText, '已失效')
    assert.equal(item.usable, false)

    // 停用后再下单直接拒绝
    const order = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART, memberCouponId: couponId },
    })
    assert.equal(order.statusCode, 404, order.body)
    assert.equal(order.json().message, '优惠券已停用')
  } finally {
    await app.close()
  }
})
