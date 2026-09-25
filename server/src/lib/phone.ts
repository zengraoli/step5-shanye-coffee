/** 手机号校验与脱敏 */
const PHONE_RE = /^1[3-9]\d{9}$/

export function isValidPhone(phone: unknown): phone is string {
  return typeof phone === 'string' && PHONE_RE.test(phone)
}

/** 脱敏为 138****1234 */
export function maskPhone(phone: string): string {
  if (!PHONE_RE.test(phone)) {
    return phone
  }
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}
