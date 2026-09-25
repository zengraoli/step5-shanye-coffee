import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import StoryPage from './StoryPage.vue'

function mountPage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return mount(StoryPage, { global: { plugins: [router] } })
}

/** 递归收集目录下所有文件 */
function collectFiles(dir: string): string[] {
  const result: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      result.push(...collectFiles(full))
    } else {
      result.push(full)
    }
  }
  return result
}

describe('StoryPage', () => {
  test('渲染品牌故事内容与插画', () => {
    const wrapper = mountPage()
    const text = wrapper.text()
    expect(text).toContain('从一座山')
    expect(text).toContain('山野的十年')
    expect(text).toContain('产地：普洱的山与云')
    expect(text).toContain('烘焙：曲线即性格')
    expect(text).toContain('冲煮：把风味交给你')
    expect(text).toContain('2016')
    expect(text).toContain('2026')
    expect(text).toContain('1 : 15')
    // 三幅自绘插画
    expect(wrapper.findAll('svg').length).toBeGreaterThanOrEqual(3)
  })

  test('不使用 img 标签或外部资源地址', () => {
    const wrapper = mountPage()
    // 无 <img>
    expect(wrapper.findAll('img').length).toBe(0)
    // 无外链资源（http/https 引用，排除 api 客户端与路由）
    const html = wrapper.html()
    const external = html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+["']/gi) ?? []
    expect(external).toEqual([])
  })

  test('源码中不引用外部图片或 CDN 资源', () => {
    const files = collectFiles('src').filter((file) => /\.(vue|ts|css)$/.test(file))
    const offenders: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      // 允许：API 基地址、localhost 开发地址、SVG 必需的 XML 命名空间声明
      const cleaned = content
        .replace(/import\.meta\.env\.VITE_API_BASE_URL[^\n]*/g, '')
        .replace(/http:\/\/127\.0\.0\.1:\d+/g, '')
        .replace(/http:\/\/localhost:\d+/g, '')
        .replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '')
      const matches = cleaned.match(/https?:\/\/[^\s'"`)]+/g) ?? []
      if (matches.length > 0) {
        offenders.push(`${file}: ${matches.slice(0, 3).join(', ')}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
