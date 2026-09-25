import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, forceStoreOpen, loginAdmin, loginMember } from './helpers.js'

const CART = [
  { productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 2 },
]

interface OrderData {
  id: number
  orderNo: string
  status: string
  statusText: string
  totalFen: number
  discountFen: number
  promoDiscountFen: number
  payFen: number
  pickupCode: string | null
  coupon: { id: number; name: string; discountFen: number } | null
  items: { amount: number; specText: string }[]
  timeline: { status: string; time: string | null }[]
}

async function createOrder(
  app: Awaited<ReturnType<typeof createTestApp>>['app'],
  token: string,
  payload: Record<string, unknown> = {},
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${token}` },
    payload: { storeId: 1, orderType: 'takeout', items: CART, ...payload },
  })
  return res
}

test('创建订单：金额明细正确并生成订单号', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000001')
  try {
    forceStoreOpen(db, 1)
    const res = await createOrder(app, token)
    assert.equal(res.statusCode, 201, res.body)
    const order = res.json().data as OrderData
    assert.equal(order.totalFen, 7000)
    // 第二杯半价：同商品第 2 杯减 1750 分
    assert.equal(order.promoDiscountFen, 1750)
    assert.equal(order.discountFen, 0)
    assert.equal(order.payFen, 5250)
    assert.equal(order.status, 'pending_pay')
    assert.equal(order.pickupCode, null)
    assert.match(order.orderNo, /^SY\d{8}\d{6}$/)
    assert.equal(order.items.length, 1)
    assert.equal(order.items[0]?.amount, 7000)
    assert.equal(order.timeline.length, 1)
  } finally {
    await app.close()
  }
})

test('创建订单：使用优惠券后实付金额正确', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000002')
  try {
    forceStoreOpen(db, 1)
    const claim = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    const couponId = claim.json().data.id as number
    const res = await createOrder(app, token, { memberCouponId: couponId })
    assert.equal(res.statusCode, 201, res.body)
    const order = res.json().data as OrderData
    assert.equal(order.totalFen, 7000)
    assert.equal(order.promoDiscountFen, 1750)
    // 券按活动后金额 5250 计算：满 50 减 10
    assert.equal(order.discountFen, 1000)
    assert.equal(order.payFen, 4250)
    assert.equal(order.coupon?.id, couponId)

    // 未支付前优惠券仍未核销
    const coupons = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/coupons?status=unused',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(coupons.json().data.length, 1)
  } finally {
    await app.close()
  }
})

test('下单校验：门店休息中、售罄商品、空购物车', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000003')
  try {
    db.prepare('UPDATE stores SET open_time = ?, close_time = ? WHERE id = 1').run('03:00', '03:01')
    const closed = await createOrder(app, token)
    assert.equal(closed.statusCode, 400)
    assert.equal(closed.json().code, 20002)

    forceStoreOpen(db, 1)
    db.prepare('UPDATE products SET sold_out = 1 WHERE id = 1').run()
    const soldOut = await createOrder(app, token)
    assert.equal(soldOut.statusCode, 400)
    assert.equal(soldOut.json().code, 30003)

    db.prepare('UPDATE products SET sold_out = 0 WHERE id = 1').run()
    const empty = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeId: 1, orderType: 'takeout', items: [] },
    })
    assert.equal(empty.statusCode, 400)
    assert.equal(empty.json().code, 50004)
  } finally {
    await app.close()
  }
})

test('支付后生成 4 位取餐码并核销优惠券', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000004')
  try {
    forceStoreOpen(db, 1)
    const claim = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/1/claim',
      headers: { authorization: `Bearer ${token}` },
    })
    const couponId = claim.json().data.id as number
    const created = await createOrder(app, token, { memberCouponId: couponId })
    const orderId = created.json().data.id as number

    const pay = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(pay.statusCode, 200, pay.body)
    const paid = pay.json().data as OrderData
    assert.equal(paid.status, 'paid')
    assert.match(paid.pickupCode!, /^\d{4}$/)
    assert.equal(paid.promoDiscountFen, 1750)
    assert.equal(paid.payFen, 4250)

    const used = await app.inject({
      method: 'GET',
      url: '/api/v1/members/me/coupons?status=used',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(used.json().data.length, 1)

    // 重复支付被拒绝
    const again = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(again.statusCode, 400)
    assert.equal(again.json().code, 50002)
  } finally {
    await app.close()
  }
})

test('非法状态流转返回错误', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000005')
  const adminToken = await loginAdmin(app, 'admin')
  try {
    forceStoreOpen(db, 1)
    const created = await createOrder(app, token)
    const orderId = created.json().data.id as number

    // 待支付直接推进被拒绝
    const early = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/orders/${orderId}/advance`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(early.statusCode, 400)
    assert.equal(early.json().code, 50002)

    // 待支付不能确认取餐
    const confirm = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(confirm.statusCode, 400)
    assert.equal(confirm.json().code, 50002)
  } finally {
    await app.close()
  }
})

test('待支付订单可取消，支付后不可取消', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000006')
  try {
    forceStoreOpen(db, 1)
    const created = await createOrder(app, token)
    const orderId = created.json().data.id as number

    const pay = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(pay.statusCode, 200)

    const cancelAfterPay = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/cancel`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(cancelAfterPay.statusCode, 400)
    assert.equal(cancelAfterPay.json().code, 50002)

    const created2 = await createOrder(app, token)
    const orderId2 = created2.json().data.id as number
    const cancel = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId2}/cancel`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(cancel.statusCode, 200)
    assert.equal(cancel.json().data.status, 'cancelled')
  } finally {
    await app.close()
  }
})

test('订单只能本人查看，他人访问被拒绝', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000007')
  const other = await loginMember(app, '13700000008')
  try {
    forceStoreOpen(db, 1)
    const created = await createOrder(app, token)
    const orderId = created.json().data.id as number

    const mine = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(mine.statusCode, 200)

    const others = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}`,
      headers: { authorization: `Bearer ${other}` },
    })
    assert.equal(others.statusCode, 403)
    assert.equal(others.json().code, 50003)
  } finally {
    await app.close()
  }
})

test('后台推进订单状态：已支付 → 制作中 → 待取餐 → 已完成', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000009')
  const adminToken = await loginAdmin(app, 'admin')
  try {
    forceStoreOpen(db, 1)
    const created = await createOrder(app, token)
    const orderId = created.json().data.id as number
    await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })

    const expected = ['making', 'pickable', 'completed']
    for (const status of expected) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/orders/${orderId}/advance`,
        headers: { authorization: `Bearer ${adminToken}` },
      })
      assert.equal(res.statusCode, 200, res.body)
      assert.equal(res.json().data.status, status)
    }

    // 终态无法继续推进
    const extra = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/orders/${orderId}/advance`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(extra.statusCode, 400)
    assert.equal(extra.json().code, 50002)

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}`,
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(detail.json().data.timeline.length, 5)
  } finally {
    await app.close()
  }
})

test('店员只能操作本门店订单', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000010')
  const staffToken = await loginAdmin(app, 'staff')
  const adminToken = await loginAdmin(app, 'admin')
  try {
    forceStoreOpen(db, 1)
    forceStoreOpen(db, 2)
    const created = await createOrder(app, token, { storeId: 2 })
    const orderId = created.json().data.id as number
    await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })

    // 店员（绑定 1 号门店）操作 2 号门店订单被拒绝
    const forbidden = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/orders/${orderId}/advance`,
      headers: { authorization: `Bearer ${staffToken}` },
    })
    assert.equal(forbidden.statusCode, 403)
    assert.equal(forbidden.json().code, 50003)

    // 店员列表中看不到 2 号门店订单
    const staffList = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/orders',
      headers: { authorization: `Bearer ${staffToken}` },
    })
    assert.equal(staffList.json().data.list.length, 0)
    assert.equal(staffList.json().data.total, 0)

    // 管理员可以操作
    const allowed = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/orders/${orderId}/advance`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(allowed.statusCode, 200)
    assert.equal(allowed.json().data.status, 'making')
  } finally {
    await app.close()
  }
})

test('后台订单列表：筛选、手机号脱敏、详情', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000011')
  const adminToken = await loginAdmin(app, 'admin')
  try {
    forceStoreOpen(db, 1)
    await createOrder(app, token)
    await createOrder(app, token)

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/orders',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(list.statusCode, 200)
    const payload = list.json().data as {
      list: { id: number; memberPhone: string; status: string }[]
      total: number
      page: number
      pageSize: number
    }
    // 列表为分页结构 { list, total, page, pageSize }
    assert.ok(Array.isArray(payload.list))
    assert.equal(payload.total, 2)
    assert.equal(payload.page, 1)
    assert.equal(payload.pageSize, 20)
    const rows = payload.list
    assert.equal(rows.length, 2)
    for (const row of rows) {
      assert.match(row.memberPhone, /^1\d{2}\*\*\*\*\d{4}$/)
    }

    const byStatus = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/orders?status=pending_pay',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(byStatus.json().data.list.length, 2)
    assert.equal(byStatus.json().data.total, 2)

    const byStore = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/orders?store_id=2',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(byStore.json().data.list.length, 0)
    assert.equal(byStore.json().data.total, 0)

    const paged = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/orders?page=1&page_size=1',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(paged.json().data.list.length, 1)
    assert.equal(paged.json().data.total, 2)
    assert.equal(paged.json().data.pageSize, 1)

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/orders/${rows[0]?.id ?? 0}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(detail.statusCode, 200)
    assert.match(detail.json().data.memberPhone, /^1\d{2}\*\*\*\*\d{4}$/)
  } finally {
    await app.close()
  }
})

test('我的订单列表按状态筛选', async () => {
  const { app, db } = await createTestApp()
  const token = await loginMember(app, '13700000012')
  try {
    forceStoreOpen(db, 1)
    const created = await createOrder(app, token)
    const orderId = created.json().data.id as number
    await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${token}` },
    })
    await createOrder(app, token)

    const all = await app.inject({
      method: 'GET',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(all.json().data.total, 2)

    const paid = await app.inject({
      method: 'GET',
      url: '/api/v1/orders?status=paid',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(paid.json().data.total, 1)

    const cancelled = await app.inject({
      method: 'GET',
      url: '/api/v1/orders?status=cancelled',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(cancelled.json().data.total, 0)
  } finally {
    await app.close()
  }
})

test('订单号与取餐码生成规则', async () => {
  const { generateOrderNo, generatePickupCode } = await import('../src/modules/orders.js')
  const orderNo = generateOrderNo(new Date('2026-09-26T10:00:00.000Z'))
  assert.match(orderNo, /^SY\d{8}\d{6}$/)
  for (let i = 0; i < 50; i += 1) {
    assert.match(generatePickupCode(), /^\d{4}$/)
  }
})
