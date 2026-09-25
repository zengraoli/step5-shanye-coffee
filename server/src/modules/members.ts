import type { FastifyInstance } from 'fastify'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
import { maskPhone } from '../lib/phone.js'
import { adminGuard, adminOnly, memberGuard } from '../lib/guards.js'
import { serializeMember } from './points.js'
import { isOrderStatus } from '../lib/order-status.js'

interface MemberRow {
  id: number
  phone: string
  nickname: string
  points: number
  level: string
  created_at: string
}

/** 会员接口：积分明细（用户端）+ 会员管理（后台） */
export async function memberRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  // ---------- 用户端 ----------

  app.register(async (instance) => {
    instance.addHook('preHandler', memberGuard(db))

    // 积分总览与明细
    instance.get('/api/v1/members/me/points', async (request, reply) => {
      const member = request.member!
      const row = db.prepare('SELECT * FROM members WHERE id = ?').get(member.id) as unknown as MemberRow
      const profile = serializeMember(db, row)
      const logs = db
        .prepare(
          `SELECT id, change, reason, order_id, created_at FROM points_logs
           WHERE member_id = ? ORDER BY id DESC LIMIT 100`,
        )
        .all(member.id) as unknown as {
        id: number
        change: number
        reason: string
        order_id: number | null
        created_at: string
      }[]
      const earned = db
        .prepare(`SELECT COALESCE(SUM(change), 0) AS n FROM points_logs WHERE member_id = ? AND change > 0`)
        .get(member.id) as unknown as { n: number }
      return sendOk(reply, {
        profile,
        totalEarned: earned.n,
        logs: logs.map((log) => ({
          id: log.id,
          change: log.change,
          reason: log.reason,
          orderId: log.order_id,
          createdAt: log.created_at,
        })),
      })
    })
  })

  // ---------- 后台 ----------

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))
    instance.addHook('preHandler', adminOnly())

    // 会员列表（手机号脱敏）
    instance.get<{
      Querystring: { keyword?: string; level?: string; page?: string; page_size?: string }
    }>('/api/v1/admin/members', async (request, reply) => {
      const query = request.query
      const conditions: string[] = []
      const params: (string | number)[] = []
      if (query.keyword !== undefined && query.keyword.trim() !== '') {
        conditions.push('(m.phone LIKE ? OR m.nickname LIKE ?)')
        params.push(`%${query.keyword.trim()}%`, `%${query.keyword.trim()}%`)
      }
      if (query.level !== undefined && query.level !== '' && query.level !== 'all') {
        if (!['silver', 'gold', 'black'].includes(query.level)) {
          fail('BAD_REQUEST', '会员等级不合法')
        }
        conditions.push('m.level = ?')
        params.push(query.level)
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const page = Math.max(1, Number(query.page ?? 1) || 1)
      const pageSize = Math.min(100, Math.max(1, Number(query.page_size ?? 20) || 20))
      const totalRow = db
        .prepare(`SELECT COUNT(*) AS n FROM members m ${where}`)
        .get(...params) as unknown as { n: number }
      const rows = db
        .prepare(
          `SELECT m.*,
             (SELECT COUNT(*) FROM orders o WHERE o.member_id = m.id) AS order_count,
             (SELECT COALESCE(SUM(o.pay_fen), 0) FROM orders o WHERE o.member_id = m.id AND o.status != 'cancelled') AS total_pay_fen,
             (SELECT MAX(o.created_at) FROM orders o WHERE o.member_id = m.id) AS last_order_at
           FROM members m ${where} ORDER BY m.points DESC, m.id DESC LIMIT ? OFFSET ?`,
        )
        .all(...params, pageSize, (page - 1) * pageSize) as unknown as (MemberRow & {
        order_count: number
        total_pay_fen: number
        last_order_at: string | null
      })[]
      return sendOk(reply, {
        list: rows.map((row) => ({
          ...serializeMember(db, row),
          phone: maskPhone(row.phone),
          orderCount: row.order_count,
          totalPayFen: row.total_pay_fen,
          lastOrderAt: row.last_order_at,
        })),
        total: totalRow.n,
        page,
        pageSize,
      })
    })

    // 会员详情
    instance.get<{ Params: { id: string } }>('/api/v1/admin/members/:id', async (request, reply) => {
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '会员 id 不合法')
      }
      const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as unknown as MemberRow | undefined
      if (!row) {
        fail('NOT_FOUND', '会员不存在')
      }
      const orders = db
        .prepare('SELECT * FROM orders WHERE member_id = ? ORDER BY id DESC LIMIT 50')
        .all(id) as unknown as {
        id: number
        order_no: string
        store_id: number
        order_type: string
        status: string
        total_fen: number
        discount_fen: number
        pay_fen: number
        pickup_code: string | null
        created_at: string
      }[]
      const logs = db
        .prepare('SELECT id, change, reason, order_id, created_at FROM points_logs WHERE member_id = ? ORDER BY id DESC LIMIT 100')
        .all(id) as unknown as {
        id: number
        change: number
        reason: string
        order_id: number | null
        created_at: string
      }[]
      const coupons = db
        .prepare(
          `SELECT mc.id, mc.status, mc.valid_from, mc.valid_to, c.name, c.type
           FROM member_coupons mc JOIN coupons c ON c.id = mc.coupon_id
           WHERE mc.member_id = ? ORDER BY mc.id DESC`,
        )
        .all(id) as unknown as {
        id: number
        status: string
        valid_from: string
        valid_to: string
        name: string
        type: string
      }[]
      return sendOk(reply, {
        ...serializeMember(db, row),
        phone: maskPhone(row.phone),
        orders: orders.map((order) => ({
          id: order.id,
          orderNo: order.order_no,
          storeId: order.store_id,
          orderType: order.order_type,
          status: isOrderStatus(order.status) ? order.status : order.status,
          totalFen: order.total_fen,
          discountFen: order.discount_fen,
          payFen: order.pay_fen,
          pickupCode: order.pickup_code,
          createdAt: order.created_at,
        })),
        pointsLogs: logs.map((log) => ({
          id: log.id,
          change: log.change,
          reason: log.reason,
          orderId: log.order_id,
          createdAt: log.created_at,
        })),
        coupons: coupons.map((coupon) => ({
          id: coupon.id,
          name: coupon.name,
          type: coupon.type,
          status: coupon.status,
          validFrom: coupon.valid_from,
          validTo: coupon.valid_to,
        })),
      })
    })
  })
}
