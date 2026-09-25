import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, forceStoreOpen, loginAdmin, loginMember } from './helpers.js'

const CART = [
  { productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 2 },
]

test('可以领取优惠券，重复领取被拒绝', async () => {
  const { app } = await createTestApp()
  const token = await loginMember(app, '13800000001')
  try {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(first.statusCode, 201, first.body)
    assert.equal(first.json().data.status, 'unused')
    assert.equal(first.json().data.name, '新客满 50 减 10')

    const again = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(again.statusCode, 400)
    assert.equal(again.json().code, 40002)
  } finally {
    await app.close()
  }
})

test('我的优惠券列表与状态筛选', async () => {
  const { app } = await createTestApp()
  const token = await loginMember(app, '13800000002')
  try {
    await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/2/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    const all = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/coupons',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(all.json().data.length, 2)

    const unused = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/coupons?status=unused',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(unused.json().data.length, 2)

    const used = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/coupons?status=used',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(used.json().data.length, 0)
  } finally {
    await app.close()
  }
})

test('过期券在列表中显示已过期且下单不可选', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13800000003')
  try {
    forceStoreOpen(db, 1)
    const claim = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    const couponId = claim.json().data.id as number
    db.prepare('UPDATE member_coupons SET valid_to = ? WHERE id = ?').run(
      '2020-01-01T00:00:00.000Z',
      couponId,
    )

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/coupons',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(list.json().data[0].status, 'expired')
    assert.equal(list.json().data[0].statusText, '已过期')

    const quote = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART, memberCouponId: couponId },
    })
    assert.equal(quote.statusCode, 400)
    assert.equal(quote.json().code, 40004)

    // 自动推荐时也会忽略过期券
    const auto = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART },
    })
    assert.equal(auto.statusCode, 200)
    assert.equal(auto.json().data.bestCouponId, null)
    assert.equal(auto.json().data.discountFen, 0)
  } finally {
    await app.close()
  }
})

test('下单报价自动推荐最优券并计算金额明细', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13800000004')
  try {
    forceStoreOpen(db, 1)
    const claimFull = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    const claimDiscount = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/2/claim',
      headers: { authorization: `Bearer ${token}` },
    })

    const quote = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART },
    })
    assert.equal(quote.statusCode, 200, quote.body)
    const data = quote.json().data
    // 3200 + 300（大杯）= 3500 × 2 = 7000
    assert.equal(data.totalFen, 7000)
    // 8.5 折减 1050，优于满 50 减 10（1000）
    assert.equal(data.discountFen, 1050)
    assert.equal(data.payFen, 5950)
    assert.equal(data.bestCouponId, claimDiscount.json().data.id)
    assert.equal(data.items.length, 1)
    assert.equal(data.items[0].amount, 7000)
    assert.equal(data.items[0].specText, '大杯 / 冰 / 少糖')

    // 手动选择满减券
    const manual = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART, memberCouponId: claimFull.json().data.id },
    })
    assert.equal(manual.json().data.discountFen, 1000)
    assert.equal(manual.json().data.payFen, 6000)
    assert.equal(manual.json().data.selectedCouponId, claimFull.json().data.id)
  } finally {
    await app.close()
  }
})

test('不满足使用条件的券手动选择时报错', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13800000005')
  try {
    forceStoreOpen(db, 1)
    const claim = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    const smallCart = [{ productId: 13, spec: { cup: 'medium', temp: 'ice', sugar: 'standard' }, quantity: 1 }]
    const quote = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'dine_in', items: smallCart, memberCouponId: claim.json().data.id },
    })
    assert.equal(quote.statusCode, 400)
    assert.equal(quote.json().code, 40005)
  } finally {
    await app.close()
  }
})

test('报价校验：门店休息中、售罄商品、未登录', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13800000006')
  try {
    // 将 1 号门店营业时间改为不包含当前时刻的区间
    db.prepare('UPDATE stores SET open_time = ?, close_time = ? WHERE id = 1').run('03:00', '03:01')
    const closed = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART },
    })
    assert.equal(closed.statusCode, 400)
    assert.equal(closed.json().code, 20002)

    forceStoreOpen(db, 1)
    db.prepare('UPDATE products SET sold_out = 1 WHERE id = 1').run()
    const soldOut = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART },
    })
    assert.equal(soldOut.statusCode, 400)
    assert.equal(soldOut.json().code, 30003)

    const anonymous = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/quote',
      payload: { storeId: 1, orderType: 'takeout', items: CART },
    })
    assert.equal(anonymous.statusCode, 401)
    assert.equal(anonymous.json().code, 10002)
  } finally {
    await app.close()
  }
})

test('后台优惠券管理：创建、编辑、停用；店员无权访问', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  const staffToken = await loginAdmin(app, 'staff')
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/coupons',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: '测试满 30 减 5',
        type: 'full_reduction',
        thresholdFen: 3000,
        reduceFen: 500,
        validDays: 7,
        total: 100,
      },
    })
    assert.equal(created.statusCode, 201, created.body)
    const couponId = created.json().data.id as number
    assert.equal(created.json().data.remaining, 100)

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/coupons/${couponId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { reduceFen: 800, validDays: 14 },
    })
    assert.equal(updated.statusCode, 200)
    assert.equal(updated.json().data.reduceFen, 800)

    const disabled = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/coupons/${couponId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'inactive' },
    })
    assert.equal(disabled.json().data.status, 'inactive')

    // 停用后不出现在可领取列表
    const publicList = await app.inject({ method: 'GET', url: '/api/v1/coupons' })
    assert.ok(publicList.json().data.every((item: { id: number }) => item.id !== couponId))

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/coupons',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: '坏券', type: 'discount', discountPercent: 120, validDays: 7, total: 10 },
    })
    assert.equal(invalid.statusCode, 400)
    assert.equal(invalid.json().code, 10000)

    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/coupons',
      headers: { authorization: `Bearer ${staffToken}` },
    })
    assert.equal(forbidden.statusCode, 403)
    assert.equal(forbidden.json().code, 10003)
  } finally {
    await app.close()
  }
})
