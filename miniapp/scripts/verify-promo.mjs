/**
 * T27 联调：第二杯半价活动四端一致性
 * 1) 后台修改活动配置（商品 + 时间）
 * 2) 小程序商品角标 / 结算金额明细 / 下单实付
 * 3) 官网菜单活动标识
 * 4) 后台订单明细显示活动优惠
 */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const H5_MINI = 'http://127.0.0.1:5103'
const H5_WEB = 'http://127.0.0.1:5102'
const ADMIN = 'http://127.0.0.1:5101'
const API = 'http://127.0.0.1:3000'

let failed = 0
const ok = (name, detail = '') => console.log(`  ✔ ${name}${detail ? `（${detail}）` : ''}`)
const bad = (name, detail) => {
  failed += 1
  console.error(`  ✖ ${name}：${detail}`)
}

const api = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  return res.json()
}

const browser = await chromium.launch()

try {
  // ---------- 0. 准备：会员 + 管理员 ----------
  const phone = `188${String(Math.floor(Math.random() * 90000000) + 10000000)}`
  const login = await api('/api/v1/auth/login', { method: 'POST', body: { phone, code: '123456' } })
  const { token, member } = login.data
  const adminLogin = await api('/api/v1/admin/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: process.env.ADMIN_PASS },
  })
  const adminToken = adminLogin.data.token

  // 门店保持营业（联调环境）
  await api('/api/v1/admin/stores/1', {
    method: 'PUT',
    token: adminToken,
    body: { openTime: '00:00', closeTime: '23:59' },
  })

  // ---------- 1. 后台修改活动配置：仅适用商品 1、2 ----------
  const saved = await api('/api/v1/admin/promo', {
    method: 'PUT',
    token: adminToken,
    body: {
      status: 'active',
      name: '第二杯半价',
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2027-01-01T00:00:00.000Z',
      productIds: [1, 2],
    },
  })
  saved.code === 0 && saved.data.activity.productIds.join(',') === '1,2'
    ? ok('后台保存活动配置', `适用商品 [1,2]`)
    : bad('后台保存活动配置', JSON.stringify(saved).slice(0, 160))

  // ---------- 2. 小程序：角标 + 金额明细 ----------
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${H5_MINI}/`, { waitUntil: 'networkidle' })
  await page.evaluate(
    ({ token, member }) => {
      uni.setStorageSync('shanye_member_token', token)
      uni.setStorageSync('shanye_member_profile', JSON.stringify(member))
    },
    { token, member },
  )

  // 点单页角标
  await page.goto(`${H5_MINI}/#/pages/order/order`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  const badges = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.prod')).map((card) => ({
      name: card.querySelector('.prod__name')?.textContent?.trim() ?? '',
      promo: Boolean(card.querySelector('.prod__promo')),
    })),
  )
  const promoBadges = badges.filter((item) => item.promo).map((item) => item.name)
  promoBadges.length === 2 && promoBadges.every((name) => ['山野拿铁', '琥珀美式'].includes(name))
    ? ok('小程序商品角标', promoBadges.join('、'))
    : bad('小程序商品角标', JSON.stringify(promoBadges))

  // 加购 2 杯山野拿铁（大杯）→ 7000，活动减 1750
  for (let i = 0; i < 2; i += 1) {
    await page.click('.prod__add')
    await page.waitForTimeout(400)
    if (i === 0) {
      const cupOptions = await (await page.$$('.spec__group'))[0].$$('.spec__option')
      await cupOptions[1].click()
      await page.waitForTimeout(200)
      // 规格弹窗应显示活动标签
      const specPromo = await page.locator('.spec__promo').count()
      specPromo === 1 ? ok('规格弹窗活动标签') : bad('规格弹窗活动标签', `数量 ${specPromo}`)
    }
    await page.click('.spec__submit')
    await page.waitForTimeout(400)
  }

  // 结算页金额明细
  await page.goto(`${H5_MINI}/#/pages/checkout/checkout`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const amounts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.row')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim()),
  )
  console.log('   结算金额行:', JSON.stringify(amounts))
  const promoRow = amounts.find((r) => r.includes('活动优惠')) ?? ''
  // 第 2 杯（中杯 3200）半价 1600 分
  promoRow.includes('-¥16.00') ? ok('结算页活动优惠行', promoRow) : bad('结算页活动优惠行', promoRow)
  const payRow = amounts.find((r) => r.includes('实付金额')) ?? ''
  payRow.includes('¥51.00') ? ok('结算页实付金额', payRow) : bad('结算页实付金额', payRow)

  // 模拟支付
  await page.click('.submit-bar__btn')
  await page.waitForTimeout(2500)
  const detailUrl = page.url()
  detailUrl.includes('order-detail') ? ok('支付后进入订单详情') : bad('支付后进入订单详情', detailUrl)

  // 订单详情活动优惠行
  const detailAmounts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.row')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim()),
  )
  console.log('   详情金额行:', JSON.stringify(detailAmounts))
  const detailPromo = detailAmounts.find((r) => r.includes('活动优惠')) ?? ''
  detailPromo.includes('-¥16.00') ? ok('订单详情活动优惠', detailPromo) : bad('订单详情活动优惠', detailPromo)

  // 服务端订单核对
  const serverOrder = await api('/api/v1/orders', { token })
  const latest = serverOrder.data.list[0]
  latest.promoDiscountFen === 1600 && latest.payFen === 5100
    ? ok('服务端订单金额', `活动减 ${latest.promoDiscountFen}，实付 ${latest.payFen}`)
    : bad('服务端订单金额', JSON.stringify(latest).slice(0, 160))

  // ---------- 3. 官网菜单活动标识 ----------
  const webPage = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  await webPage.goto(`${H5_WEB}/menu`, { waitUntil: 'networkidle' })
  await webPage.waitForTimeout(1500)
  const webInfo = await webPage.evaluate(() => ({
    banner: document.querySelector('.promo-banner__tag')?.textContent?.trim() ?? '',
    text: (document.querySelector('.promo-banner__text')?.textContent ?? '').trim(),
    badges: Array.from(document.querySelectorAll('.product-card__promo')).length,
  }))
  console.log('   官网:', JSON.stringify(webInfo))
  webInfo.banner === '第二杯半价' && webInfo.badges === 2
    ? ok('官网菜单活动标识', `横幅 + ${webInfo.badges} 个商品角标`)
    : bad('官网菜单活动标识', JSON.stringify(webInfo))

  // ---------- 4. 后台订单明细显示活动优惠 ----------
  const adminPage = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  await adminPage.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' })
  await adminPage.fill('#username', 'admin')
  await adminPage.fill('#password', process.env.ADMIN_PASS)
  await adminPage.click('button[type="submit"]')
  await adminPage.waitForURL('**/dashboard', { timeout: 15000 })
  await adminPage.goto(`${ADMIN}/promo`, { waitUntil: 'networkidle' })
  await adminPage.waitForTimeout(1200)
  const promoForm = await adminPage.evaluate(() => ({
    name: document.querySelector('#promo-name')?.value ?? '',
    start: document.querySelector('#promo-start')?.value ?? '',
    end: document.querySelector('#promo-end')?.value ?? '',
    selected: Array.from(document.querySelectorAll('input[type=checkbox]')).filter((c) => c.checked).length,
  }))
  console.log('   后台活动表单:', JSON.stringify(promoForm))
  promoForm.name === '第二杯半价' && promoForm.selected === 2
    ? ok('后台活动配置回显', `已选 ${promoForm.selected} 款`)
    : bad('后台活动配置回显', JSON.stringify(promoForm))

  // 订单详情
  await adminPage.goto(`${ADMIN}/orders`, { waitUntil: 'networkidle' })
  await adminPage.waitForTimeout(1500)
  await adminPage.locator('tbody tr').first().locator('button', { hasText: '详情' }).click()
  await adminPage.waitForTimeout(1200)
  const adminDetail = await adminPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.dialog [class*=flex]')).map((r) => (r.textContent ?? '').trim())
    return (document.querySelector('[role=dialog]')?.textContent ?? '') + '|' + rows.join(';')
  })
  const adminPromoOk = adminDetail.includes('活动优惠') && adminDetail.includes('-¥16.00')
  adminPromoOk ? ok('后台订单明细活动优惠') : bad('后台订单明细活动优惠', adminDetail.slice(0, 200))

  errors.length === 0 ? ok('小程序无 JS 报错') : bad('小程序 JS 报错', errors.join(';').slice(0, 200))
} finally {
  await browser.close()
}

console.log(failed === 0 ? '\n第二杯半价活动四端联调全部通过' : `\n存在 ${failed} 个问题`)
process.exitCode = failed === 0 ? 0 : 1
