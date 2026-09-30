/** 活动时间编辑辅助：UTC ISO8601 ↔ 北京时间输入框（datetime-local，支持到秒） */

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/** UTC ISO8601 → datetime-local 输入值（按北京时间展示；秒为 0 时保持分钟精度） */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString()
  // 23:59:59 这类带秒的时间必须保留秒，否则会被改成 23:59:00
  return shifted.endsWith(':00.000Z') ? shifted.slice(0, 16) : shifted.slice(0, 19)
}

/** datetime-local 输入值（按北京时间理解）→ UTC ISO8601；支持 `YYYY-MM-DDTHH:mm` 与 `YYYY-MM-DDTHH:mm:ss` */
export function localInputToIso(local: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local.trim())
  if (!match) {
    return null
  }
  const [, y, mo, d, h, mi, s] = match
  const utc =
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), s === undefined ? 0 : Number(s)) -
    BEIJING_OFFSET_MS
  return new Date(utc).toISOString()
}

/** 活动状态：未开始 / 进行中 / 已结束 / 已停用 */
export function promoPhase(
  activity: { status: 'active' | 'inactive'; startAt: string; endAt: string } | null,
  now: Date = new Date(),
): { key: 'inactive' | 'pending' | 'running' | 'ended'; text: string } {
  if (!activity) {
    return { key: 'inactive', text: '未配置' }
  }
  if (activity.status !== 'active') {
    return { key: 'inactive', text: '已停用' }
  }
  const start = new Date(activity.startAt).getTime()
  const end = new Date(activity.endAt).getTime()
  const time = now.getTime()
  if (time < start) {
    return { key: 'pending', text: '未开始' }
  }
  if (time > end) {
    return { key: 'ended', text: '已结束' }
  }
  return { key: 'running', text: '进行中' }
}
