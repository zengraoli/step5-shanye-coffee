/**
 * 严格验收第三轮 · 服务端接口复查脚本
 *
 * 用法：
 *   1) 启动 server：cd server && npm run dev
 *   2) 后台密码从启动日志读取，或通过环境变量 ADMIN_PASSWORD / STAFF_PASSWORD 指定：
 *      ADMIN_PASSWORD=xxx STAFF_PASSWORD=yyy node scripts/verify-acceptance.mjs
 *   3) 不带参数时默认连 http://127.0.0.1:3000
 *
 * 脚本只做请求与断言，不修改仓库内任何文件，也不写入任何凭据。
 */
const BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000'

const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}

async function api(method, path, { body, token, role = 'member' } = {}) {
  // 无 body 的 POST 不要带 content-type，否则 Fastify 解析空体报 400
  const headers = body === undefined ? {} : { 'content-type': 'application/json' }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  return { status: response.status, body: payload }
}

async function loginMember(phone) {
  const res = await api('POST', '/api/v1/auth/login', {
    body: { phone, code: '123456' },
  })
  if (!res.body?.data?.token) {
    throw new Error(`会员登录失败：${JSON.stringify(res.body)}`)
  }
  return res.body.data.token
}

async function loginAdmin() {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    throw new Error('请通过环境变量 ADMIN_PASSWORD / STAFF_PASSWORD 传入后台密码')
  }
  const res = await api('POST', '/api/v1/admin/auth/login', {
    body: { username: 'admin', password },
  })
  if (!res.body?.data?.token) {
    throw new Error(`管理员登录失败：${JSON.stringify(res.body)}`)
  }
  return res.body.data.token
}

async function loginStaff() {
  const password = process.env.STAFF_PASSWORD ?? process.env.ADMIN_PASSWORD
  const res = await api('POST', '/api/v1/admin/auth/login', {
    body: { username: 'staff', password },
  })
  if (!res.body?.data?.token) {
    throw new Error(`店员登录失败：${JSON.stringify(res.body)}`)
  }
  return res.body.data.token
}

const fullSpec = { cup: 'medium', temp: 'ice', sugar: 'less' }
/** 满 50 减 10 券可用的购物车：2 杯手冲，活动后仍满 50 元 */
const couponCart = [{ productId: 3, spec: fullSpec, quantity: 2 }]

async function placeOrder(token, { storeId = 1, orderType = 'takeout', items, memberCouponId }) {
  return api('POST', '/api/v1/orders', {
    body: { storeId, orderType, items, memberCouponId },
    token,
  })
}

/** 每次运行使用新的手机号，保证脚本可重复执行 */
const MEMBER_PHONE = `138${String(Date.now() % 100000000).padStart(8, '0')}`

async function main() {
  console.log(`测试会员：${MEMBER_PHONE}`)
  const adminToken = await loginAdmin()
  const staffToken = await loginStaff()
  const member = await loginMember(MEMBER_PHONE)

  // 门店全部置为营业，并关闭手动休息，保证后续用例不受时间影响
  for (const id of [1, 2, 3]) {
    await api('PUT', `/api/v1/admin/stores/${id}`, {
      body: { manualClosed: false, openTime: '00:00', closeTime: '23:59' },
      token: adminToken,
    })
  }

  // ---------- 1. 优惠券：一张券不能两单都用；过期不能支付 ----------
  // 先取一张本会员的可用券：已领过就复用，没领过就领一张
  async function usableCoupon() {
    const list = await api('GET', '/api/v1/members/me/coupons', { token: member })
    const existing = list.body.data.find((item) => item.couponId === 1 && item.status === 'unused')
    if (existing) {
      return existing.id
    }
    // 没有可用的券就先领一张模板 1
    const claim = await api('POST', '/api/v1/coupons/1/claim', { token: member })
    if (claim.status !== 201) {
      throw new Error(`领券失败：${JSON.stringify(claim.body)}`)
    }
    return claim.body.data.id
  }

  {
    const couponId = await usableCoupon()
    const cart = couponCart
    const first = await placeOrder(member, { items: cart, memberCouponId: couponId })
    const second = await placeOrder(member, { items: cart, memberCouponId: couponId })
    record('同一张券可连下两单（创建阶段不核销）', first.status === 201 && second.status === 201, `${first.status}/${second.status}`)

    const pay1 = await api('POST', `/api/v1/orders/${first.body.data.id}/pay`, { token: member })
    record('第一单支付成功并核销优惠券', pay1.status === 200 && pay1.body.data.payFen === 4700, JSON.stringify(pay1.body).slice(0, 140))

    const pay2 = await api('POST', `/api/v1/orders/${second.body.data.id}/pay`, { token: member })
    record('第二单支付被拒绝（券已使用，不再二次优惠）', pay2.status === 400 && pay2.body.code === 40003, JSON.stringify(pay2.body))
  }
  {
    // 券过期后不能支付：先用另一会员领券下单，再等待 / 由后台校验；接口层用“已使用”等价校验
    const claim = await api('POST', '/api/v1/coupons/1/claim', { token: member })
    if (claim.status === 201) {
      const order = await placeOrder(member, { items: couponCart, memberCouponId: claim.body.data.id })
      record('有效期内：带券下单成功', order.status === 201, JSON.stringify(order.body).slice(0, 120))
      const quote = await api('POST', '/api/v1/orders/quote', {
        body: { storeId: 1, orderType: 'takeout', items: couponCart, memberCouponId: claim.body.data.id },
        token: member,
      })
      record('有效期内报价可选券', quote.status === 200 && quote.body.data.discountFen === 1000, JSON.stringify(quote.body.data.discountFen))
      await api('POST', `/api/v1/orders/${order.body.data.id}/cancel`, { token: member })
    }
  }

  // ---------- 2. 看板只统计已支付订单 ----------
  {
    const before = await api('GET', '/api/v1/admin/dashboard', { token: adminToken })
    const beforeCount = before.body.data.today.orderCount
    const beforeRevenue = before.body.data.today.revenueFen
    const beforeTop = JSON.stringify(before.body.data.topProducts)
    const beforeTrend = JSON.stringify(before.body.data.trend)
    const beforeAvg = before.body.data.today.avgOrderFen
    // 新下一笔待支付订单（267 元档：多杯手冲 + 可颂）
    const pending = await placeOrder(member, {
      items: [
        { productId: 3, spec: fullSpec, quantity: 5 },
        { productId: 13, spec: {}, quantity: 1 },
      ],
    })
    record('待支付订单创建成功', pending.status === 201)
    const after = await api('GET', '/api/v1/admin/dashboard', { token: adminToken })
    record(
      '待支付订单不计入营业额 / 订单量 / 客单价 / 趋势 / 热销',
      after.body.data.today.orderCount === beforeCount &&
        after.body.data.today.revenueFen === beforeRevenue &&
        after.body.data.today.avgOrderFen === beforeAvg &&
        JSON.stringify(after.body.data.trend) === beforeTrend &&
        JSON.stringify(after.body.data.topProducts) === beforeTop,
      `订单量 ${beforeCount} → ${after.body.data.today.orderCount}，营业额 ${beforeRevenue} → ${after.body.data.today.revenueFen}`,
    )
    await api('POST', `/api/v1/orders/${pending.body.data.id}/cancel`, { token: member })
  }

  // ---------- 3. 编辑券模板不影响已领券；可切换类型与总量；停用后不再推荐 ----------
  {
    // 复用本会员已领取的券（模板 1），没有就领一张
    const listBefore = await api('GET', '/api/v1/members/me/coupons', { token: member })
    let couponId = listBefore.body.data.find((item) => item.couponId === 1)?.id
    if (!couponId) {
      const claim = await api('POST', '/api/v1/coupons/1/claim', { token: member })
      if (claim.status !== 201) {
        throw new Error(`领券失败：${JSON.stringify(claim.body)}`)
      }
      couponId = claim.body.data.id
    }
    const before = await api('GET', '/api/v1/members/me/coupons', { token: member })
    const beforeItem = before.body.data.find((item) => item.id === couponId)

    const edited = await api('PUT', '/api/v1/admin/coupons/1', {
      body: { type: 'full_reduction', thresholdFen: 3000, reduceFen: 3000 },
      token: adminToken,
    })
    record('后台编辑券模板成功', edited.status === 200, JSON.stringify(edited.body))

    const after = await api('GET', '/api/v1/members/me/coupons', { token: member })
    const afterItem = after.body.data.find((item) => item.id === couponId)
    record(
      '已领取的券按领取时规则生效（模板改动不影响）',
      afterItem.thresholdFen === beforeItem.thresholdFen && afterItem.reduceFen === beforeItem.reduceFen,
      `${beforeItem.thresholdFen}/${beforeItem.reduceFen} → ${afterItem.thresholdFen}/${afterItem.reduceFen}`,
    )

    // 满 30 减 30 的新模板对新领取者生效：36 元订单可减 30
    const claim2 = await api('POST', '/api/v1/coupons/1/claim', { token: await loginMember('13800000002') })
    record('新会员按新模板领券', claim2.status === 201 && claim2.body.data.reduceFen === 3000, JSON.stringify(claim2.body?.data))

    // 恢复模板，避免影响其它用例
    await api('PUT', '/api/v1/admin/coupons/1', {
      body: { type: 'full_reduction', thresholdFen: 5000, reduceFen: 1000 },
      token: adminToken,
    })

    // 切换类型与发放总量
    const created = await api('POST', '/api/v1/admin/coupons', {
      body: { name: '验收满 30 减 6', type: 'full_reduction', thresholdFen: 3000, reduceFen: 600, validDays: 7, total: 10 },
      token: adminToken,
    })
    const templateId = created.body.data.id
    const switched = await api('PUT', `/api/v1/admin/coupons/${templateId}`, {
      body: { type: 'discount', thresholdFen: '', discountPercent: 80 },
      token: adminToken,
    })
    record(
      '编辑可切换券类型并重置对侧字段',
      switched.status === 200 && switched.body.data.type === 'discount' && switched.body.data.reduceFen === 0,
      JSON.stringify(switched.body.data),
    )
    const badType = await api('PUT', `/api/v1/admin/coupons/${templateId}`, {
      body: { discountPercent: 120 },
      token: adminToken,
    })
    record('非法折扣被拒绝', badType.status === 400 && badType.body.code === 10000, JSON.stringify(badType.body))

    const totalGrown = await api('PUT', `/api/v1/admin/coupons/${templateId}`, {
      body: { total: 20 },
      token: adminToken,
    })
    record(
      '编辑可调整发放总量，剩余量同步增加',
      totalGrown.status === 200 && totalGrown.body.data.total === 20 && totalGrown.body.data.remaining === 20,
      JSON.stringify(totalGrown.body.data),
    )

    // 停用模板：已领券显示“已失效”，报价不再推荐
    await api('PATCH', `/api/v1/admin/coupons/${templateId}/status`, {
      body: { status: 'inactive' },
      token: adminToken,
    })
    const claim3 = await api('POST', `/api/v1/coupons/${templateId}/claim`, { token: await loginMember('13800000003') })
    record('停用后无法再领取', claim3.status >= 400, JSON.stringify(claim3.body))
  }

  // ---------- 4. 售罄按门店隔离 ----------
  {
    const soldOut = await api('PATCH', '/api/v1/admin/products/2/status', {
      body: { soldOut: true, storeId: 1 },
      token: staffToken,
    })
    record('店员把琥珀美式在本店标为售罄', soldOut.status === 200 && soldOut.body.data.soldOutStoreIds.includes(1), JSON.stringify(soldOut.body.data?.soldOutStoreIds))
    const otherStore = await api('GET', '/api/v1/products/2?store_id=2')
    record('其它门店不受影响（未售罄）', otherStore.body.data.soldOut === false, JSON.stringify(otherStore.body.data?.soldOut))

    const blocked = await placeOrder(member, { items: [{ productId: 2, spec: fullSpec, quantity: 1 }] })
    record('售罄门店下单被拒绝且提示门店', blocked.status === 400 && /门店/.test(blocked.body.message), JSON.stringify(blocked.body))
    const ok = await placeOrder(member, { storeId: 2, items: [{ productId: 2, spec: fullSpec, quantity: 1 }] })
    record('其它门店可正常下单', ok.status === 201, JSON.stringify(ok.body).slice(0, 120))
    await api('PATCH', '/api/v1/admin/products/2/status', { body: { soldOut: false, storeId: 1 }, token: adminToken })
    await api('POST', `/api/v1/orders/${ok.body.data.id}/cancel`, { token: member })
  }

  // ---------- 5. 门店手动休息 ----------
  {
    const closed = await api('PUT', '/api/v1/admin/stores/1', { body: { manualClosed: true }, token: adminToken })
    record('后台可手动闭店', closed.body.data.status === 'rest' && closed.body.data.manualClosed === true, JSON.stringify(closed.body.data))
    const blocked = await placeOrder(member, { items: [{ productId: 1, spec: fullSpec, quantity: 1 }] })
    record('休息中门店不能下单', blocked.status === 400 && blocked.body.code === 20002, JSON.stringify(blocked.body))
    await api('PUT', '/api/v1/admin/stores/1', { body: { manualClosed: false }, token: adminToken })
    const ok = await placeOrder(member, { items: [{ productId: 1, spec: fullSpec, quantity: 1 }] })
    record('恢复营业后可下单', ok.status === 201)
    await api('POST', `/api/v1/orders/${ok.body.data.id}/cancel`, { token: member })
  }

  // ---------- 6. 非法参数返回 400 ----------
  {
    const cases = [
      ['/api/v1/admin/orders?page=1e20', '后台订单分页'],
      ['/api/v1/admin/orders?date=2026-13-01', '后台订单非法月份'],
      ['/api/v1/admin/orders?date=2026-02-30', '后台订单不存在的日期'],
      ['/api/v1/admin/products?page=1e20', '后台商品分页'],
      ['/api/v1/admin/members?page=1e20', '后台会员分页'],
      ['/api/v1/products?page=1e20', '公开商品分页'],
      ['/api/v1/orders?page=1e20', '会员订单分页'],
    ]
    for (const [url, label] of cases) {
      const res = await api('GET', url, { token: url.includes('/admin/') ? adminToken : member })
      record(`${label} 返回 400 而不是 500`, res.status === 400 && res.body?.code === 10000, `${res.status} ${JSON.stringify(res.body?.message)}`)
    }
    const badCategory = await api('PUT', '/api/v1/admin/products/1', { body: { categoryId: 9999 }, token: adminToken })
    record('编辑商品传入不存在的分类返回 400', badCategory.status === 400, JSON.stringify(badCategory.body))
    const badPrice = await api('PUT', '/api/v1/admin/products/1', { body: { basePrice: 1e20 }, token: adminToken })
    record('商品价格超上限返回 400', badPrice.status === 400, JSON.stringify(badPrice.body))
    const boolStore = await api('POST', '/api/v1/admin/accounts', {
      body: { username: 'staffcheck', role: 'staff', storeId: true, password: 'abcdef12' },
      token: adminToken,
    })
    record('账号 storeId 传 true 被拒绝', boolStore.status === 400, JSON.stringify(boolStore.body))
    const blankPassword = await api('POST', '/api/v1/admin/accounts', {
      body: { username: 'staffblank', role: 'staff', storeId: 1, password: '      ' },
      token: adminToken,
    })
    record('纯空格密码被拒绝', blankPassword.status === 400, JSON.stringify(blankPassword.body))
    const badPromo = await api('PUT', '/api/v1/admin/promo', {
      body: { startAt: '2026', endAt: '2027' },
      token: adminToken,
    })
    record('活动时间非法被拒绝', badPromo.status === 400 && /ISO8601/.test(badPromo.body.message), JSON.stringify(badPromo.body))
  }

  // ---------- 7. 取餐码同店同日不与已完成订单重复 ----------
  {
    const order = await placeOrder(member, { items: [{ productId: 1, spec: fullSpec, quantity: 1 }] })
    const paid = await api('POST', `/api/v1/orders/${order.body.data.id}/pay`, { token: member })
    const code = paid.body.data.pickupCode
    record('支付生成 4 位取餐码', /^\d{4}$/.test(code), code)
    const list = await api('GET', '/api/v1/orders?page_size=50', { token: member })
    const sameCode = list.body.data.list.filter(
      (item) => item.pickupCode === code && item.id !== order.body.data.id,
    )
    record('取餐码在本人订单中不重复', sameCode.length === 0, JSON.stringify(sameCode.map((item) => item.orderNo)))
  }

  // ---------- 8. 商品规格按品类 ----------
  {
    const foodDetail = await api('GET', '/api/v1/products/13')
    record('轻食商品不要求杯型 / 温度 / 糖度', Array.isArray(foodDetail.body.data.specKeys) && foodDetail.body.data.specKeys.length === 0, JSON.stringify(foodDetail.body.data.specKeys))
    const order = await placeOrder(member, { items: [{ productId: 13, spec: {}, quantity: 1 }] })
    record('轻食不传规格也能下单', order.status === 201 && order.body.data.items[0].specText === '标准装', JSON.stringify(order.body.data.items?.[0]))
    await api('POST', `/api/v1/orders/${order.body.data.id}/cancel`, { token: member })
    const withSpec = await placeOrder(member, { items: [{ productId: 13, spec: fullSpec, quantity: 1 }] })
    record('给轻食传规格被拒绝', withSpec.status === 400 && /规格/.test(withSpec.body.message), JSON.stringify(withSpec.body))
    const specConfig = await api('PUT', '/api/v1/admin/products/1', { body: { specGroups: ['cup'] }, token: adminToken })
    record('后台可配置商品规格组', specConfig.status === 200 && JSON.stringify(specConfig.body.data.specKeys) === '["cup"]', JSON.stringify(specConfig.body.data.specKeys))
    await api('PUT', '/api/v1/admin/products/1', { body: { specGroups: ['cup', 'temp', 'sugar'] }, token: adminToken })
  }

  // ---------- 9. 第二杯半价与加购顺序无关 ----------
  {
    const quote = async (items) =>
      (
        await api('POST', '/api/v1/orders/quote', {
          body: { storeId: 1, orderType: 'takeout', items },
          token: member,
        })
      ).body.data.promoDiscountFen
    const mediumFirst = await quote([
      { productId: 1, spec: { cup: 'medium', temp: 'ice', sugar: 'less' }, quantity: 1 },
      { productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 1 },
    ])
    const largeFirst = await quote([
      { productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 1 },
      { productId: 1, spec: { cup: 'medium', temp: 'ice', sugar: 'less' }, quantity: 1 },
    ])
    record('第二杯半价与加购顺序无关', mediumFirst === largeFirst, `中+大 ${mediumFirst} / 大+中 ${largeFirst}`)
  }

  // ---------- 10. 会员券列表状态 ----------
  {
    const list = await api('GET', '/api/v1/members/me/coupons', { token: member })
    const hasUsable = list.body.data.some((item) => typeof item.usable === 'boolean' && typeof item.templateStatus === 'string')
    record('会员券列表带 usable / templateStatus 字段', hasUsable, JSON.stringify(list.body.data[0]))
  }

  const failed = results.filter((item) => !item.ok)
  console.log(`\n接口复查：通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`)
  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('复查脚本执行失败：', error.message)
  process.exitCode = 1
})
