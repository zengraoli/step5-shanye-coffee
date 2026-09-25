import type { FastifyInstance } from 'fastify'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
import {
  couponDiscountFen,
  couponTypeText,
  isWithinValidity,
  pickBestCoupon,
  type CouponLike,
  type CouponType,
} from '../lib/coupon.js'
import { isWithinBusinessHours } from '../lib/time.js'
import { adminGuard, adminOnly, memberGuard } from '../lib/guards.js'
import { withTransaction } from '../db/tx.js'
import { priceCart, type CartItemInput } from './pricing.js'

interface CouponRow {
  id: number
  name: string
  type: string
  threshold_fen: number
  reduce_fen: number
  discount_percent: number
  max_reduce_fen: number
  valid_days: number
  total: number
  remaining: number
  status: string
  created_at: string
}

interface MemberCouponRow {
  id: number
  coupon_id: number
  member_id: number
  status: string
  valid_from: string
  valid_to: string
  obtained_at: string
  used_at: string | null
  name: string
  type: string
  threshold_fen: number
  reduce_fen: number
  discount_percent: number
  max_reduce_fen: number
}

function serializeTemplate(row: CouponRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    typeText: couponTypeText(row.type as CouponType),
    thresholdFen: row.threshold_fen,
    reduceFen: row.reduce_fen,
    discountPercent: row.discount_percent,
    maxReduceFen: row.max_reduce_fen,
    validDays: row.valid_days,
    total: row.total,
    remaining: row.remaining,
    status: row.status,
  }
}

function toCouponLike(row: {
  id: number
  type: string
  threshold_fen: number
  reduce_fen: number
  discount_percent: number
  max_reduce_fen: number
  valid_from: string
  valid_to: string
}): CouponLike {
  return {
    id: row.id,
    type: row.type as CouponType,
    thresholdFen: row.threshold_fen,
    reduceFen: row.reduce_fen,
    discountPercent: row.discount_percent,
    maxReduceFen: row.max_reduce_fen,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  }
}

function serializeMemberCoupon(row: MemberCouponRow, now: Date) {
  const expired = row.status === 'unused' && !isWithinValidity(
    { ...toCouponLike(row), validFrom: row.valid_from, validTo: row.valid_to },
    now,
  )
  const status = expired ? 'expired' : row.status
  const statusText = status === 'unused' ? '未使用' : status === 'used' ? '已使用' : '已过期'
  return {
    id: row.id,
    couponId: row.coupon_id,
    name: row.name,
    type: row.type,
    typeText: couponTypeText(row.type as CouponType),
    thresholdFen: row.threshold_fen,
    reduceFen: row.reduce_fen,
    discountPercent: row.discount_percent,
    maxReduceFen: row.max_reduce_fen,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    status,
    statusText,
    obtainedAt: row.obtained_at,
    usedAt: row.used_at,
  }
}

/** 优惠券接口：用户端领取/列表/下单报价 + 后台模板管理 */
export async function couponRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  // 可领取的券模板（公开）
  app.get('/api/v1/coupons', async (_request, reply) => {
    const rows = db
      .prepare(`SELECT * FROM coupons WHERE status = 'active' AND remaining > 0 ORDER BY id`)
      .all() as unknown as CouponRow[]
    return sendOk(reply, rows.map(serializeTemplate))
  })

  app.register(async (instance) => {
    instance.addHook('preHandler', memberGuard(db))

    // 我的优惠券
    instance.get<{ Querystring: { status?: string } }>('/api/v1/members/me/coupons', async (request, reply) => {
      const member = request.member!
      const filter = request.query.status
      const rows = db
        .prepare(
          `SELECT mc.*, c.name, c.type, c.threshold_fen, c.reduce_fen, c.discount_percent, c.max_reduce_fen
           FROM member_coupons mc JOIN coupons c ON c.id = mc.coupon_id
           WHERE mc.member_id = ? ORDER BY mc.id DESC`,
        )
        .all(member.id) as unknown as MemberCouponRow[]
      const now = new Date()
      let list = rows.map((row) => serializeMemberCoupon(row, now))
      if (filter === 'unused' || filter === 'used' || filter === 'expired') {
        list = list.filter((item) => item.status === filter)
      }
      return sendOk(reply, list)
    })

    // 领取优惠券
    instance.post<{ Params: { id: string } }>('/api/v1/coupons/:id/claim', async (request, reply) => {
      const member = request.member!
      const couponId = Number(request.params.id)
      if (!Number.isInteger(couponId) || couponId <= 0) {
        fail('BAD_REQUEST', '优惠券 id 不合法')
      }
      const template = db.prepare('SELECT * FROM coupons WHERE id = ?').get(couponId) as unknown as CouponRow | undefined
      if (!template || template.status !== 'active') {
        fail('COUPON_NOT_FOUND')
      }
      if (template.remaining <= 0) {
        fail('COUPON_NOT_FOUND', '优惠券已被领完')
      }
      const owned = db
        .prepare('SELECT id FROM member_coupons WHERE coupon_id = ? AND member_id = ?')
        .get(couponId, member.id)
      if (owned) {
        fail('COUPON_ALREADY_CLAIMED')
      }
      const now = new Date()
      const validTo = new Date(now.getTime() + template.valid_days * 24 * 60 * 60 * 1000)
      const id = withTransaction(db, () => {
        const info = db
          .prepare(
            `INSERT INTO member_coupons (coupon_id, member_id, status, valid_from, valid_to, obtained_at)
             VALUES (?, ?, 'unused', ?, ?, ?)`,
          )
          .run(couponId, member.id, now.toISOString(), validTo.toISOString(), now.toISOString())
        db.prepare('UPDATE coupons SET remaining = remaining - 1 WHERE id = ?').run(couponId)
        return Number(info.lastInsertRowid)
      })
      const row = db
        .prepare(
          `SELECT mc.*, c.name, c.type, c.threshold_fen, c.reduce_fen, c.discount_percent, c.max_reduce_fen
           FROM member_coupons mc JOIN coupons c ON c.id = mc.coupon_id WHERE mc.id = ?`,
        )
        .get(id) as unknown as MemberCouponRow
      return sendOk(reply, serializeMemberCoupon(row, now), 201)
    })

    // 下单报价：计算金额明细并推荐最优券
    interface QuoteBody {
      storeId?: unknown
      orderType?: unknown
      items?: unknown
      memberCouponId?: unknown
    }
    instance.post<{ Body: QuoteBody }>('/api/v1/orders/quote', async (request, reply) => {
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
      if (body.orderType !== 'takeout' && body.orderType !== 'dine_in') {
        fail('BAD_REQUEST', '请选择下单方式（自提 / 堂食）')
      }
      if (!isWithinBusinessHours(store.open_time, store.close_time)) {
        fail('STORE_CLOSED')
      }
      const { lines, totalFen } = priceCart(db, body.items as CartItemInput[])
      const now = new Date()

      const ownCoupons = db
        .prepare(
          `SELECT mc.*, c.name, c.type, c.threshold_fen, c.reduce_fen, c.discount_percent, c.max_reduce_fen
           FROM member_coupons mc JOIN coupons c ON c.id = mc.coupon_id
           WHERE mc.member_id = ? AND mc.status = 'unused' ORDER BY mc.id`,
        )
        .all(member.id) as unknown as MemberCouponRow[]

      const candidates = ownCoupons
        .map((row) => toCouponLike(row))
        .filter((coupon) => isWithinValidity(coupon, now))

      const couponOptions = ownCoupons.map((row) => {
        const coupon = toCouponLike(row)
        const valid = isWithinValidity(coupon, now)
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          typeText: couponTypeText(row.type as CouponType),
          thresholdFen: row.threshold_fen,
          reduceFen: row.reduce_fen,
          discountPercent: row.discount_percent,
          maxReduceFen: row.max_reduce_fen,
          validTo: row.valid_to,
          usable: valid,
          discountFen: valid ? couponDiscountFen(coupon, totalFen) : 0,
        }
      })

      let selectedId: number | null = null
      let discountFen = 0
      if (body.memberCouponId !== undefined && body.memberCouponId !== null && body.memberCouponId !== '') {
        const selected = ownCoupons.find((row) => row.id === Number(body.memberCouponId))
        if (!selected) {
          fail('COUPON_NOT_FOUND', '优惠券不存在或不属于当前会员')
        }
        if (selected.status !== 'unused') {
          fail('COUPON_USED')
        }
        if (!isWithinValidity(toCouponLike(selected), now)) {
          fail('COUPON_EXPIRED')
        }
        const discount = couponDiscountFen(toCouponLike(selected), totalFen)
        if (discount <= 0) {
          fail('COUPON_NOT_APPLICABLE')
        }
        selectedId = selected.id
        discountFen = discount
      } else {
        const best = pickBestCoupon(candidates, totalFen, now)
        if (best) {
          selectedId = best.id
          discountFen = couponDiscountFen(best, totalFen)
        }
      }

      return sendOk(reply, {
        storeId: store.id,
        storeName: store.name,
        orderType: body.orderType,
        items: lines,
        totalFen,
        discountFen,
        payFen: totalFen - discountFen,
        coupons: couponOptions,
        bestCouponId: selectedId,
        selectedCouponId: selectedId,
      })
    })
  })

  // ---------- 后台：券模板管理（仅管理员） ----------

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))
    instance.addHook('preHandler', adminOnly())

    instance.get('/api/v1/admin/coupons', async (_request, reply) => {
      const rows = db.prepare('SELECT * FROM coupons ORDER BY id').all() as unknown as CouponRow[]
      const usage = db
        .prepare(`SELECT coupon_id, COUNT(*) AS n FROM member_coupons GROUP BY coupon_id`)
        .all() as unknown as { coupon_id: number; n: number }[]
      const usageMap = new Map(usage.map((row) => [row.coupon_id, row.n]))
      return sendOk(
        reply,
        rows.map((row) => ({ ...serializeTemplate(row), claimedCount: usageMap.get(row.id) ?? 0 })),
      )
    })

    interface CouponPayload {
      name?: unknown
      type?: unknown
      thresholdFen?: unknown
      reduceFen?: unknown
      discountPercent?: unknown
      maxReduceFen?: unknown
      validDays?: unknown
      total?: unknown
    }

    instance.post<{ Body: CouponPayload }>('/api/v1/admin/coupons', async (request, reply) => {
      const payload = request.body ?? {}
      const name = typeof payload.name === 'string' ? payload.name.trim() : ''
      if (name.length === 0 || name.length > 30) {
        fail('BAD_REQUEST', '券名称必填且不超过 30 个字')
      }
      const type = payload.type
      if (type !== 'full_reduction' && type !== 'discount') {
        fail('BAD_REQUEST', '券类型必须是 full_reduction 或 discount')
      }
      const thresholdFen = Number(payload.thresholdFen ?? 0)
      const reduceFen = Number(payload.reduceFen ?? 0)
      const discountPercent = Number(payload.discountPercent ?? 100)
      const maxReduceFen = Number(payload.maxReduceFen ?? 0)
      const validDays = Number(payload.validDays ?? 7)
      const total = Number(payload.total ?? 0)
      if (!Number.isInteger(thresholdFen) || thresholdFen < 0) {
        fail('BAD_REQUEST', '使用门槛必须为不小于 0 的整数分')
      }
      if (!Number.isInteger(validDays) || validDays <= 0 || validDays > 365) {
        fail('BAD_REQUEST', '有效天数必须为 1-365 的整数')
      }
      if (!Number.isInteger(total) || total <= 0 || total > 100000) {
        fail('BAD_REQUEST', '发放总量必须为 1-100000 的整数')
      }
      if (type === 'full_reduction') {
        if (!Number.isInteger(reduceFen) || reduceFen <= 0) {
          fail('BAD_REQUEST', '满减券减免金额必须为大于 0 的整数分')
        }
        if (thresholdFen <= 0) {
          fail('BAD_REQUEST', '满减券使用门槛必须大于 0')
        }
      } else {
        if (!Number.isInteger(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
          fail('BAD_REQUEST', '折扣必须在 1-99 之间')
        }
        if (!Number.isInteger(maxReduceFen) || maxReduceFen < 0) {
          fail('BAD_REQUEST', '最高减免必须为不小于 0 的整数分')
        }
      }
      const info = db
        .prepare(
          `INSERT INTO coupons (name, type, threshold_fen, reduce_fen, discount_percent, max_reduce_fen, valid_days, total, remaining, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        )
        .run(
          name,
          type,
          thresholdFen,
          type === 'full_reduction' ? reduceFen : 0,
          type === 'discount' ? discountPercent : 100,
          maxReduceFen,
          validDays,
          total,
          total,
          new Date().toISOString(),
        )
      const created = db.prepare('SELECT * FROM coupons WHERE id = ?').get(Number(info.lastInsertRowid)) as unknown as CouponRow
      return sendOk(reply, serializeTemplate(created), 201)
    })

    instance.put<{ Params: { id: string }; Body: CouponPayload }>('/api/v1/admin/coupons/:id', async (request, reply) => {
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '优惠券 id 不合法')
      }
      const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as unknown as CouponRow | undefined
      if (!existing) {
        fail('COUPON_NOT_FOUND')
      }
      const payload = request.body ?? {}
      const updates: string[] = []
      const params: (string | number)[] = []
      if (payload.name !== undefined) {
        const name = typeof payload.name === 'string' ? payload.name.trim() : ''
        if (name.length === 0 || name.length > 30) {
          fail('BAD_REQUEST', '券名称必填且不超过 30 个字')
        }
        updates.push('name = ?')
        params.push(name)
      }
      if (payload.thresholdFen !== undefined) {
        const value = Number(payload.thresholdFen)
        if (!Number.isInteger(value) || value < 0) {
          fail('BAD_REQUEST', '使用门槛必须为不小于 0 的整数分')
        }
        updates.push('threshold_fen = ?')
        params.push(value)
      }
      if (payload.reduceFen !== undefined) {
        const value = Number(payload.reduceFen)
        if (!Number.isInteger(value) || value <= 0) {
          fail('BAD_REQUEST', '满减券减免金额必须为大于 0 的整数分')
        }
        updates.push('reduce_fen = ?')
        params.push(value)
      }
      if (payload.discountPercent !== undefined) {
        const value = Number(payload.discountPercent)
        if (!Number.isInteger(value) || value <= 0 || value >= 100) {
          fail('BAD_REQUEST', '折扣必须在 1-99 之间')
        }
        updates.push('discount_percent = ?')
        params.push(value)
      }
      if (payload.maxReduceFen !== undefined) {
        const value = Number(payload.maxReduceFen)
        if (!Number.isInteger(value) || value < 0) {
          fail('BAD_REQUEST', '最高减免必须为不小于 0 的整数分')
        }
        updates.push('max_reduce_fen = ?')
        params.push(value)
      }
      if (payload.validDays !== undefined) {
        const value = Number(payload.validDays)
        if (!Number.isInteger(value) || value <= 0 || value > 365) {
          fail('BAD_REQUEST', '有效天数必须为 1-365 的整数')
        }
        updates.push('valid_days = ?')
        params.push(value)
      }
      if (updates.length === 0) {
        fail('BAD_REQUEST', '没有需要更新的字段')
      }
      params.push(id)
      db.prepare(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`).run(...params)
      const updated = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as unknown as CouponRow
      return sendOk(reply, serializeTemplate(updated))
    })

    instance.patch<{ Params: { id: string }; Body: { status?: unknown } }>(
      '/api/v1/admin/coupons/:id/status',
      async (request, reply) => {
        const id = Number(request.params.id)
        if (!Number.isInteger(id) || id <= 0) {
          fail('BAD_REQUEST', '优惠券 id 不合法')
        }
        const status = request.body?.status
        if (status !== 'active' && status !== 'inactive') {
          fail('BAD_REQUEST', '状态必须为 active 或 inactive')
        }
        const info = db.prepare('UPDATE coupons SET status = ? WHERE id = ?').run(status, id)
        if (info.changes === 0) {
          fail('COUPON_NOT_FOUND')
        }
        const updated = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as unknown as CouponRow
        return sendOk(reply, serializeTemplate(updated))
      },
    )
  })
}
