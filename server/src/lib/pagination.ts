import { fail } from './errors.js'

export interface Pagination {
  page: number
  pageSize: number
  offset: number
}

/** page 上限：超出视为参数错误，避免 OFFSET 超大导致 SQLite 报错 */
export const MAX_PAGE = 100000

/**
 * 读取分页参数。非法（非正整数、超出范围）直接返回 400 中文提示，
 * 避免 page=1e20、page=abc 之类的输入触发 500。
 */
export function readPagination(
  query: { page?: unknown; page_size?: unknown; pageSize?: unknown },
  options: { defaultSize: number; maxSize: number },
): Pagination {
  const rawPage = query.page
  let page = 1
  if (rawPage !== undefined && rawPage !== '' && rawPage !== null) {
    const value = Number(rawPage)
    if (!Number.isInteger(value) || value < 1 || value > MAX_PAGE) {
      fail('BAD_REQUEST', '页码必须为 1-100000 的整数')
    }
    page = value
  }
  const rawSize = query.page_size ?? query.pageSize
  let pageSize = options.defaultSize
  if (rawSize !== undefined && rawSize !== '' && rawSize !== null) {
    const value = Number(rawSize)
    if (!Number.isInteger(value) || value < 1 || value > options.maxSize) {
      fail('BAD_REQUEST', `每页条数必须为 1-${options.maxSize} 的整数`)
    }
    pageSize = value
  }
  return { page, pageSize, offset: (page - 1) * pageSize }
}

/** 读取日期参数（YYYY-MM-DD），并校验是真实存在的日期 */
export function readDate(value: unknown, label = '日期'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('BAD_REQUEST', `${label}格式应为 YYYY-MM-DD`)
  }
  const text = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) {
    fail('BAD_REQUEST', `${label}格式应为 YYYY-MM-DD`)
  }
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    fail('BAD_REQUEST', `${label}不是有效的日期`)
  }
  return text
}
