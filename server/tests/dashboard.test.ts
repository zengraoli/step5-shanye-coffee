import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, forceStoreOpen, loginAdmin } from './helpers.js'
import { openDb } from '../src/db/index.js'

/** 直接构造一笔已支付订单（北京时间今天） */
function seedPaidOrder(
  db: ReturnType<typeof openDb>['db'],
  options: { memberId: number; storeId: number; payFen: number; productId?: number; quantity?: number },
): void {
  const now = new Date().toISOString()
  const info = db
    .prepare(
      `INSERT INTO orders (order_no, member_id, store_id, order_type, status, total_fen, discount_fen, pay_fen, pickup_code, created_at, paid_at)
       VALUES (?, ?, ?, 'takeout', 'paid', ?, 0, ?, '1234', ?, ?)`,
    )
    .run(
      `SYTEST${Math.random().toString().slice(2, 12)}`,
      options.memberId,
      options.storeId,
      options.payFen,
      options.payFen,
      now,
      now,
    )
  const orderId = Number(info.lastInsertRowid)
  db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, spec, unit_price, quantity)
     VALUES (?, ?, ?, '{}', ?, ?)`,
  ).run(orderId, options.productId ?? 1, '山野拿铁', Math.floor(options.payFen / (options.quantity ?? 1)), options.quantity ?? 1)
}

async function memberIdOf(
  app: Awaited<ReturnType<typeof createTestApp>>['app'],
  phone: string,
): Promise<number> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { phone, code: '123456' },
  })
  return res.json().data.member.id as number
}

test('看板：今日概览、7 天趋势、热销与最新订单', async () => {
  const { app, db } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    forceStoreOpen(db, 1)
    const memberId = await memberIdOf(app, '13800099001')
    seedPaidOrder(db, { memberId, storeId: 1, payFen: 7000, productId: 1, quantity: 2 })
    seedPaidOrder(db, { memberId, storeId: 2, payFen: 3000, productId: 2, quantity: 1 })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200, res.body)
    const data = res.json().data
    assert.equal(data.scope, 'all')
    assert.equal(data.today.orderCount, 2)
    assert.equal(data.today.revenueFen, 10000)
    assert.equal(data.today.avgOrderFen, 5000)
    assert.ok(data.today.newMembers >= 1)
    assert.equal(data.trend.length, 7)
    assert.equal(data.trend[6]?.revenueFen, 10000)
    assert.equal(data.trend[6]?.orderCount, 2)
    assert.equal(data.topProducts.length, 2)
    assert.equal(data.topProducts[0]?.quantity, 2)
    assert.equal(data.topProducts[0]?.productName, '山野拿铁')
    assert.equal(data.latestOrders.length, 2)
    assert.match(data.latestOrders[0].memberPhone, /^1\d{2}\*\*\*\*\d{4}$/)
  } finally {
    await app.close()
  }
})

test('看板：未登录与店员权限', async () => {
  const { app, db } = await createTestApp()
  const staffToken = await loginAdmin(app, 'staff')
  try {
    const anonymous = await app.inject({ method: 'GET', url: '/api/v1/admin/dashboard' })
    assert.equal(anonymous.statusCode, 401)
    assert.equal(anonymous.json().code, 10002)

    const memberId = await memberIdOf(app, '13800099002')
    forceStoreOpen(db, 1)
    seedPaidOrder(db, { memberId, storeId: 1, payFen: 5000 })
    seedPaidOrder(db, { memberId, storeId: 2, payFen: 9000 })

    // 店员只看本门店（1 号门店）
    const staff = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${staffToken}` },
    })
    assert.equal(staff.statusCode, 200)
    const data = staff.json().data
    assert.equal(data.scope, 'store')
    assert.equal(data.storeId, 1)
    assert.equal(data.today.revenueFen, 5000)
    assert.equal(data.latestOrders.length, 1)
  } finally {
    await app.close()
  }
})

test('看板：已取消订单不计入营业额', async () => {
  const { app, db } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const memberId = await memberIdOf(app, '13800099003')
    seedPaidOrder(db, { memberId, storeId: 1, payFen: 4000 })
    db.prepare(
      `INSERT INTO orders (order_no, member_id, store_id, order_type, status, total_fen, discount_fen, pay_fen, created_at, cancelled_at)
       VALUES ('SYCANCEL1', ?, 1, 'takeout', 'cancelled', 9900, 0, 9900, ?, ?)`,
    ).run(memberId, new Date().toISOString(), new Date().toISOString())

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const data = res.json().data
    assert.equal(data.today.revenueFen, 4000)
    assert.equal(data.today.orderCount, 1)
  } finally {
    await app.close()
  }
})
