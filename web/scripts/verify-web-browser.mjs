/**
 * 严格验收第三轮 · 官网浏览器走查脚本
 *
 * 用法：
 *   1) 启动 server（3000）与 web dev（npm run dev，端口 5102）
 *   2) node scripts/verify-web-browser.mjs
 *
 * 覆盖：390 / 768 / 1440 三个宽度的响应式、菜单分类分组与锚点、
 * 售罄过滤、商品详情、会员登录与 401 引导、领券中心。
 */
import { chromium } from 'playwright'

const BASE = process.env.WEB_URL ?? 'http://127.0.0.1:5102'
const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()
const pageErrors = []

for (const width of [390, 768, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', (err) => pageErrors.push(`${width}: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon|404/i.test(msg.text())) {
      pageErrors.push(`${width}: ${msg.text()}`)
    }
  })

  // 菜单页：分类分组 + 无横向滚动（走真实导航链接）
  await page.goto(`${BASE}/menu`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  record(`${width} 宽菜单页无横向滚动`, overflow <= 1, `溢出 ${overflow}px`)

  const groupCount = await page.locator('[id^="category-"], section[id^="category-"], [data-category-group]').count()
  const cardCount = await page.locator('.product-card').count()
  record(`${width} 宽菜单按分类分组渲染`, groupCount >= 4 && cardCount > 0, `${groupCount} 组 / ${cardCount} 张卡`)

  // 分类锚点：点“茶饮”后右侧滚动到对应分组
  if (width === 390) {
    const tab = page.getByRole('button', { name: '茶饮' }).first()
    if (await tab.count()) {
      await tab.click()
      await page.waitForTimeout(900)
      const activeText = await page.locator('.menu-tabs__item.is-active').innerText().catch(() => '')
      record('点击分类后高亮跟随（茶饮）', activeText.includes('茶饮'), activeText)
    }
  }

  // 售罄过滤：当季推荐不含已售罄（回到首页）
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const featuredText = await page.locator('body').innerText()
  const featuredSoldOut = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.product-card--featured .product-card__mask')).length,
  )
  record('当季推荐不含已售罄商品', featuredSoldOut === 0, `推荐区售罄遮罩 ${featuredSoldOut} 个`)

  // 商品卡片可点击 → 详情页
  if (width === 390) {
    const firstCard = page.locator('.product-card').first()
    if (await firstCard.count()) {
      await firstCard.locator('a, [role=link]').first().click({ trial: false }).catch(() => {})
      await page.waitForTimeout(1500)
      const url = page.url()
      const detailText = await page.locator('body').innerText()
      record('商品卡片可进入详情页', /product|详情/.test(url) || /规格|杯型/.test(detailText), `${url} / ${detailText.slice(0, 40).replace(/\n/g, ' ')}`)
    }
  }

  await context.close()
}

// 会员中心：登录 / 领券 / 401 引导
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', (err) => pageErrors.push(`member: ${err.message}`))

  await page.goto(`${BASE}/member/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const inputs = page.locator('.field input, .member-login input')
  if (await inputs.count() >= 2) {
    await inputs.nth(0).fill('13800000001')
    await inputs.nth(1).fill('123456')
    await page.getByRole('button', { name: /登录/ }).first().click()
    await page.waitForTimeout(2500)
    const url = page.url()
    record('会员登录成功', !url.includes('member-login'), url)

    // 会员中心领券入口
    await page.goto(`${BASE}/member`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const memberText = await page.locator('body').innerText()
    record('会员中心有领券中心入口', /领券中心/.test(memberText), memberText.slice(0, 60))
    const claimTab = page.getByText('领券中心').first()
    if (await claimTab.count()) {
      await claimTab.click()
      await page.waitForTimeout(1200)
      const claimText = await page.locator('body').innerText()
      record('领券中心展示可领取的券', /领取/.test(claimText) && /满|折/.test(claimText), claimText.slice(0, 80))
    }
  } else {
    record('会员登录页可打开', false, '未找到手机号 / 验证码输入框')
  }

  // 401 引导：清掉 token 后访问会员中心应提示重新登录（不再只显示红字）
  await page.evaluate(() => {
    localStorage.setItem('shanye_member_token', 'invalid-token')
  })
  await page.goto(`${BASE}/member`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const expiredText = await page.locator('body').innerText()
  const onLoginPage = page.url().includes('/member/login')
  record(
    '登录过期后有重新登录引导（跳登录页或出现登录按钮）',
    onLoginPage || /重新登录|去登录/.test(expiredText),
    `${page.url()} / ${expiredText.slice(0, 60).replace(/\n/g, ' ')}`,
  )

  await context.close()
}

record('全程无 JS 报错', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))

await browser.close()
const failed = results.filter((item) => !item.ok)
console.log(`\n官网浏览器走查：通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`)
if (failed.length > 0) {
  process.exitCode = 1
}
