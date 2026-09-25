/** 金额与时间格式化：界面统一 ¥xx.xx 与北京时间 */

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/** 整数分 → ¥xx.xx */
export function formatMoney(fen: number): string {
  const safe = Number.isFinite(fen) ? Math.round(fen) : 0
  const sign = safe < 0 ? '-' : ''
  const abs = Math.abs(safe)
  return `${sign}¥${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
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
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 16)
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

/** 会员等级文案 */
export const LEVEL_TEXT: Record<string, string> = {
  silver: '银卡',
  gold: '金卡',
  black: '黑卡',
}
