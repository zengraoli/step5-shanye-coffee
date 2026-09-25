import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { openDb } from '../src/db/index.js'

/** 测试用后台密码运行时随机生成，不写入任何文件 */
export const ADMIN_PASSWORD = randomBytes(16).toString('hex')
export const STAFF_PASSWORD = randomBytes(16).toString('hex')

export interface TestContext {
  app: FastifyInstance
  db: ReturnType<typeof openDb>['db']
}

/** 创建带种子数据的测试应用（内存库） */
export async function createTestApp(): Promise<TestContext> {
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD
  process.env.STAFF_PASSWORD = STAFF_PASSWORD
  const { db } = openDb({ path: ':memory:' })
  const app = await buildApp({ db })
  return { app, db }
}

export async function loginMember(app: FastifyInstance, phone: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { phone, code: '123456' },
  })
  if (res.statusCode !== 200) {
    throw new Error(`会员登录失败：${res.body}`)
  }
  return (res.json().data as { token: string }).token
}

export async function loginAdmin(
  app: FastifyInstance,
  username: 'admin' | 'staff' = 'admin',
): Promise<string> {
  const password = username === 'admin' ? ADMIN_PASSWORD : STAFF_PASSWORD
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/auth/login',
    payload: { username, password },
  })
  if (res.statusCode !== 200) {
    throw new Error(`后台登录失败：${res.body}`)
  }
  return (res.json().data as { token: string }).token
}
