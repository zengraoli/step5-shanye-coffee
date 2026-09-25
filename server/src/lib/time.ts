/** 时间工具：存储与传输统一 UTC ISO8601，界面按北京时间（UTC+8）展示 */

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/** 当前时刻的 UTC ISO8601 字符串 */
export function nowIso(): string {
  return new Date().toISOString()
}

/** 当前北京时间（用于营业状态判断，返回 UTC 时间戳） */
export function beijingNow(): Date {
  return new Date(Date.now() + BEIJING_OFFSET_MS)
}

function parseHm(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) {
    return null
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) {
    return null
  }
  return { hour, minute }
}

/**
 * 判断门店当前是否营业。营业时间为北京时间 HH:mm，支持跨天（close <= open 视为次日打烊）。
 */
export function isWithinBusinessHours(openTime: string, closeTime: string, at: Date = beijingNow()): boolean {
  const open = parseHm(openTime)
  const close = parseHm(closeTime)
  if (!open || !close) {
    return false
  }
  const minutes = at.getUTCHours() * 60 + at.getUTCMinutes()
  const openMinutes = open.hour * 60 + open.minute
  const closeMinutes = close.hour * 60 + close.minute
  if (closeMinutes === openMinutes) {
    return true
  }
  if (closeMinutes > openMinutes) {
    return minutes >= openMinutes && minutes < closeMinutes
  }
  // 跨天：如 20:00 - 02:00
  return minutes >= openMinutes || minutes < closeMinutes
}

/** UTC ISO8601 转北京时间展示字符串 YYYY-MM-DD HH:mm */
export function toBeijingDisplay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS)
  return shifted.toISOString().replace('T', ' ').slice(0, 16)
}
