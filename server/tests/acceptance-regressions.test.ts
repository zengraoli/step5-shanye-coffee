import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, forceStoreOpen, loginAdmin, loginMember } from './helpers.js'

const CART = [
  { productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 1 },
]

async function makeOrder(app: Awaited<ReturnType<typeof createTestApp>>['app'], token: string, storeId = 1) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${token}` },
    payload: { storeId, orderType: 'takeout', items: CART },
  })
  assert.equal(res.statusCode, 201, res.body)
  return res.json().data as { id: number; totalFen: number; payFen: number }
}

test('看板只统计已支付订单：待支付订单不计入营业额与订单量', async () => {
  const { app, db } = await createTestApp()
  forceStoreOpen(db, 1)
  const token = await loginMember(app, '13800000001')
  try {
    const order = await makeOrder(app, token)
    const adminToken = await loginAdmin(app, 'admin')
    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const beforeData = before.json().data
    const paidBefore = beforeData.today.orderCount as number

    await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })

    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const afterData = after.json().data
    assert.equal(afterData.today.orderCount, paidBefore + 1)
    assert.ok(afterData.today.revenueFen >= order.payFen)
    // 趋势口径一致：今天这一桶至少有一单
    const today = afterData.trend[afterData.trend.length - 1]
    assert.ok(today.orderCount >= 1, JSON.stringify(afterData.trend))
  } finally {
    await app.close()
  }
})

test('店员看板的新增会员只看本门店', async () => {
  const { app, db } = await createTestApp()
  forceStoreOpen(db, 1)
  forceStoreOpen(db, 2)
  const tokenA = await loginMember(app, '13800000001')
  const tokenB = await loginMember(app, '13800000002')
  try {
    await makeOrder(app, tokenA, 1)
    await makeOrder(app, tokenB, 2)
    const staffToken = await loginAdmin(app, 'staff')
    const staff = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${staffToken}` },
    })
    assert.equal(staff.json().data.scope, 'store')
    assert.equal(staff.json().data.today.newMembers, 1)

    const adminToken = await loginAdmin(app, 'admin')
    const admin = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(admin.json().data.scope, 'all')
    assert.ok((admin.json().data.today.newMembers as number) >= 2)
  } finally {
    await app.close()
  }
})

test('非法分页与日期参数返回 400 而不是 500', async () => {
  const { app } = await createTestApp()
  const memberToken = await loginMember(app, '13800000001')
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const cases: { url: string; authorization: string }[] = [
      { url: '/api/v1/admin/orders?page=1e20', authorization: adminToken },
      { url: '/api/v1/admin/orders?date=2026-13-01', authorization: adminToken },
      { url: '/api/v1/admin/orders?date=2026-02-30', authorization: adminToken },
      { url: '/api/v1/admin/orders?page=abc', authorization: adminToken },
      { url: '/api/v1/admin/products?page=1e20', authorization: adminToken },
      { url: '/api/v1/admin/members?page=1e20', authorization: adminToken },
      { url: '/api/v1/products?page=1e20', authorization: '' },
      { url: '/api/v1/orders?page=1e20', authorization: memberToken },
    ]
    for (const item of cases) {
      const res = await app.inject({
        method: 'GET',
        url: item.url,
        headers: item.authorization ? { authorization: `Bearer ${item.authorization}` } : {},
      })
      assert.equal(res.statusCode, 400, `${item.url} 应返回 400，实际 ${res.statusCode} ${res.body}`)
      assert.equal(res.json().code, 10000, item.url)
      assert.ok(res.json().message.length > 0)
    }
  } finally {
    await app.close()
  }
})

test('编辑商品传入不存在的分类返回 400', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/products/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { categoryId: 9999 },
    })
    assert.equal(res.statusCode, 400, res.body)
    assert.equal(res.json().message, '商品分类不存在')

    const badPrice = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/products/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { basePrice: 1e20 },
    })
    assert.equal(badPrice.statusCode, 400, badPrice.body)

    const longName = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/products/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: '拿'.repeat(100) },
    })
    assert.equal(longName.statusCode, 400, longName.body)
  } finally {
    await app.close()
  }
})

test('活动时间必须为合法 ISO8601；时间段必须是真实存在的日期', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const bad = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/promo',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { startAt: '2026', endAt: '2027' },
    })
    assert.equal(bad.statusCode, 400, bad.body)
    assert.match(bad.json().message, /ISO8601/)

    const inverted = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/promo',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { startAt: '2026-09-10T00:00:00.000Z', endAt: '2026-09-01T00:00:00.000Z' },
    })
    assert.equal(inverted.statusCode, 400)
    assert.match(inverted.json().message, /结束时间/)
  } finally {
    await app.close()
  }
})

test('取餐码与同店当日订单（含已完成）查重', async () => {
  const { app, db } = await createTestApp()
  forceStoreOpen(db, 1)
  const token = await loginMember(app, '13800000001')
  try {
    const order = await makeOrder(app, token)
    const paid = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(paid.statusCode, 200, paid.body)
    const code = paid.json().data.pickupCode as string
    assert.match(code, /^\d{4}$/)

    // 直接把库里今天的其它订单占满该取餐码，再次下单必须拿到不同编码
    db.prepare(
      `INSERT INTO orders (order_no, member_id, store_id, order_type, status, total_fen, discount_fen, pay_fen, pickup_code, remark, created_at, paid_at)
       VALUES (?, ?, 1, 'takeout', 'paid', 100, 0, 100, ?, '压测', datetime('now'), datetime('now'))`,
    ).run(`SY20260926000001`, 1, code)

    const second = await makeOrder(app, token)
    const paid2 = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${second.id}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(paid2.statusCode, 200, paid2.body)
    assert.notEqual(paid2.json().data.pickupCode, code)
  } finally {
    await app.close()
  }
})

test('新增账号：storeId 传 true、密码为纯空格都被拒绝', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const boolStore = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/accounts',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { username: 'staff99', role: 'staff', storeId: true, password: 'abcdef12' },
    })
    assert.equal(boolStore.statusCode, 400, boolStore.body)
    assert.equal(boolStore.json().message, '绑定门店 id 不合法')

    const blank = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/accounts',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { username: 'staff98', role: 'staff', storeId: 1, password: '      ' },
    })
    assert.equal(blank.statusCode, 400, blank.body)
    assert.match(blank.json().message, /密码/)

    // 店员正确绑定 2 号店
    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/accounts',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { username: 'staff97', role: 'staff', storeId: 2, password: 'abcdef12' },
    })
    assert.equal(ok.statusCode, 201, ok.body)
    assert.equal(ok.json().data.account.storeId, 2)
  } finally {
    await app.close()
  }
})
