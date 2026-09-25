/**
 * 响应式核验：在 390 / 768 / 1440 三种宽度下检查各页面是否出现横向滚动。
 * 用法：先启动 web 开发服务器（npm run dev），再执行 npm run check:responsive。
 */
import { chromium } from 'playwright'

const BASE = process.env.WEB_BASE_URL ?? 'http://127.0.0.1:5102'
const WIDTHS = [390, 768, 1440]

const PAGES = [
  { path: '/', name: '首页' },
  { path: '/menu', name: '菜单' },
  { path: '/stores', name: '门店' },
  { path: '/story', name: '品牌故事' },
  { path: '/member/login', name: '会员登录' },
]

const browser = await chromium.launch()
let failed = 0

try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    for (const target of PAGES) {
      await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle' })
      const result = await page.evaluate(() => {
        const doc = document.documentElement
        const overflow = doc.scrollWidth - doc.clientWidth
        // 找出超出视口宽度的元素（排除主动设置 overflow 的装饰容器）
        const offenders = []
        if (overflow > 1) {
          for (const el of Array.from(document.body.querySelectorAll('*'))) {
            const rect = el.getBoundingClientRect()
            if (rect.right > doc.clientWidth + 1 || rect.left < -1) {
              offenders.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`)
            }
          }
        }
        return { overflow, offenders: offenders.slice(0, 5) }
      })
      const ok = result.overflow <= 1
      if (!ok) {
        failed += 1
      }
      console.log(
        `${ok ? '✔' : '✖'} ${width}px · ${target.name}：横向溢出 ${result.overflow}px${
          result.offenders.length ? `（${result.offenders.join('、')}）` : ''
        }`,
      )
    }
    await context.close()
  }
} finally {
  await browser.close()
}

if (failed > 0) {
  console.error(`\n响应式核验未通过：${failed} 个组合存在横向滚动`)
  process.exitCode = 1
} else {
  console.log('\n响应式核验通过：390 / 768 / 1440 三种宽度下均无横向滚动')
}
