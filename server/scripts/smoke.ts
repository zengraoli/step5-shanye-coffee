/**
 * 冒烟脚本：会员登录 → 浏览商品 → 领券 → 下单 → 支付 → 状态推进 → 积分到账。
 * 使用独立内存库，不依赖正在运行的服务；任何一步失败即以非 0 退出。
 */
import { randomBytes } from 'node:crypto'
import { buildApp } from '../src/app.js'
import { openDb } from '../src/db/index.js'

const PORT = 3817
const BASE = `http://127.0.0.1:${PORT}`

let passed = 0
let failed = 0

function ok(name: string, detail = ''): void {
  passed += 1
  console.log(`  ✔ ${name}${detail ? `（${detail}）` : ''}`)
}

function bad(name: string, detail: string): void {
  failed += 1
  console.error(`  ✖ ${name}：${detail}`)
}

function check(name: string, condition: boolean, detail: string): void {
  if (condition) {
    ok(name, detail)
  } else {
    bad(name, detail)
  }
}

async function api<T>(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: { code: number; data: T; message: string } }> {
  const headers: Record<string, string> = {}
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  return { status: res.status, body: (await res.json()) as { code: number; data: T; message: string } }
}

async function main(): Promise<void> {
  // 后台账号密码运行时随机生成，仅用于本次冒烟
  process.env.ADMIN_PASSWORD = randomBytes(16).toString('hex')
  process.env.STAFF_PASSWORD = randomBytes(16).toString('hex')

  const { db } = openDb({ path: ':memory:' })
  // 保证门店处于营业时间，避免冒烟受运行时段影响
  db.prepare('UPDATE stores SET open_time = ?, close_time = ?').run('00:00', '23:59')
  const app = await buildApp({ db })

  await app.listen({ port: PORT, host: '127.0.0.1' })
  console.log(`冒烟服务已启动：${BASE}`)

  try {
    // 1. 健康检查
    const health = await api<{ status: string }>('GET', '/health')
    check('健康检查', health.body.code === 0 && health.body.data.status === 'ok', health.body.message)

    // 2. 会员登录
    const login = await api<{ token: string; member: { id: number; phone: string } }>(
      'POST',
      '/api/v1/auth/login',
      { body: { phone: '13812345678', code: '123456' } },
    )
    check('会员登录', login.body.code === 0 && login.body.data.token.length > 20, `会员 ${login.body.data.member.phone}`)
    const memberToken = login.body.data.token

    // 3. 浏览门店与商品
    const stores = await api<unknown[]>('GET', '/api/v1/stores')
    check('门店列表', stores.body.data.length === 3, `${stores.body.data.length} 家门店`)
    const products = await api<{ list: unknown[]; total: number }>('GET', '/api/v1/products?page=1&page_size=10')
    check('商品列表', products.body.data.total === 24, `共 ${products.body.data.total} 个商品`)

    // 4. 领取优惠券
    const claim = await api<{ id: number; name: string }>('POST', '/api/v1/coupons/1/claim', { token: memberToken })
    check('领取优惠券', claim.body.code === 0, claim.body.data.name)
    const couponId = claim.body.data.id

    // 5. 下单报价
    const quote = await api<{
      totalFen: number
      promoDiscountFen: number
      discountFen: number
      payFen: number
      bestCouponId: number | null
    }>(
      'POST',
      '/api/v1/orders/quote',
      {
        token: memberToken,
        body: {
          storeId: 1,
          orderType: 'takeout',
          items: [{ productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 2 }],
          memberCouponId: couponId,
        },
      },
    )
    check(
      '下单报价',
      quote.body.data.totalFen === 7000 &&
        quote.body.data.promoDiscountFen === 1750 &&
        quote.body.data.discountFen === 1000 &&
        quote.body.data.payFen === 4250,
      `原价 ${quote.body.data.totalFen} 分，活动减 ${quote.body.data.promoDiscountFen} 分，券减 ${quote.body.data.discountFen} 分，实付 ${quote.body.data.payFen} 分`,
    )

    // 6. 创建订单
    const created = await api<{ id: number; orderNo: string; status: string }>(
      'POST',
      '/api/v1/orders',
      {
        token: memberToken,
        body: {
          storeId: 1,
          orderType: 'takeout',
          items: [{ productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 2 }],
          memberCouponId: couponId,
          remark: '少冰，谢谢',
        },
      },
    )
    check('创建订单', created.body.code === 0 && created.body.data.status === 'pending_pay', created.body.data.orderNo)
    const orderId = created.body.data.id

    // 7. 模拟支付
    const paid = await api<{ status: string; pickupCode: string | null; payFen: number }>(
      'POST',
      `/api/v1/orders/${orderId}/pay`,
      { token: memberToken },
    )
    check(
      '模拟支付',
      paid.body.data.status === 'paid' && /^\d{4}$/.test(paid.body.data.pickupCode ?? ''),
      `取餐码 ${paid.body.data.pickupCode}`,
    )

    // 8. 重复支付被拒绝
    const repay = await api('POST', `/api/v1/orders/${orderId}/pay`, { token: memberToken })
    check('重复支付被拒绝', repay.body.code === 50002, repay.body.message)

    // 9. 支付后取消被拒绝
    const cancel = await api('POST', `/api/v1/orders/${orderId}/cancel`, { token: memberToken })
    check('支付后不可取消', cancel.body.code === 50002, cancel.body.message)

    // 10. 后台登录并推进状态
    const adminLogin = await api<{ token: string; admin: { role: string } }>(
      'POST',
      '/api/v1/admin/auth/login',
      { body: { username: 'admin', password: process.env.ADMIN_PASSWORD } },
    )
    check('后台登录', adminLogin.body.code === 0 && adminLogin.body.data.admin.role === 'admin', `角色 ${adminLogin.body.data.admin.role}`)
    const adminToken = adminLogin.body.data.token

    const expected = ['making', 'pickable', 'completed']
    let advanceOk = true
    let advanceDetail = ''
    for (const status of expected) {
      const res = await api<{ status: string }>('POST', `/api/v1/admin/orders/${orderId}/advance`, {
        token: adminToken,
      })
      if (res.body.data.status !== status) {
        advanceOk = false
        advanceDetail = `期望 ${status}，实际 ${res.body.data.status}`
        break
      }
    }
    if (advanceOk) {
      advanceDetail = '已支付 → 制作中 → 待取餐 → 已完成'
    }
    check('后台推进订单状态', advanceOk, advanceDetail)

    // 11. 积分到账
    const points = await api<{ profile: { points: number; level: string; levelText: string }; logs: unknown[] }>(
      'GET',
      '/api/v1/members/me/points',
      { token: memberToken },
    )
    check(
      '积分到账',
      points.body.data.profile.points === 42 && points.body.data.logs.length === 1,
      `${points.body.data.profile.points} 分（${points.body.data.profile.levelText}，按实付 4250 分累计）`,
    )

    // 12. 未登录访问受保护接口
    const anonymous = await api('GET', '/api/v1/members/me')
    check('未登录被拦截', anonymous.body.code === 10002, anonymous.body.message)

    // 13. 店员越权被拒绝
    const staffLogin = await api<{ token: string }>('POST', '/api/v1/admin/auth/login', {
      body: { username: 'staff', password: process.env.STAFF_PASSWORD },
    })
    const forbidden = await api('GET', '/api/v1/admin/accounts', { token: staffLogin.body.data.token })
    check('店员越权被拒绝', forbidden.body.code === 10003, forbidden.body.message)

    // 14. OpenAPI 文档
    const spec = await fetch(`${BASE}/docs/json`)
    const specJson = (await spec.json()) as { paths: Record<string, unknown> }
    check('OpenAPI 文档', Object.keys(specJson.paths).length >= 30, `${Object.keys(specJson.paths).length} 个路径`)
  } finally {
    await app.close()
    db.close()
  }

  console.log(`\n冒烟结果：通过 ${passed} 项，失败 ${failed} 项`)
  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error('冒烟脚本执行异常：', error)
  process.exitCode = 1
})
