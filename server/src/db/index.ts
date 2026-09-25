import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { migrate } from './schema.js'
import { seed, type SeededCredential } from './seed.js'

export type Db = DatabaseSync

export interface OpenDbOptions {
  /** 数据库文件路径，':memory:' 表示内存库（测试用） */
  path: string
  /** 是否写入种子数据，默认 true */
  withSeed?: boolean
}

export interface OpenedDb {
  db: Db
  /** 首次创建时生成的后台账号凭据，重复启动为空数组 */
  seededCredentials: SeededCredential[]
}

/** 默认数据库文件位置（可通过 DB_PATH 覆盖） */
export function defaultDbPath(): string {
  return process.env.DB_PATH ?? resolve(process.cwd(), 'data', 'shanye.db')
}

/** 打开数据库：建表 + 种子数据（幂等） */
export function openDb(options: OpenDbOptions): OpenedDb {
  if (options.path !== ':memory:') {
    mkdirSync(dirname(options.path), { recursive: true })
  }
  const db = new DatabaseSync(options.path)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 3000')
  migrate(db)
  const seededCredentials = options.withSeed === false ? [] : seed(db)
  return { db, seededCredentials }
}
