import type { Db } from './index.js'

/** 简单事务包裹（node:sqlite 为同步 API） */
export function withTransaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // 事务已回滚时忽略
    }
    throw error
  }
}
