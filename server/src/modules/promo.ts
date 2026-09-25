import type { FastifyInstance } from 'fastify'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
import { adminGuard, adminOnly } from '../lib/guards.js'
import { isPromoActive, secondHalfDiscountFen, type PromoActivity, type PromoLine } from '../lib/promo.js'
import type { Db } from '../db/index.js'

interface PromoRow {
  id: number
  name: string
  type: string
  status: string
  start_at: string
  end_at: string
}

/** 读取当前活动配置（含适用商品）；没有配置时返回 null */
export function loadPromo(db: Db): PromoActivity | null {
  const row = db.prepare('SELECT * FROM promo_activities ORDER BY id DESC LIMIT 1').get() as
    | PromoRow
    | undefined
  if (!row) {
    return null
  }
  const products = db
    .prepare('SELECT product_id FROM promo_activity_products WHERE activity_id = ? ORDER BY product_id')
    .all(row.id) as { product_id: number }[]
  return {
    id: row.id,
    name: row.name,
    type: 'second_half',
    status: row.status === 'active' ? 'active' : 'inactive',
    startAt: row.start_at,
    endAt: row.end_at,
    productIds: products.map((item) => item.product_id),
  }
}

/** 计算当前生效活动的优惠金额；未生效返回 0 */
export function promoDiscountFor(
  db: Db,
  lines: PromoLine[],
  now: Date = new Date(),
): { activity: PromoActivity | null; discountFen: number } {
  const activity = loadPromo(db)
  if (!isPromoActive(activity, now)) {
    return { activity: null, discountFen: 0 }
  }
  return { activity, discountFen: secondHalfDiscountFen(lines, activity!.productIds) }
}

function serializePromo(activity: PromoActivity | null, now: Date) {
  if (!activity) {
    return { active: false, activity: null }
  }
  return {
    active: isPromoActive(activity, now),
    activity: {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      status: activity.status,
      startAt: activity.startAt,
      endAt: activity.endAt,
      productIds: activity.productIds,
    },
  }
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

/** 活动接口：公开查询当前活动 + 后台配置 */
export async function promoRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  // 当前活动（公开，供官网 / 小程序展示）
  app.get(
    '/api/v1/promo',
    { schema: { tags: ['promo'], summary: '当前进行中的活动（第二杯半价）' } },
    async (_request, reply) => {
      return sendOk(reply, serializePromo(loadPromo(db), new Date()))
    },
  )

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))
    instance.addHook('preHandler', adminOnly())

    // 读取活动配置（含未启用状态，供后台表单回显）
    instance.get(
      '/api/v1/admin/promo',
      { schema: { tags: ['admin', 'promo'], summary: '读取活动配置', security: [{ adminBearer: [] }] } },
      async (_request, reply) => {
        return sendOk(reply, serializePromo(loadPromo(db), new Date()))
      },
    )

    interface PromoPayload {
      status?: unknown
      startAt?: unknown
      endAt?: unknown
      productIds?: unknown
      name?: unknown
    }
    instance.put<{ Body: PromoPayload }>(
      '/api/v1/admin/promo',
      { schema: { tags: ['admin', 'promo'], summary: '保存活动配置（时间与适用商品）', security: [{ adminBearer: [] }] } },
      async (request, reply) => {
        const body = request.body ?? {}
        const current = loadPromo(db)

        const status = body.status !== undefined ? body.status : (current?.status ?? 'inactive')
        if (status !== 'active' && status !== 'inactive') {
          fail('BAD_REQUEST', '状态必须为 active 或 inactive')
        }

        const name = typeof body.name === 'string' && body.name.trim().length > 0
          ? body.name.trim().slice(0, 30)
          : (current?.name ?? '第二杯半价')

        const startAt = typeof body.startAt === 'string' && body.startAt.trim().length > 0
          ? body.startAt.trim()
          : (current?.startAt ?? new Date().toISOString())
        const endAt = typeof body.endAt === 'string' && body.endAt.trim().length > 0
          ? body.endAt.trim()
          : (current?.endAt ?? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString())

        const startTime = new Date(startAt).getTime()
        const endTime = new Date(endAt).getTime()
        if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
          fail('BAD_REQUEST', '活动时间必须为合法的 ISO8601 时间')
        }
        if (endTime <= startTime) {
          fail('BAD_REQUEST', '活动结束时间必须晚于开始时间')
        }

        let productIds: number[] = current?.productIds ?? []
        if (body.productIds !== undefined) {
          if (!Array.isArray(body.productIds)) {
            fail('BAD_REQUEST', '适用商品必须为数组')
          }
          productIds = body.productIds.map((value) => Number(value))
          if (productIds.some((id) => !Number.isInteger(id) || id <= 0)) {
            fail('BAD_REQUEST', '适用商品 id 不合法')
          }
          const unique = [...new Set(productIds)]
          const placeholders = unique.map(() => '?').join(',')
          const existing = db.prepare(`SELECT id FROM products WHERE id IN (${placeholders})`).all(...unique) as
            | { id: number }[]
          if (existing.length !== unique.length) {
            fail('BAD_REQUEST', '适用商品中包含不存在的商品')
          }
          productIds = unique
        }

        const activityId = current?.id ?? null
        if (activityId === null) {
          const info = db
            .prepare(
              `INSERT INTO promo_activities (name, type, status, start_at, end_at, created_at)
               VALUES (?, 'second_half', ?, ?, ?, ?)`,
            )
            .run(name, status, startAt, endAt, new Date().toISOString())
          const newId = Number(info.lastInsertRowid)
          const insert = db.prepare(
            'INSERT OR REPLACE INTO promo_activity_products (activity_id, product_id) VALUES (?, ?)',
          )
          for (const productId of productIds) {
            insert.run(newId, productId)
          }
        } else {
          db.prepare('UPDATE promo_activities SET name = ?, status = ?, start_at = ?, end_at = ? WHERE id = ?').run(
            name,
            status,
            startAt,
            endAt,
            activityId,
          )
          db.prepare('DELETE FROM promo_activity_products WHERE activity_id = ?').run(activityId)
          const insert = db.prepare(
            'INSERT OR REPLACE INTO promo_activity_products (activity_id, product_id) VALUES (?, ?)',
          )
          for (const productId of productIds) {
            insert.run(activityId, productId)
          }
        }

        return sendOk(reply, serializePromo(loadPromo(db), new Date()))
      },
    )
  })
}

// ISO_RE 供调用方校验时间格式（保留导出以便测试）
export { ISO_RE }
