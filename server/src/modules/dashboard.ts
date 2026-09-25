import type { FastifyInstance } from 'fastify'
import { sendOk } from '../lib/response.js'
import { adminGuard } from '../lib/guards.js'
import { maskPhone } from '../lib/phone.js'
import { ORDER_STATUS_TEXT } from '../lib/order-status.js'

interface TrendRow {
  d: string
  order_count: number
  revenue: number
}

interface TopProductRow {
  product_id: number
  product_name: string
  quantity: number
  amount: number
}

interface LatestOrderRow {
  id: number
  order_no: string
  store_id: number
  store_name: string
  member_phone: string
  member_nickname: string
  status: string
  total_fen: number
  discount_fen: number
  pay_fen: number
  pickup_code: string | null
  created_at: string
}

/** 北京时间当天日期 YYYY-MM-DD */
function beijingToday(): string {
  return beijingDate(0)
}

/** 北京时间某一天（相对今天偏移天数）的日期 YYYY-MM-DD */
function beijingDate(offsetDays: number): string {
  return new Date(Date.now() + (8 * 60 + offsetDays * 24 * 60) * 60 * 1000).toISOString().slice(0, 10)
}

/** 北京时间近 N 天（含今天）的日期列表，按时间正序 */
function beijingRecentDays(days: number): string[] {
  const result: string[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    result.push(beijingDate(-i))
  }
  return result
}

/** 后台数据看板：今日经营、近 7 天趋势、热销 Top10、最新订单 */
export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))

    instance.get(
      '/api/v1/admin/dashboard',
      { schema: { tags: ['admin'], summary: '数据看板统计', security: [{ adminBearer: [] }] } },
      async (request, reply) => {
        const admin = request.admin!
        // 店员只看本门店数据
        const isStaff = admin.role === 'staff'
        const storeFilter = isStaff ? 'AND o.store_id = ?' : ''
        const storeParams: number[] = isStaff && admin.storeId !== null ? [admin.storeId] : []

        const days = beijingRecentDays(7)
        const rangeStart = new Date(`${days[0] as string}T00:00:00+08:00`).toISOString()
        const today = beijingToday()

        // 近 7 天趋势（按北京时间分桶，仅统计已支付订单，排除取消）
        const trendRows = db
          .prepare(
            `SELECT strftime('%Y-%m-%d', datetime(o.created_at, '+8 hours')) AS d,
                    COUNT(*) AS order_count,
                    COALESCE(SUM(o.pay_fen), 0) AS revenue
             FROM orders o
             WHERE o.status != 'cancelled' AND o.created_at >= ? ${storeFilter}
             GROUP BY d ORDER BY d`,
          )
          .all(rangeStart, ...storeParams) as unknown as TrendRow[]
        const trendMap = new Map(trendRows.map((row) => [row.d, row]))
        const trend = days.map((date) => ({
          date,
          revenueFen: trendMap.get(date)?.revenue ?? 0,
          orderCount: trendMap.get(date)?.order_count ?? 0,
        }))

        // 今日概览
        const todayRow = db
          .prepare(
            `SELECT COUNT(*) AS order_count, COALESCE(SUM(o.pay_fen), 0) AS revenue
             FROM orders o
             WHERE o.status != 'cancelled'
               AND strftime('%Y-%m-%d', datetime(o.created_at, '+8 hours')) = ? ${storeFilter}`,
          )
          .get(today, ...storeParams) as unknown as { order_count: number; revenue: number }
        const newMembers = db
          .prepare(
            `SELECT COUNT(*) AS n FROM members
             WHERE strftime('%Y-%m-%d', datetime(created_at, '+8 hours')) = ?`,
          )
          .get(today) as unknown as { n: number }
        const orderCount = todayRow.order_count
        const revenueFen = todayRow.revenue
        const avgOrderFen = orderCount > 0 ? Math.round(revenueFen / orderCount) : 0

        // 热销 Top10（按销售数量）
        const topProducts = db
          .prepare(
            `SELECT oi.product_id, oi.product_name,
                    SUM(oi.quantity) AS quantity,
                    SUM(oi.unit_price * oi.quantity) AS amount
             FROM order_items oi JOIN orders o ON o.id = oi.order_id
             WHERE o.status != 'cancelled' ${storeFilter}
             GROUP BY oi.product_id, oi.product_name
             ORDER BY quantity DESC, amount DESC, oi.product_id ASC
             LIMIT 10`,
          )
          .all(...storeParams) as unknown as TopProductRow[]

        // 最新订单
        const latestOrders = db
          .prepare(
            `SELECT o.id, o.order_no, o.store_id, s.name AS store_name, m.phone AS member_phone,
                    m.nickname AS member_nickname, o.status, o.total_fen, o.discount_fen, o.pay_fen,
                    o.pickup_code, o.created_at
             FROM orders o
             JOIN stores s ON s.id = o.store_id
             JOIN members m ON m.id = o.member_id
             WHERE 1 = 1 ${storeFilter}
             ORDER BY o.id DESC LIMIT 10`,
          )
          .all(...storeParams) as unknown as LatestOrderRow[]

        return sendOk(reply, {
          scope: isStaff ? 'store' : 'all',
          storeId: isStaff ? admin.storeId : null,
          today: {
            date: today,
            revenueFen,
            orderCount,
            avgOrderFen,
            newMembers: newMembers.n,
          },
          trend,
          topProducts: topProducts.map((row) => ({
            productId: row.product_id,
            productName: row.product_name,
            quantity: row.quantity,
            amountFen: row.amount,
          })),
          latestOrders: latestOrders.map((row) => ({
            id: row.id,
            orderNo: row.order_no,
            storeId: row.store_id,
            storeName: row.store_name,
            memberPhone: maskPhone(row.member_phone),
            memberNickname: row.member_nickname,
            status: row.status,
            statusText: ORDER_STATUS_TEXT[row.status as keyof typeof ORDER_STATUS_TEXT] ?? row.status,
            totalFen: row.total_fen,
            discountFen: row.discount_fen,
            payFen: row.pay_fen,
            pickupCode: row.pickup_code,
            createdAt: row.created_at,
          })),
        })
      },
    )
  })
}
