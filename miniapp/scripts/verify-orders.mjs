/**
 * T25 联调：订单列表 + 订单详情
 * 验证：列表展示、详情取餐码与进度条、支付后状态、后台推进状态后刷新可见
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

const browser = await chromium.launch()

async function api(path, options = {}) {
  const res = await fetch(`${BASE_API}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'content-type': 'application/json', ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  return res.json()
}

try {
  // 1. 会员登录并造两笔订单（一笔已支付、一笔待支付）
  const phone = `138${String(Math.floor(Math.random() * 90000000) + 10000000)}`
  const login = await api('/api/v1/auth/login', { method: 'POST', body: { phone, code: '123456' } })
  const { token, member } = login.data

  const spec = { cup: 'large', temp: 'ice', sugar: 'less' }
  const orderA = await api('/api/v1/orders', {
    method: 'POST',
    token,
    body: { storeId: 1, orderType: 'takeout', items: [{ productId: 1, spec, quantity: 1 }] },
  }).then((r) => r.data)
  await api(`/api/v1/orders/${orderA.id}/pay`, { method: 'POST', token, body: {} })
  const orderB = await api('/api/v1/orders', {
    method: 'POST',
    token,
    body: { storeId: 2, orderType: 'dine_in', items: [{ productId: 13, spec: { cup: 'medium', temp: 'hot', sugar: 'none' }, quantity: 1 }] },
  }).then((r) => r.data)
  console.log(`   造单：${orderA.orderNo}（已支付）、${orderB.orderNo}（待支付）`)

  // 2. 后台管理员登录（用于推进状态）
  const adminLogin = await api('/api/v1/admin/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: process.env.ADMIN_PASS },
  })
  const adminToken = adminLogin.data.token

  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // 3. 预置登录态 → 订单列表
  await page.goto(`${BASE_H5}/`, { waitUntil: 'networkidle' })
  await page.evaluate(
    ({ token, member }) => {
      uni.setStorageSync('shanye_member_token', token)
      uni.setStorageSync('shanye_member_profile', JSON.stringify(member))
    },
    { token, member },
  )
  await page.goto(`${BASE_H5}/#/pages/orders/orders`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)

  const listInfo = await page.evaluate(() => ({
    cards: document.querySelectorAll('.order-card').length,
    texts: Array.from(document.querySelectorAll('.order-card')).map((c) =>
      (c.textContent ?? '').replace(/\s+/g, ' ').trim(),
    ),
  }))
  listInfo.cards >= 2
    ? ok('订单列表展示', `${listInfo.cards} 笔`)
    : bad('订单列表异常', JSON.stringify(listInfo).slice(0, 200))
  const paidCard = listInfo.texts.find((t) => t.includes('已支付'))
  const pendingCard = listInfo.texts.find((t) => t.includes('待支付'))
  paidCard ? ok('已支付订单在列表中', paidCard.slice(0, 60)) : bad('缺少已支付订单')
  pendingCard ? ok('待支付订单在列表中', pendingCard.slice(0, 60)) : bad('缺少待支付订单')

  // 4. 打开已支付订单详情
  await page.goto(`${BASE_H5}/#/pages/order-detail/order-detail?id=${orderA.id}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const detail = await page.evaluate(() => ({
    code: document.querySelector('.pickup__code')?.textContent?.trim() ?? '',
    status: document.querySelector('.progress-card__head .chip')?.textContent?.trim() ?? '',
    currentStep: document.querySelectorAll('.progress__step.is-current').length,
    doneSteps: document.querySelectorAll('.progress__step.is-done').length,
    steps: Array.from(document.querySelectorAll('.progress__label')).map((s) => s.textContent?.trim()),
    fill: document.querySelector('.progress__fill')?.getAttribute('style') ?? '',
    items: document.querySelectorAll('.line').length,
    timeline: document.querySelectorAll('.timeline').length,
  }))
  console.log('   详情:', JSON.stringify(detail));
  /^\d{4}$/.test(detail.code) ? ok('取餐码展示', detail.code) : bad('取餐码异常', detail.code)
  detail.status === '已支付' ? ok('状态展示', detail.status) : bad('状态异常', detail.status)
  detail.steps.join('→') === '待支付→已支付→制作中→待取餐→已完成'
    ? ok('进度条五个节点')
    : bad('进度条节点异常', detail.steps.join(','))
  detail.doneSteps === 1 && detail.currentStep === 1
    ? ok('当前停在“已支付”', `已完成 ${detail.doneSteps} 步`)
    : bad('进度高亮异常', `done=${detail.doneSteps} current=${detail.currentStep}`)

  // 5. 后台推进两级：已支付 → 制作中 → 待取餐
  await api(`/api/v1/admin/orders/${orderA.id}/advance`, { method: 'POST', token: adminToken, body: {} })
  const mid = await api(`/api/v1/orders/${orderA.id}`, { token })
  await api(`/api/v1/admin/orders/${orderA.id}/advance`, { method: 'POST', token: adminToken, body: {} })
  const after = await api(`/api/v1/orders/${orderA.id}`, { token })
  console.log(`   后台推进：${mid.data.statusText} → ${after.data.statusText}`)
  after.data.status === 'pickable' ? ok('后台推进生效', after.data.statusText) : bad('后台推进失败', after.data.status)

  // 6. 小程序重新进入详情页（onShow 刷新）→ 应看到最新状态
  await page.goto(`${BASE_H5}/#/pages/orders/orders`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.goto(`${BASE_H5}/#/pages/order-detail/order-detail?id=${orderA.id}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const refreshed = await page.evaluate(() => ({
    status: document.querySelector('.progress-card__head .chip')?.textContent?.trim() ?? '',
    doneSteps: document.querySelectorAll('.progress__step.is-done').length,
    currentStep: document.querySelectorAll('.progress__step.is-current').length,
    timeline: document.querySelectorAll('.timeline').length,
  }))
  console.log('   刷新后:', JSON.stringify(refreshed))
  refreshed.status === '待取餐'
    ? ok('刷新后看到最新状态', refreshed.status)
    : bad('刷新后状态未更新', refreshed.status)
  refreshed.doneSteps === 3 && refreshed.currentStep === 1
    ? ok('进度条同步推进', `已完成 ${refreshed.doneSteps} 步`)
    : bad('进度条未同步', `done=${refreshed.doneSteps} current=${refreshed.currentStep}`)

  // 7. 确认取餐
  await page.click('.actions__btn--primary')
  await page.waitForTimeout(1500)
  const finalState = await page.evaluate(() => ({
    status: document.querySelector('.progress-card__head .chip')?.textContent?.trim() ?? '',
    done: document.querySelector('.actions__done')?.textContent?.trim() ?? '',
  }))
  console.log('   确认取餐后:', JSON.stringify(finalState))
  finalState.status === '已完成' ? ok('确认取餐完成') : bad('确认取餐失败', JSON.stringify(finalState))

  errors.length === 0 ? ok('无 JS 报错') : bad('JS 报错', errors.join(';').slice(0, 200))
} finally {
  await browser.close()
}

console.log(failed === 0 ? '\n订单详情与列表联调全部通过' : `\n存在 ${failed} 个问题`)
process.exitCode = failed === 0 ? 0 : 1
