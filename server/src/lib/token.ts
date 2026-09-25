import { randomBytes } from 'node:crypto'
import type { Db } from '../db/index.js'

export type TokenKind = 'member' | 'admin'

const MEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000
const ADMIN_TTL_MS = 12 * 60 * 60 * 1000

/** 生成并持久化 token */
export function issueToken(db: Db, kind: TokenKind, userId: number): string {
  const token = randomBytes(24).toString('hex')
  const ttl = kind === 'member' ? MEMBER_TTL_MS : ADMIN_TTL_MS
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttl)
  db.prepare(
    'INSERT INTO tokens (token, kind, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  ).run(token, kind, userId, now.toISOString(), expiresAt.toISOString())
  return token
}

/** 校验 token，返回用户 id；无效或过期返回 null */
export function resolveToken(db: Db, token: string, kind: TokenKind): number | null {
  const row = db
    .prepare('SELECT user_id, expires_at FROM tokens WHERE token = ? AND kind = ?')
    .get(token, kind) as { user_id: number; expires_at: string } | undefined
  if (!row) {
    return null
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM tokens WHERE token = ?').run(token)
    return null
  }
  return row.user_id
}

/** 登出：删除 token */
export function revokeToken(db: Db, token: string): void {
  db.prepare('DELETE FROM tokens WHERE token = ?').run(token)
}
