import { randomInt } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/index.js'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
import { adminGuard, memberGuard } from '../lib/guards.js'
import { isOrderStatus } from '../lib/order-status.js'
import { couponDiscountFen, isWithinValidity, type CouponLike } from '../lib/coupon.js'
import { isWithinBusinessHours } from '../lib/time.js'
import {
  canTransition,
  nextStatus,
  ORDER_STATUS_TEXT,
  ORDER_TYPE_TEXT,
  type OrderStatus,
} from '../lib/order-status.js'
import { priceCart, type CartItemInput } from './pricing.js'
import { withTransaction } from '../db/tx.js'
import { maskPhone } from '../lib/phone.js'

export type OrderType = 'takeout' | 'dine_in'

interface OrderRow {
  id: number
  order_no: string
  member_id: number
  store_id: number
  order_type: string
  status: string
  total_fen: number
  discount_fen: number
  pay_fen: number
  member_coupon_id: number | null
  pickup_code: string | null
  remark: string
  created_at: string
  paid_at: string | null
  making_at: string | null
  pickable_at: string | null
  completed_at: string | null
  cancelled_at: string | null
}

interface OrderItemRow {
  id: number
  order_id: number
  product_id: number
  product_name: string
  spec: string
  unit_price: number
  quantity: number
}

export interface OrderDetail {
  id: number
  orderNo: string
  storeId: number
  storeName: string
  orderType: OrderType
  orderTypeText: string
  status: OrderStatus
  statusText: string
  items: {
    productId: number
    productName: string
    specText: string
    unitPrice: number
    quantity: number
    amount: number
  }[]
  totalFen: number
  discountFen: number
  payFen: number
  coupon: { id: number; name: string; discountFen: number } | null
  pickupCode: string | null
  remark: string
  createdAt: string
  paidAt: string | null
  timeline: { status: OrderStatus; statusText: string; time: string | null }[]
}

const TIMELINE_FIELDS: Record<string, string> = {
  pending_pay: 'created_at',
  paid: 'paid_at',
  making: 'making_at',
  pickable: 'pickable_at',
  completed: 'completed_at',
  cancelled: 'cancelled_at',
}

/** 生成订单号：SY + 北京时间日期 + 6 位随机数 */
export function generateOrderNo(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const date = shifted.toISOString().slice(0, 10).replace(/-/g, '')
  const random = String(randomInt(0, 1000000)).padStart(6, '0')
  return `SY${date}${random}`
}

/** 生成 4 位取餐码 */
export function generatePickupCode(): string {
  return String(randomInt(0, 10000)).padStart(4, '0')
}

function uniqueOrderNo(db: Db): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const orderNo = generateOrderNo()
    const exists = db.prepare('SELECT id FROM orders WHERE order_no = ?').get(orderNo)
    if (!exists) {
      return orderNo
    }
  }
  fail('INTERNAL', '订单号生成失败，请重试')
}

function uniquePickupCode(db: Db): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generatePickupCode()
    const exists = db
      .prepare(`SELECT id FROM orders WHERE pickup_code = ? AND status IN ('paid', 'making', 'pickable')`)
      .get(code)
    if (!exists) {
      return code
    }
  }
  fail('INTERNAL', '取餐码生成失败，请重试')
}

function serializeOrder(db: Db, order: OrderRow): OrderDetail {
  const store = db.prepare('SELECT name FROM stores WHERE id = ?').get(order.store_id) as unknown as
    | { name: string }
    | undefined
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
    .all(order.id) as unknown as OrderItemRow[]
  let coupon: OrderDetail['coupon'] = null
  if (order.member_coupon_id !== null) {
    const row = db
      .prepare(
        `SELECT mc.id, c.name FROM member_coupons mc JOIN coupons c ON c.id = mc.coupon_id WHERE mc.id = ?`,
      )
      .get(order.member_coupon_id) as unknown as { id: number; name: string } | undefined
    if (row) {
      coupon = { id: row.id, name: row.name, discountFen: order.discount_fen }
    }
  }
  const timeline = (Object.keys(TIMELINE_FIELDS) as OrderStatus[])
    .map((status) => {
      const field = TIMELINE_FIELDS[status] as keyof OrderRow
      const time = (order[field] as string | null) ?? null
      return { status, statusText: ORDER_STATUS_TEXT[status], time }
    })
    .filter((entry) => entry.time !== null)
  return {
    id: order.id,
    orderNo: order.order_no,
    storeId: order.store_id,
    storeName: store?.name ?? '',
    orderType: order.order_type as OrderType,
    orderTypeText: ORDER_TYPE_TEXT[order.order_type as OrderType],
    status: order.status as OrderStatus,
    statusText: ORDER_STATUS_TEXT[order.status as OrderStatus],
    items: items.map((item) => {
      const spec = JSON.parse(item.spec) as Record<string, string>
      const specText = Object.values(spec).join(' / ')
      return {
        productId: item.product_id,
        productName: item.product_name,
        specText,
        unitPrice: item.unit_price,
        quantity: item.quantity,
        amount: item.unit_price * item.quantity,
      }
    }),
    totalFen: order.total_fen,
    discountFen: order.discount_fen,
    payFen: order.pay_fen,
    coupon,
    pickupCode: order.pickup_code,
    remark: order.remark,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    timeline,
  }
}

interface CreateOrderBody {
  storeId?: unknown
  orderType?: unknown
  items?: unknown
  memberCouponId?: unknown
  remark?: unknown
}

/** 订单接口：用户端下单 / 支付 / 取消 / 查询，后台管理与状态推进 */
export async function orderRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  app.register(async (instance) => {
    instance.addHook('preHandler', memberGuard(db))

    // 创建订单
    instance.post<{ Body: CreateOrderBody }>('/api/v1/orders', async (request, reply) => {
      const member = request.member!
      const body = request.body ?? {}
      const storeId = Number(body.storeId)
      if (!Number.isInteger(storeId) || storeId <= 0) {
        fail('BAD_REQUEST', '请选择门店')
      }
      const store = db
        .prepare('SELECT id, name, open_time, close_time FROM stores WHERE id = ?')
        .get(storeId) as unknown as { id: number; name: string; open_time: string; close_time: string } | undefined
      if (!store) {
        fail('STORE_NOT_FOUND')
      }
      if (!isWithinBusinessHours(store.open_time, store.close_time)) {
        fail('STORE_CLOSED')
      }
      if (body.orderType !== 'takeout' && body.orderType !== 'dine_in') {
        fail('BAD_REQUEST', '请选择下单方式（自提 / 堂食）')
      }
      const remark = typeof body.remark === 'string' ? body.remark.trim().slice(0, 100) : ''
      const { lines, totalFen } = priceCart(db, body.items as CartItemInput[])

      // 优惠券校验（不核销，支付时才核销）
      let memberCouponId: number | null = null
      let discountFen = 0
      if (body.memberCouponId !== undefined && body.memberCouponId !== null && body.memberCouponId !== '') {
        const row = db
          .prepare(
            `SELECT mc.*, c.name, c.type, c.threshold_fen, c.reduce_fen, c.discount_percent, c.max_reduce_fen
             FROM member_coupons mc JOIN coupons c ON c.id = mc.coupon_id
             WHERE mc.id = ? AND mc.member_id = ?`,
          )
          .get(Number(body.memberCouponId), member.id) as unknown as
          | (Record<string, unknown> & { status: string; valid_from: string; valid_to: string })
          | undefined
        if (!row) {
          fail('COUPON_NOT_FOUND', '优惠券不存在或不属于当前会员')
        }
        if (row.status !== 'unused') {
          fail('COUPON_USED')
        }
        const like: CouponLike = {
          id: Number(row.id),
          type: String(row.type) as CouponLike['type'],
          thresholdFen: Number(row.threshold_fen),
          reduceFen: Number(row.reduce_fen),
          discountPercent: Number(row.discount_percent),
          maxReduceFen: Number(row.max_reduce_fen),
          validFrom: String(row.valid_from),
          validTo: String(row.valid_to),
        }
        if (!isWithinValidity(like)) {
          fail('COUPON_EXPIRED')
        }
        const discount = couponDiscountFen(like, totalFen)
        if (discount <= 0) {
          fail('COUPON_NOT_APPLICABLE')
        }
        memberCouponId = Number(row.id)
        discountFen = discount
      }

      const orderId = withTransaction(db, () => {
        const info = db
          .prepare(
            `INSERT INTO orders (order_no, member_id, store_id, order_type, status, total_fen, discount_fen, pay_fen, member_coupon_id, remark, created_at)
             VALUES (?, ?, ?, ?, 'pending_pay', ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            uniqueOrderNo(db),
            member.id,
            storeId,
            body.orderType as string,
            totalFen,
            discountFen,
            totalFen - discountFen,
            memberCouponId,
            remark,
            new Date().toISOString(),
          )
        const id = Number(info.lastInsertRowid)
        const insertItem = db.prepare(
          `INSERT INTO order_items (order_id, product_id, product_name, spec, unit_price, quantity)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        for (const line of lines) {
          insertItem.run(id, line.productId, line.productName, JSON.stringify(line.spec), line.unitPrice, line.quantity)
        }
        return id
      })

      const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as unknown as OrderRow
      return sendOk(reply, serializeOrder(db, created), 201)
    })

    // 我的订单列表
    instance.get<{ Querystring: { status?: string; page?: string; page_size?: string } }>(
      '/api/v1/orders',
      async (request, reply) => {
        const member = request.member!
        const conditions = ['member_id = ?']
        const params: (string | number)[] = [member.id]
        if (request.query.status !== undefined && request.query.status !== '' && request.query.status !== 'all') {
          if (!isOrderStatus(request.query.status)) {
            fail('BAD_REQUEST', '订单状态不合法')
          }
          conditions.push('status = ?')
          params.push(request.query.status)
        }
        const page = Math.max(1, Number(request.query.page ?? 1) || 1)
        const pageSize = Math.min(50, Math.max(1, Number(request.query.page_size ?? 10) || 10))
        const totalRow = db
          .prepare(`SELECT COUNT(*) AS n FROM orders WHERE ${conditions.join(' AND ')}`)
          .get(...params) as unknown as { n: number }
        const rows = db
          .prepare(`SELECT * FROM orders WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT ? OFFSET ?`)
          .all(...params, pageSize, (page - 1) * pageSize) as unknown as OrderRow[]
        return sendOk(reply, {
          list: rows.map((row) => serializeOrder(db, row)),
          total: totalRow.n,
          page,
          pageSize,
        })
      },
    )

    // 订单详情（仅本人）
    instance.get<{ Params: { id: string } }>('/api/v1/orders/:id', async (request, reply) => {
      const member = request.member!
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '订单 id 不合法')
      }
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | undefined
      if (!order) {
        fail('ORDER_NOT_FOUND')
      }
      if (order.member_id !== member.id) {
        fail('ORDER_FORBIDDEN')
      }
      return sendOk(reply, serializeOrder(db, order))
    })

    // 模拟支付
    instance.post<{ Params: { id: string } }>('/api/v1/orders/:id/pay', async (request, reply) => {
      const member = request.member!
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '订单 id 不合法')
      }
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | undefined
      if (!order) {
        fail('ORDER_NOT_FOUND')
      }
      if (order.member_id !== member.id) {
        fail('ORDER_FORBIDDEN')
      }
      if (!canTransition(order.status as OrderStatus, 'paid')) {
        fail('ORDER_STATUS_INVALID', `当前状态为${ORDER_STATUS_TEXT[order.status as OrderStatus]}，不能支付`)
      }
      const now = new Date().toISOString()
      const pickupCode = uniquePickupCode(db)
      withTransaction(db, () => {
        db.prepare(
          `UPDATE orders SET status = 'paid', paid_at = ?, pickup_code = ? WHERE id = ?`,
        ).run(now, pickupCode, id)
        if (order.member_coupon_id !== null) {
          db.prepare(
            `UPDATE member_coupons SET status = 'used', used_at = ? WHERE id = ? AND status = 'unused'`,
          ).run(now, order.member_coupon_id)
        }
      })
      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow
      return sendOk(reply, serializeOrder(db, updated))
    })

    // 取消订单（支付前）
    instance.post<{ Params: { id: string } }>('/api/v1/orders/:id/cancel', async (request, reply) => {
      const member = request.member!
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '订单 id 不合法')
      }
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | undefined
      if (!order) {
        fail('ORDER_NOT_FOUND')
      }
      if (order.member_id !== member.id) {
        fail('ORDER_FORBIDDEN')
      }
      if (!canTransition(order.status as OrderStatus, 'cancelled')) {
        fail('ORDER_STATUS_INVALID', '只有待支付订单可以取消')
      }
      db.prepare(`UPDATE orders SET status = 'cancelled', cancelled_at = ? WHERE id = ?`).run(
        new Date().toISOString(),
        id,
      )
      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow
      return sendOk(reply, serializeOrder(db, updated))
    })

    // 会员确认取餐（待取餐 → 已完成）
    instance.post<{ Params: { id: string } }>('/api/v1/orders/:id/confirm', async (request, reply) => {
      const member = request.member!
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '订单 id 不合法')
      }
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | undefined
      if (!order) {
        fail('ORDER_NOT_FOUND')
      }
      if (order.member_id !== member.id) {
        fail('ORDER_FORBIDDEN')
      }
      if (!canTransition(order.status as OrderStatus, 'completed')) {
        fail('ORDER_STATUS_INVALID', '只有待取餐订单可以确认取餐')
      }
      db.prepare(`UPDATE orders SET status = 'completed', completed_at = ? WHERE id = ?`).run(
        new Date().toISOString(),
        id,
      )
      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow
      return sendOk(reply, serializeOrder(db, updated))
    })
  })

  // ---------- 后台 ----------

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))

    instance.get('/api/v1/admin/orders', async (request, reply) => {
      const admin = request.admin!
      const query = request.query as {
        store_id?: string
        status?: string
        date?: string
        keyword?: string
        page?: string
        page_size?: string
      }
      const conditions: string[] = []
      const params: (string | number)[] = []
      // 店员只能看到本门店订单
      if (admin.role === 'staff') {
        if (admin.storeId === null) {
          fail('FORBIDDEN', '店员账号未绑定门店')
        }
        conditions.push('o.store_id = ?')
        params.push(admin.storeId)
      } else if (query.store_id !== undefined && query.store_id !== '' && query.store_id !== 'all') {
        const storeId = Number(query.store_id)
        if (!Number.isInteger(storeId) || storeId <= 0) {
          fail('BAD_REQUEST', '门店 id 不合法')
        }
        conditions.push('o.store_id = ?')
        params.push(storeId)
      }
      if (query.status !== undefined && query.status !== '' && query.status !== 'all') {
        if (!isOrderStatus(query.status)) {
          fail('BAD_REQUEST', '订单状态不合法')
        }
        conditions.push('o.status = ?')
        params.push(query.status)
      }
      if (query.date !== undefined && query.date !== '') {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(query.date.trim())
        if (!match) {
          fail('BAD_REQUEST', '日期格式应为 YYYY-MM-DD')
        }
        const startUtc = new Date(`${query.date.trim()}T00:00:00+08:00`).toISOString()
        const endUtc = new Date(`${query.date.trim()}T23:59:59.999+08:00`).toISOString()
        conditions.push('o.created_at >= ? AND o.created_at <= ?')
        params.push(startUtc, endUtc)
      }
      if (query.keyword !== undefined && query.keyword.trim() !== '') {
        conditions.push('(o.order_no LIKE ? OR m.phone LIKE ?)')
        params.push(`%${query.keyword.trim()}%`, `%${query.keyword.trim()}%`)
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const page = Math.max(1, Number(query.page ?? 1) || 1)
      const pageSize = Math.min(100, Math.max(1, Number(query.page_size ?? 20) || 20))
      const totalRow = db
        .prepare(`SELECT COUNT(*) AS n FROM orders o JOIN members m ON m.id = o.member_id ${where}`)
        .get(...params) as unknown as { n: number }
      const rows = db
        .prepare(
          `SELECT o.*, m.phone AS member_phone, m.nickname AS member_nickname, s.name AS store_name
           FROM orders o
           JOIN members m ON m.id = o.member_id
           JOIN stores s ON s.id = o.store_id
           ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
        )
        .all(...params, pageSize, (page - 1) * pageSize) as unknown as (OrderRow & {
        member_phone: string
        member_nickname: string
        store_name: string
      })[]
      return sendOk(
        reply,
        rows.map((row) => ({
          id: row.id,
          orderNo: row.order_no,
          storeId: row.store_id,
          storeName: row.store_name,
          memberId: row.member_id,
          memberPhone: maskPhone(row.member_phone),
          memberNickname: row.member_nickname,
          orderType: row.order_type,
          orderTypeText: ORDER_TYPE_TEXT[row.order_type as OrderType],
          status: row.status,
          statusText: ORDER_STATUS_TEXT[row.status as OrderStatus],
          totalFen: row.total_fen,
          discountFen: row.discount_fen,
          payFen: row.pay_fen,
          pickupCode: row.pickup_code,
          remark: row.remark,
          createdAt: row.created_at,
          paidAt: row.paid_at,
        })),
      )
    })

    instance.get<{ Params: { id: string } }>('/api/v1/admin/orders/:id', async (request, reply) => {
      const admin = request.admin!
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '订单 id 不合法')
      }
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | undefined
      if (!order) {
        fail('ORDER_NOT_FOUND')
      }
      if (admin.role === 'staff' && admin.storeId !== order.store_id) {
        fail('ORDER_FORBIDDEN', '店员只能操作本门店订单')
      }
      const member = db
        .prepare('SELECT phone, nickname FROM members WHERE id = ?')
        .get(order.member_id) as unknown as { phone: string; nickname: string }
      const detail = serializeOrder(db, order)
      return sendOk(reply, {
        ...detail,
        memberPhone: maskPhone(member.phone),
        memberNickname: member.nickname,
      })
    })

    // 推进订单状态
    instance.post<{ Params: { id: string } }>('/api/v1/admin/orders/:id/advance', async (request, reply) => {
      const admin = request.admin!
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '订单 id 不合法')
      }
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | undefined
      if (!order) {
        fail('ORDER_NOT_FOUND')
      }
      if (admin.role === 'staff' && admin.storeId !== order.store_id) {
        fail('ORDER_FORBIDDEN', '店员只能操作本门店订单')
      }
      const target = nextStatus(order.status as OrderStatus)
      if (!target) {
        fail('ORDER_STATUS_INVALID', `当前状态为${ORDER_STATUS_TEXT[order.status as OrderStatus]}，无法继续推进`)
      }
      const now = new Date().toISOString()
      const field = TIMELINE_FIELDS[target] as string
      db.prepare(`UPDATE orders SET status = ?, ${field} = ? WHERE id = ?`).run(target, now, id)
      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow
      return sendOk(reply, serializeOrder(db, updated))
    })
  })
}
