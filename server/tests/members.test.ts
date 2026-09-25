import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, forceStoreOpen, loginAdmin, loginMember } from './helpers.js'

const CART = [
  { productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 2 },
]

async function payOnce(
  app: Awaited<ReturnType<typeof createTestApp>>['app'],
  token: string,
  phone: string,
): Promise<number> {
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${token}` },
    payload: { storeId: 1, orderType: 'takeout', items: CART },
  })
  assert.equal(created.statusCode, 201, created.body)
  const orderId = created.json().data.id as number
  const pay = await app.inject({
    method: 'POST',
    url: `/api/v1/orders/${orderId}/pay`,
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(pay.statusCode, 200, pay.body)
  return orderId
}

test('支付后按实付金额积分并记录流水', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13600000001')
  try {
    forceStoreOpen(db, 1)
    // 实付 7000 分 = 70 元 → 70 分
    await payOnce(app, token, '13600000001')
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(me.json().data.points, 70)
    assert.equal(me.json().data.level, 'silver')
    assert.equal(me.json().data.levelText, '银卡')
    assert.equal(me.json().data.nextLevel, 'gold')
    assert.equal(me.json().data.pointsToNextLevel, 430)

    const points = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/points',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(points.json().data.totalEarned, 70)
    assert.equal(points.json().data.logs.length, 1)
    assert.equal(points.json().data.logs[0].change, 70)
    assert.equal(points.json().data.logs[0].reason, '消费积分')
  } finally {
    await app.close()
  }
})

test('积分累计到 500 自动升级金卡，2000 升级黑卡', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13600000002')
  try {
    forceStoreOpen(db, 1)
    // 每单实付 7000 分 = 70 分，8 单后 560 分 → 金卡
    for (let i = 0; i < 8; i += 1) {
      await payOnce(app, token, '13600000002')
    }
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(me.json().data.points, 560)
    assert.equal(me.json().data.level, 'gold')
    assert.equal(me.json().data.levelText, '金卡')
    assert.equal(me.json().data.nextLevel, 'black')
    assert.equal(me.json().data.pointsToNextLevel, 1440)

    // 直接调整积分到 2000 以上，下次支付后应升级黑卡
    db.prepare('UPDATE members SET points = ?, level = ? WHERE phone = ?').run(1990, 'gold', '13600000002')
    await payOnce(app, token, '13600000002')
    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(after.json().data.points, 2060)
    assert.equal(after.json().data.level, 'black')
    assert.equal(after.json().data.nextLevel, null)
  } finally {
    await app.close()
  }
})

test('使用优惠券后按实付积分（不按原价）', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13600000003')
  try {
    forceStoreOpen(db, 1)
    const claim = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    const couponId = claim.json().data.id as number
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: CART, memberCouponId: couponId },
    })
    const orderId = created.json().data.id as number
    await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me',
      headers: { authorization: `Bearer ${token}` },
    })
    // 实付 6000 分 = 60 元 → 60 分
    assert.equal(me.json().data.points, 60)
  } finally {
    await app.close()
  }
})

test('后台会员列表手机号脱敏，详情包含订单与积分', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13600000004')
  const adminToken = await loginAdmin(app, 'admin')
  try {
    forceStoreOpen(db, 1)
    await payOnce(app, token, '13600000004')

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/members',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(list.statusCode, 200)
    const rows = list.json().data.list as { phone: string; points: number; orderCount: number; totalPayFen: number }[]
    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.phone, '136****0004')
    assert.equal(rows[0]?.points, 70)
    assert.equal(rows[0]?.orderCount, 1)
    assert.equal(rows[0]?.totalPayFen, 7000)

    const byKeyword = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/members?keyword=13600000004',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(byKeyword.json().data.list.length, 1)

    const byLevel = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/members?level=gold',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(byLevel.json().data.list.length, 0)

    const detail = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/members/1',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(detail.statusCode, 200)
    assert.equal(detail.json().data.phone, '136****0004')
    assert.equal(detail.json().data.orders.length, 1)
    assert.equal(detail.json().data.pointsLogs.length, 1)

    // 店员不能查看会员列表
    const staffList = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/members',
      headers: { authorization: `Bearer ${await loginAdmin(app, 'staff')}` },
    })
    assert.equal(staffList.statusCode, 403)
    assert.equal(staffList.json().code, 10003)
  } finally {
    await app.close()
  }
})
