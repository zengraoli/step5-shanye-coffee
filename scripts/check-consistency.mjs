/**
 * 全局约定一致性检查（T28）
 * 用法：node scripts/check-consistency.mjs
 * 检查项：
 *   1. 三端品牌主题变量（色值 / 字体 / 圆角刻度）一致
 *   2. 前端源码无外部图片 / CDN 引用
 *   3. 三端均有金额与北京时间格式化工具
 *   4. 各子项目 README 包含启动命令、默认账号、已知问题
 *   5. server 错误码文档存在
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function listDir(dir) {
  return readdirSync(dir)
}
function isDir(path) {
  return statSync(path).isDirectory()
}

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
let failed = 0
const ok = (name) => console.log(`  ✔ ${name}`)
const bad = (name, detail) => {
  failed += 1
  console.error(`  ✖ ${name}：${detail}`)
}

const read = (rel) => readFileSync(join(root, rel), 'utf-8')

// ---------- 1. 品牌主题一致性 ----------
const BRAND_HEX = {
  '深山棕': '#4a3728',
  '焦糖': '#c89b6a',
  '抹茶': '#7d9b6a',
  '米白': '#faf6ef',
}
const adminCss = read('admin/src/index.css')
const webCss = read('web/src/styles/theme.css')
const miniScss = read('miniapp/src/uni.scss')

for (const [name, hex] of Object.entries(BRAND_HEX)) {
  const inAdmin = adminCss.includes(hex)
  const inWeb = webCss.includes(hex)
  const inMini = miniScss.includes(hex)
  inAdmin && inWeb && inMini
    ? ok(`品牌色 ${name} ${hex} 三端一致`)
    : bad(`品牌色 ${name} ${hex}`, `admin:${inAdmin} web:${inWeb} miniapp:${inMini}`)
}

const serifStack = "'Songti SC'"
const themeFiles = [
  ['admin', adminCss],
  ['web', webCss],
  ['miniapp', miniScss],
]
for (const [label, content] of themeFiles) {
  content.includes(serifStack) ? ok(`${label} 使用统一的衬线标题字体`) : bad(`${label} 衬线标题字体`, '未找到')
}

for (const [label, content] of themeFiles) {
  // 圆角刻度 14（中）与 22（大）应同时存在
  const has14 = content.includes('14px') || content.includes('14rpx')
  const has22 = content.includes('22px') || content.includes('22rpx')
  has14 && has22 ? ok(`${label} 圆角刻度统一（14/22）`) : bad(`${label} 圆角刻度`, `14:${has14} 22:${has22}`)
}

// ---------- 2. 无外部资源 ----------
const walk = (dir, out = []) => {
  for (const entry of listDir(dir)) {
    const full = join(dir, entry)
    if (isDir(full)) walk(full, out)
    else if (/\.(ts|tsx|vue|css|scss)$/.test(entry)) out.push(full)
  }
  return out
}
const frontFiles = [
  ...walk(join(root, 'admin/src')),
  ...walk(join(root, 'web/src')),
  ...walk(join(root, 'miniapp/src')),
]
const offenders = []
for (const file of frontFiles) {
  const content = readFileSync(file, 'utf-8')
    .replace(/https?:\/\/127\.0\.0\.1:\d+/g, '')
    .replace(/https?:\/\/localhost:\d+/g, '')
    .replace(/https?:\/\/www\.w3\.org\/2000\/svg/g, '')
    .replace(/https?:\/\/ui\.shadcn\.com[^\s'"`)]*/g, '')
  const matches = content.match(/https?:\/\/[^\s'"`)]+/g) ?? []
  if (matches.length > 0) {
    offenders.push(`${file.replace(root, '')}: ${matches.slice(0, 2).join(', ')}`)
  }
}
offenders.length === 0 ? ok('前端源码无外部图片 / CDN 引用') : bad('外部资源', offenders.join(' | '))

// ---------- 3. 格式化工具 ----------
const checks = [
  ['admin', 'admin/src/lib/format.ts', /export function formatMoney/],
  ['web', 'web/src/utils/format.ts', /export function formatMoney/],
  ['miniapp', 'miniapp/src/utils/format.ts', /export function formatMoney/],
  ['admin', 'admin/src/lib/format.ts', /export function formatBeijingTime/],
  ['web', 'web/src/utils/format.ts', /export function formatBeijingTime/],
  ['miniapp', 'miniapp/src/utils/format.ts', /export function formatBeijingTime/],
]
for (const [label, rel, re] of checks) {
  read(rel).match(re) ? ok(`${label} 具备 ${re.source.replace('export function ', '')}`) : bad(`${label} ${rel}`, '缺少格式化工具')
}

// ---------- 4. README 完整性 ----------
for (const dir of ['server', 'admin', 'web', 'miniapp']) {
  const rel = `${dir}/README.md`
  if (!existsSync(join(root, rel))) {
    bad(`${rel}`, '不存在')
    continue
  }
  const content = read(rel)
  const hasStart = /## 启动/.test(content)
  const hasAccount = /## 默认账号/.test(content)
  const hasKnown = /## 已知问题/.test(content)
  hasStart && hasAccount && hasKnown
    ? ok(`${rel} 包含启动命令、默认账号、已知问题`)
    : bad(`${rel}`, `启动:${hasStart} 账号:${hasAccount} 已知问题:${hasKnown}`)
}

// ---------- 5. server 文档 ----------
existsSync(join(root, 'server/docs/errors.md')) && read('server/docs/errors.md').includes('| 10000 |')
  ? ok('server 错误码文档齐备')
  : bad('server/docs/errors.md', '缺失或不完整')

console.log(failed === 0 ? '\n全局约定一致性检查全部通过' : `\n存在 ${failed} 个不一致项`)
process.exitCode = failed === 0 ? 0 : 1

