// 小程序 H5 在 375 宽下的真实操作核验：登录 → 点单 → 下单 → 支付 → 查看订单 → 退出登录
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:5103'
const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 375, height: 667 } })
const page = await context.newPage()
page.on('pageerror', (err) => record('无 JS 报错', false, err.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') record('无 console 报错', false, msg.text())
})

const shot = async (name) => {
  await page.screenshot({ path: `${process.cwd()}/screenshots/miniapp-${name}.png`, fullPage: false })
}

// 1. 登录页：输入框可输入、高度正常
await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const phoneInput = page.locator('input').first()
const phoneBox = await phoneInput.boundingBox()
record('登录页手机号输入框高度足够', phoneBox && phoneBox.height >= 40, JSON.stringify(phoneBox))
await phoneInput.click()
await phoneInput.fill('13800000001')
const phoneValue = await phoneInput.inputValue()
record('手机号可输入', phoneValue === '13800000001', phoneValue)

await page.locator('input').nth(1).click()
await page.locator('input').nth(1).fill('123456')
const codeValue = await page.locator('input').nth(1).inputValue()
record('验证码可输入', codeValue === '123456', codeValue)
await shot('login')

// 2. 登录
await page.getByText('登录', { exact: true }).click()
await page.waitForTimeout(1500)
const url = page.url()
record('登录成功跳转', !url.includes('login'), url)

// 3. 我的页：积分展示
await page.goto(`${BASE}/#/pages/profile/profile`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const profileText = await page.locator('.profile').first().innerText()
record('会员中心展示手机号', profileText.includes('138****'), profileText.slice(0, 60))
await shot('profile')

// 4. 领券中心
await page.goto(`${BASE}/#/pages/coupons/coupons`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const couponText = await page.locator('.coupons').first().innerText()
record('领券中心展示可领券', couponText.includes('领券中心') && couponText.includes('领取'), couponText.slice(0, 80))
await shot('coupons')

// 5. 点单页：门店状态、分类、购物车
await page.goto(`${BASE}/#/pages/order/order`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const orderText = await page.locator('.order-page').first().innerText()
record('点单页展示当前门店', orderText.includes('山野咖啡'), orderText.slice(0, 60))
const addBtn = page.locator('.prod__add').first()
await addBtn.click()
await page.waitForTimeout(500)
const specText = await page.locator('.spec').innerText().catch(() => '')
record('规格弹窗可打开', specText.includes('杯型') || specText.includes('加入购物车'), specText.slice(0, 60))
await page.getByText('加入购物车').click()
await page.waitForTimeout(400)
const cartText = await page.locator('.cart-bar').first().innerText()
record('购物车浮条展示应付金额', cartText.includes('¥'), cartText.replace(/\n/g, ' '))
await shot('order')

// 6. 结算页：从购物车进入（与真实操作一致）
await page.getByText('去结算').first().click()
await page.waitForTimeout(2500)
const checkText = await page.locator('.checkout').first().innerText().catch(() => '')
record('确认订单页展示金额明细', checkText.includes('实付') || checkText.includes('商品原价'), checkText.slice(0, 100))
await shot('checkout')

// 7. 下单 + 支付
await page.evaluate(() => {
  const { useCart } = window.__miniapp__ ?? {}
  return useCart
})
const payBtn = page.getByText(/立即支付|模拟支付|提交订单/)
if (await payBtn.count()) {
  await payBtn.first().click()
  await page.waitForTimeout(2500)
  const afterPay = await page.locator('.detail, .order-detail, .checkout, .confirm').first().innerText().catch(() => '')
  record('支付流程完成', afterPay.includes('取餐码') || afterPay.includes('订单'), afterPay.slice(0, 80))
  await shot('paid')
} else {
  record('找到支付按钮', false, '未找到')
}

// 8. 订单列表
await page.goto(`${BASE}/#/pages/orders/orders`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
const listText = await page.locator('.orders').first().innerText()
record('订单列表展示订单', listText.includes('山野咖啡') || listText.includes('订单'), listText.slice(0, 80))
const tabs = await page.locator('.tabs__item').allInnerTexts()
record('订单筛选含“已取消”', tabs.includes('已取消'), JSON.stringify(tabs))
await shot('orders')

// 9. 退出登录
await page.goto(`${BASE}/#/pages/profile/profile`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.getByText('退出登录').click()
await page.waitForTimeout(300)
const modalText = await page.locator('text=确定退出').count() ? '确定退出' : await page.locator('[class*=modal]').allInnerTexts().then((t) => t.join(' ')).catch(() => '')
record('退出登录有二次确认', modalText.includes('退出'), modalText.slice(0, 60))
await page.getByText('退出', { exact: true }).click()
await page.waitForTimeout(1200)
const finalUrl = page.url()
record('退出登录回到首页', finalUrl.endsWith('#/') || finalUrl.includes('index'), finalUrl)

await browser.close()

const failed = results.filter((item) => !item.ok)
console.log(`\n小程序 H5 375 宽核验：通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`)
fs.writeFileSync(`${process.cwd()}/screenshots/miniapp-verify.json`, JSON.stringify(results, null, 2))
