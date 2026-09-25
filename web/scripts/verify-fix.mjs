/**
 * 修复核验：1) 后台订单管理页可正常渲染（不再白屏）
 *            2) 官网首屏文字区域为浅色背景（对比度充足）
 */
import { chromium } from 'playwright'

const ADMIN_PASS = process.env.ADMIN_PASS ?? ''
const STAFF_PASS = process.env.STAFF_PASS ?? ''

let failed = 0

function ok(name, detail = '') {
  console.log(`  ✔ ${name}${detail ? `（${detail}）` : ''}`)
}
function bad(name, detail) {
  failed += 1
  console.error(`  ✖ ${name}：${detail}`)
}

/** 在浏览器中解码截图并计算平均相对亮度 */
async function averageLuminance(page, shot) {
  return page.evaluate(async (base64) => {
    const image = new Image()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = `data:image/png;base64,${base64}`
    })
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let total = 0
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
      count += 1
    }
    return total / count
  }, shot.toString('base64'))
}

const browser = await chromium.launch()

try {
  // ============ 1. 后台订单管理页 ============
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  await page.goto('http://127.0.0.1:5101/login', { waitUntil: 'networkidle' })
  await page.fill('#username', 'admin')
  await page.fill('#password', ADMIN_PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  ok('后台登录成功', page.url())

  await page.goto('http://127.0.0.1:5101/orders', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  const ordersInfo = await page.evaluate(() => {
    const header = document.querySelector('h1')
    const table = document.querySelector('table')
    const bodyText = document.body.innerText
    return {
      title: header?.textContent ?? '',
      hasTable: Boolean(table),
      hasPagination: /共 \d+ 笔订单/.test(bodyText),
      hasFilters: Boolean(document.querySelector('#order-status')),
      bodyLength: bodyText.length,
    }
  })
  ordersInfo.title === '订单管理'
    ? ok('订单管理页渲染正常', `表格:${ordersInfo.hasTable}，分页:${ordersInfo.hasPagination}`)
    : bad('订单管理页渲染', JSON.stringify(ordersInfo))
  ordersInfo.bodyLength > 100
    ? ok('页面有实际内容', `${ordersInfo.bodyLength} 字符`)
    : bad('页面内容过少', String(ordersInfo.bodyLength))
  ordersInfo.hasFilters ? ok('筛选栏渲染正常') : bad('筛选栏缺失')
  pageErrors.length === 0 ? ok('无 JS 报错') : bad('存在 JS 报错', pageErrors.join(';'))

  // 店员视角（只能看到本门店）
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const staffPage = await staffContext.newPage()
  const staffErrors = []
  staffPage.on('pageerror', (error) => staffErrors.push(String(error)))
  await staffPage.goto('http://127.0.0.1:5101/login', { waitUntil: 'networkidle' })
  await staffPage.fill('#username', 'staff')
  await staffPage.fill('#password', STAFF_PASS)
  await staffPage.click('button[type="submit"]')
  await staffPage.waitForURL('**/dashboard', { timeout: 15000 })
  await staffPage.goto('http://127.0.0.1:5101/orders', { waitUntil: 'networkidle' })
  await staffPage.waitForTimeout(1000)
  const staffInfo = await staffPage.evaluate(() => ({
    hasTable: Boolean(document.querySelector('table')),
    hasStoreFilter: Boolean(document.querySelector('#order-store')),
    bodyLength: document.body.innerText.length,
  }))
  staffInfo.hasTable && !staffInfo.hasStoreFilter
    ? ok('店员订单页渲染正常且无门店筛选')
    : bad('店员订单页异常', JSON.stringify(staffInfo))
  staffErrors.length === 0 ? ok('店员视角无 JS 报错') : bad('店员视角 JS 报错', staffErrors.join(';'))
  await staffContext.close()
  await context.close()

  // ============ 2. 官网首屏可读性 ============
  for (const width of [1440, 390]) {
    const webContext = await browser.newContext({ viewport: { width, height: 900 } })
    const webPage = await webContext.newPage()
    const webErrors = []
    webPage.on('pageerror', (error) => webErrors.push(String(error)))
    await webPage.goto('http://127.0.0.1:5102/', { waitUntil: 'networkidle' })
    await webPage.waitForTimeout(900)

    const overflow = await webPage.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    overflow <= 1 ? ok(`${width}px 无横向滚动`) : bad(`${width}px 横向滚动`, `${overflow}px`)

    for (const selector of ['.hero__eyebrow', '.hero__title', '.hero__desc', '.hero__stats']) {
      const element = await webPage.$(selector)
      if (!element) {
        bad(`${width}px ${selector} 不存在`, '')
        continue
      }
      const rect = await element.boundingBox()
      if (!rect) {
        continue
      }
      const shot = await webPage.screenshot({
        clip: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.width, height: rect.height },
      })
      const luminance = await averageLuminance(webPage, shot)
      luminance > 0.62
        ? ok(`${width}px ${selector} 背景明亮`, `亮度 ${luminance.toFixed(2)}`)
        : bad(`${width}px ${selector} 背景偏暗`, `亮度 ${luminance.toFixed(2)}`)
    }
    webErrors.length === 0 ? ok(`${width}px 无 JS 报错`) : bad(`${width}px JS 报错`, webErrors.join(';'))
    await webContext.close()
  }
} finally {
  await browser.close()
}

console.log(failed === 0 ? '\n修复核验全部通过' : `\n修复核验存在 ${failed} 个问题`)
process.exitCode = failed === 0 ? 0 : 1
