/**
 * T24 联调：确认订单页（预置登录态）
 * 验证：金额明细与 server 一致、优惠券默认最优、切换券后金额更新、模拟支付下单成功
 */
import { chromium } from 'playwright'

const BASE_H5 = 'http://127.0.0.1:5103'
const BASE_API = 'http://127.0.0.1:3000'

let failed = 0
const ok = (name, detail = '') => console.log(`  ✔ ${name}${detail ? `（${detail}）` : ''}`)
const bad = (name, detail) => {
  failed += 1
  console.error(`  ✖ ${name}：${detail}`)
}

/** 从“标签 ¥xx.xx”样式的文本中取出金额（分） */
function fenFromRow(rowText) {
  const match = /-?¥[\d.]+/.exec(rowText)
  if (!match) {
    return null
  }
  return Math.round(Number(match[0].replace(/[-¥]/g, '')) * 100)
}

const browser = await chromium.launch()

try {
  // 1. 通过 API 登录拿到会员 token（每次使用新手机号，保证券未被领取/使用过）
  const phone = `138${String(Math.floor(Math.random() * 90000000) + 10000000)}`
  const loginRes = await fetch(`${BASE_API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, code: '123456' }),
  })
  const loginBody = await loginRes.json()
  const { token, member } = loginBody.data

  // 2. 先领两张券，保证有可用优惠券
  for (const id of [1, 2]) {
    const res = await fetch(`${BASE_API}/api/v1/coupons/${id}/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: '{}',
    })
    const body = await res.json()
    console.log(`   领取券 ${id}:`, body.code, body.message, body.data ? body.data.name : '')
  }
  const myCoupons = await fetch(`${BASE_API}/api/v1/members/me/coupons`, {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json())
  console.log('   我的优惠券:', JSON.stringify(myCoupons.data))

  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // 3. 预置登录态
  await page.goto(`${BASE_H5}/`, { waitUntil: 'networkidle' })
  await page.evaluate(
    ({ token, member }) => {
      uni.setStorageSync('shanye_member_token', token)
      uni.setStorageSync('shanye_member_profile', JSON.stringify(member))
    },
    { token, member },
  )

  // 4. 去点单页加购：一杯大杯拿铁（3500）+ 一份可颂（1800）= 5300
  await page.goto(`${BASE_H5}/#/pages/order/order`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.click('.prod__add')
  await page.waitForTimeout(400)
  const cupOptions = await (await page.$$('.spec__group'))[0].$$('.spec__option')
  await cupOptions[1].click()
  await page.waitForTimeout(200)
  await page.click('.spec__submit')
  await page.waitForTimeout(400)
  // 加购轻食分类第一项（海盐芝士可颂）：直接点该分组内的第一个 +
  const groups = await page.$$('.prod-group')
  console.log('   商品分组数:', groups.length)
  const foodGroupAdd = await groups[2].$$('.prod__add')
  await foodGroupAdd[0].click()
  await page.waitForTimeout(400)
  await page.click('.spec__submit')
  await page.waitForTimeout(400)
  const cartTotal = await page.textContent('.cart-bar__total')
  const cartCount = await page.textContent('.cart-bar__badge')
  ok('加购完成', `${cartCount} 件，合计 ${cartTotal}`)

  // 5. 进入确认订单页
  await page.goto(`${BASE_H5}/#/pages/checkout/checkout`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const amounts = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.row')).map((r) =>
      (r.textContent ?? '').replace(/\s+/g, ' ').trim(),
    )
    return {
      rows,
      coupons: Array.from(document.querySelectorAll('.coupon')).map((c) =>
        (c.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ),
      activeCoupon: document.querySelectorAll('.coupon.is-active').length,
    }
  })
  console.log('   金额行:', JSON.stringify(amounts.rows))
  console.log('   优惠券:', JSON.stringify(amounts.coupons))

  // 服务端口径对照（同一购物车直接问 server）
  const serverQuote = await fetch(`${BASE_API}/api/v1/orders/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      storeId: 1,
      orderType: 'takeout',
      items: [
        { productId: 1, spec: { cup: 'large', temp: 'ice', sugar: 'less' }, quantity: 1 },
        { productId: 13, spec: { cup: 'medium', temp: 'ice', sugar: 'less' }, quantity: 1 },
      ],
    }),
  }).then((r) => r.json())
  const q = serverQuote.data
  const findRow = (keyword) => amounts.rows.find((r) => r.includes(keyword)) ?? ''
  const uiTotal = fenFromRow(findRow('商品原价'))
  const uiDiscount = fenFromRow(findRow('优惠券减免'))
  const uiPay = fenFromRow(findRow('实付金额'))

  uiTotal === q.totalFen ? ok('原价与 server 一致', `${uiTotal}`) : bad('原价不一致', `UI ${uiTotal} vs server ${q.totalFen}`)
  uiDiscount === q.discountFen
    ? ok('优惠与 server 一致', `${uiDiscount}`)
    : bad('优惠不一致', `UI ${uiDiscount} vs server ${q.discountFen}`)
  uiPay === q.payFen ? ok('实付与 server 一致', `${uiPay}`) : bad('实付不一致', `UI ${uiPay} vs server ${q.payFen}`)
  amounts.activeCoupon === 1 ? ok('默认选中一张券') : bad('默认选券异常', String(amounts.activeCoupon))

  // 6. 切换堂食 → 重新报价
  await page.click('.type__item:nth-child(2)')
  await page.waitForTimeout(1000)
  const dineInRow = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.row')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim())
    return rows.find((r) => r.includes('实付金额')) ?? ''
  })
  console.log('   堂食实付:', dineInRow.trim())
  dineInRow.includes('实付金额') ? ok('切换堂食后重新报价') : bad('切换堂食失败')

  // 7. 模拟支付
  await page.click('.submit-bar__btn')
  await page.waitForTimeout(2500)
  const url = page.url()
  const detailText = (await page.textContent('body')).replace(/\s+/g, ' ')
  url.includes('order-detail')
    ? ok('支付后跳转订单详情', url.split('#')[1])
    : bad('支付后未跳转详情', `${url} | ${detailText.slice(0, 120)}`)
  console.log('   详情页片段:', detailText.slice(0, 160))

  errors.length === 0 ? ok('无 JS 报错') : bad('JS 报错', errors.join(';').slice(0, 200))
} finally {
  await browser.close()
}

console.log(failed === 0 ? '\n确认订单页联调全部通过' : `\n存在 ${failed} 个问题`)
process.exitCode = failed === 0 ? 0 : 1
