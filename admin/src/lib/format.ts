/** 金额（分）与时间格式化：界面统一显示 ¥xx.xx 与北京时间 */

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/** 整数分 → ¥xx.xx */
export function formatMoney(fen: number): string {
  const safe = Number.isFinite(fen) ? Math.round(fen) : 0
  const sign = safe < 0 ? '-' : ''
  const abs = Math.abs(safe)
  const yuan = Math.floor(abs / 100)
  const cents = abs % 100
  return `${sign}¥${yuan}.${String(cents).padStart(2, '0')}`
}

/** UTC ISO8601 → 北京时间 YYYY-MM-DD HH:mm */
export function formatBeijingTime(iso: string | null | undefined): string {
  if (!iso) {
    return '-'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS)
  return shifted.toISOString().replace('T', ' ').slice(0, 16)
}

/** UTC ISO8601 → 北京时间日期 YYYY-MM-DD */
export function formatBeijingDate(iso: string | null | undefined): string {
  if (!iso) {
    return '-'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 10)
}

/** 今天的北京时间日期 YYYY-MM-DD（用于看板默认查询） */
export function todayBeijing(): string {
  return new Date(Date.now() + BEIJING_OFFSET_MS).toISOString().slice(0, 10)
}

/** 手机号脱敏展示（服务端已脱敏，这里兜底） */
export function maskPhone(phone: string): string {
  if (!/^1\d{10}$/.test(phone)) {
    return phone
  }
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}
