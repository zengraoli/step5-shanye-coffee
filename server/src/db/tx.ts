import type { Db } from './index.js'

/** 记录每个连接的事务嵌套深度，避免 node:sqlite 不支持嵌套 BEGIN 的问题 */
const depths = new WeakMap<Db, number>()

/**
 * 事务包裹。已在事务中时直接执行（由最外层统一提交 / 回滚）。
 * node:sqlite 为同步 API，嵌套深度可安全追踪。
 */
export function withTransaction<T>(db: Db, fn: () => T): T {
  const depth = depths.get(db) ?? 0
  if (depth > 0) {
    return fn()
  }
  db.exec('BEGIN IMMEDIATE')
  depths.set(db, 1)
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
  } finally {
    depths.set(db, 0)
  }
}
