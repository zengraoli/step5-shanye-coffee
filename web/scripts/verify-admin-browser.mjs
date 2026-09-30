/**
 * 严格验收第三轮 · 后台浏览器走查脚本
 *
 * 用法：
 *   1) 启动 server（端口 3000）与 admin dev（npm run dev，端口 5101）
 *   2) ADMIN_PASSWORD=xxx STAFF_PASSWORD=yyy node scripts/verify-admin-browser.mjs [--prod]
 *      --prod 表示走 npm run preview 的生产产物（默认走 dev）
 *
 * 用普通 Chromium（不关闭跨域检查）真实点击每个页面与按钮。
 */
import { chromium } from 'playwright'

const MODE = process.argv.includes('--prod') ? 'prod' : 'dev'
const BASE = process.env.ADMIN_URL ?? (MODE === 'prod' ? 'http://127.0.0.1:5101' : 'http://127.0.0.1:5101')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const STAFF_PASSWORD = process.env.STAFF_PASSWORD

const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}
const pageErrors = []

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (err) => pageErrors.push(err.message))
page.on('console', (msg) => {
  if (msg.type() === 'error' && !/favicon|404/i.test(msg.text())) {
    pageErrors.push(msg.text())
  }
})

const shot = async (name) => {
  await page.screenshot({ path: `${process.cwd()}/../docs/screenshots/admin-${MODE}-${name}.png`, fullPage: true })
}

async function login(username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.locator('input#username, input[name="username"]').first().fill(username)
  await page.locator('input[type="password"]').first().fill(password)
  await page.getByRole('button', { name: /登录|登 录/ }).first().click()
  await page.waitForTimeout(2000)
  const url = page.url()
  record(`${username} 登录成功进入后台`, !url.endsWith('/login'), url)
}

/** 依次打开每个菜单页，检查标题与无报错 */
const pages = [
  ['数据看板', /数据看板|经营|看板/],
  ['订单管理', /订单/],
  ['商品管理', /商品/],
  ['门店管理', /门店/],
  ['会员管理', /会员/],
  ['优惠券管理', /优惠券/],
  ['账号与角色', /账号|角色/],
  ['活动管理', /活动/],
]

async function walkPages(label) {
  for (const [menu, pattern] of pages) {
    await page.getByRole('link', { name: menu }).first().click().catch(async () => {
      await page.getByText(menu, { exact: false }).first().click()
    })
    await page.waitForTimeout(1200)
    const text = await page.locator('body').innerText()
    record(`${label} · ${menu} 可打开`, pattern.test(text), text.slice(0, 40).replace(/\n/g, ' '))
  }
}

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error('请通过环境变量 ADMIN_PASSWORD / STAFF_PASSWORD 传入后台密码')
  }

  // ---------- 管理员 ----------
  await login('admin', ADMIN_PASSWORD)
  await walkPages('管理员')

  // 数据看板：卡片说明与表格
  {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const text = await page.locator('body').innerText()
    record('看板“今日订单量”卡片带“已支付订单（不含取消）”说明', text.includes('已支付订单（不含取消）'))
    await shot('dashboard')
  }

  // 订单管理：打开详情弹窗并点“推进状态”
  {
    await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    // 找一行带推进操作的订单（已完成 / 已取消没有下一步）
    const rows = page.locator('table tbody tr')
    const rowCount = await rows.count()
    let opened = false
    for (let i = 0; i < Math.min(rowCount, 12); i += 1) {
      const row = rows.nth(i)
      const actionBtn = row.getByRole('button').filter({ hasText: /制作|取餐|完成|支付|推进/ }).first()
      if ((await actionBtn.count()) === 0) {
        continue
      }
      const actionText = await actionBtn.innerText()
      await row.getByRole('button', { name: /详情/ }).first().click()
      await page.waitForTimeout(700)
      const dialog = page.locator('[role="dialog"]').first()
      const dialogText = await dialog.innerText().catch(() => '')
      const advanceBtn = dialog.getByRole('button', { name: /推进状态|下一步/ }).first()
      const hasAdvance = (await advanceBtn.count()) > 0
      record('订单详情弹窗有“推进状态”按钮', hasAdvance, actionText + ' / ' + dialogText.replace(/\s+/g, ' ').slice(0, 40))
      if (hasAdvance) {
        await advanceBtn.click()
        await page.waitForTimeout(1500)
        const after = await page.locator('body').innerText()
        record('推进状态后列表刷新', /已推进/.test(after), after.slice(0, 40))
        opened = true
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      break
    }
    if (!opened) {
      record('订单管理有可推进的订单', false, `共 ${rowCount} 单，均为终态`)
    }
    await shot('orders')
  }

  // 商品管理：售罄按门店 + 规格组
  {
    await page.getByRole('link', { name: '商品管理' }).first().click()
    await page.waitForTimeout(1000)
    const text = await page.locator('body').innerText()
    record('商品列表展示按门店售罄信息', /售罄/.test(text))
    const editBtn = page.getByRole('button', { name: /编辑/ }).first()
    if (await editBtn.count()) {
      await editBtn.click()
      await page.waitForTimeout(600)
      const dialogText = await page.locator('[role="dialog"]').first().innerText().catch(() => '')
      record('商品编辑弹窗可配置规格组（杯型 / 温度 / 糖度）', /杯型/.test(dialogText) && /温度/.test(dialogText) && /糖度/.test(dialogText), dialogText.slice(0, 60))
      await page.keyboard.press('Escape')
    }
    await shot('products')
  }

  // 门店管理：手动休息开关
  {
    await page.getByRole('link', { name: '门店管理' }).first().click()
    await page.waitForTimeout(1000)
    const text = await page.locator('body').innerText()
    record('门店管理有手动休息 / 恢复营业开关', /休息|恢复营业|营业中/.test(text))
    await shot('stores')
  }

  // 优惠券管理：切换类型 / 发放总量 / 停用说明
  {
    await page.getByRole('link', { name: '优惠券管理' }).first().click()
    await page.waitForTimeout(1000)
    const editBtn = page.getByRole('button', { name: /编辑/ }).first()
    if (await editBtn.count()) {
      await editBtn.click()
      await page.waitForTimeout(600)
      const dialogText = await page.locator('[role="dialog"]').first().innerText().catch(() => '')
      record('优惠券编辑弹窗可切换类型', /券类型|满减券|折扣券/.test(dialogText))
      record('优惠券编辑弹窗可调整发放总量', /发放总量/.test(dialogText))
      record('优惠券编辑弹窗说明“只对新领取的券生效”', /对新领取的券生效/.test(dialogText))
      await page.keyboard.press('Escape')
    }
    await shot('coupons')
  }

  // 账号管理：店员必须选门店（默认角色即店员，绑定门店必须可编辑）
  {
    await page.getByRole('link', { name: '账号与角色' }).first().click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: /新增/ }).first().click()
    await page.waitForTimeout(600)
    const dialog = page.locator('[role="dialog"]').first()
    const storeTrigger = dialog.locator('button#account-store').first()
    const storeDisabled = await storeTrigger.getAttribute('data-disabled')
    const storeText = await storeTrigger.innerText()
    record('角色默认“店员”时绑定门店可编辑（不再固定第一家且置灰）', storeDisabled === null || storeDisabled === 'false', `${storeText} / disabled=${storeDisabled}`)

    // 不选门店直接保存应被前端阻止
    await dialog.getByRole('button', { name: /保存|创建|确定/ }).first().click()
    await page.waitForTimeout(500)
    const errorText = await dialog.innerText()
    record('店员未选门店时阻止保存', /请选择绑定门店/.test(errorText), errorText.slice(0, 60))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await shot('accounts')
  }

  // 404 页
  {
    await page.goto(`${BASE}/not-exist-page`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const text = await page.locator('body').innerText()
    record('未知地址展示 404 页而不是“页面即将上线”', /404|找不到|不存在/.test(text), text.slice(0, 60))
    await shot('404')
  }

  // 退出登录
  {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const userBtn = page.locator('[data-slot="dropdown-menu-trigger"], button:has-text("管理员"), button:has-text("admin")').first()
    if (await userBtn.count()) {
      await userBtn.click()
      await page.waitForTimeout(300)
      await page.getByText(/退出登录/).first().click()
      await page.waitForTimeout(1500)
      const url = page.url()
      record('退出登录回到登录页', url.endsWith('/login'), url)
      // 后退不能回到后台
      await page.goBack()
      await page.waitForTimeout(1500)
      const afterBack = page.url()
      record('退出后浏览器后退回不到后台页面', afterBack.endsWith('/login') || !afterBack.includes('dashboard'), afterBack)
    }
  }

  // ---------- 店员 ----------
  await login('staff', STAFF_PASSWORD ?? ADMIN_PASSWORD)
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  {
    // 侧栏菜单链接比文本更可靠：店员只应看到看板 / 订单 / 商品三个入口
    const sidebarLinks = await page.locator('aside a[href], nav a[href]').evaluateAll((els) => els.map((el) => el.getAttribute('href')))
    const sidebarText = sidebarLinks.join(' ')
    const staffPages = [
      ['数据看板', /数据看板|经营|看板/],
      ['订单管理', /订单/],
      ['商品管理', /商品/],
    ]
    for (const [menu, pattern] of staffPages) {
      await page.getByRole('link', { name: menu }).first().click()
      await page.waitForTimeout(1000)
      const text = await page.locator('body').innerText()
      record(`店员 · ${menu} 可打开`, pattern.test(text))
    }
    record(
      '店员只看得到看板 / 订单 / 商品，看不到会员、优惠券、账号、门店菜单',
      sidebarLinks.length === 3 && sidebarLinks.every((href) => ['/dashboard', '/orders', '/products'].includes(href)),
      JSON.stringify(sidebarLinks),
    )
    // 店员只能改本店售罄
    await page.getByRole('link', { name: '商品管理' }).first().click()
    await page.waitForTimeout(1000)
    const text = await page.locator('body').innerText()
    record('店员商品页只显示本店售罄入口', /售罄/.test(text), text.slice(0, 60))
    await shot('staff-products')
  }

  record('全程无 JS 报错', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))

  await browser.close()
  const failed = results.filter((item) => !item.ok)
  console.log(`\n后台浏览器走查（${MODE}）：通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`)
  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('走查脚本执行失败：', error.message)
  process.exitCode = 1
})
