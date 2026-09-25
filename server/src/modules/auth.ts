import type { FastifyInstance } from 'fastify'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
import { isValidPhone } from '../lib/phone.js'
import { issueToken, revokeToken } from '../lib/token.js'
import { adminGuard, memberGuard } from '../lib/guards.js'
import { verifyPassword } from '../db/seed.js'
import { serializeMember } from './points.js'

/** 演示环境固定短信验证码 */
export const DEMO_CODE = '123456'

interface LoginBody {
  phone?: unknown
  code?: unknown
}

interface AdminLoginBody {
  username?: unknown
  password?: unknown
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  // ---------- 会员 ----------

  app.post<{ Body: LoginBody }>('/api/v1/auth/sms-code', { schema: { tags: ['auth'], summary: '获取短信验证码（演示环境固定 123456）' } }, async (request, reply) => {
    const { phone } = request.body ?? {}
    if (!isValidPhone(phone)) {
      fail('INVALID_PHONE')
    }
    return sendOk(reply, {
      phone,
      code: DEMO_CODE,
      message: '演示环境验证码固定为 123456',
    })
  })

  app.post<{ Body: LoginBody }>('/api/v1/auth/login', { schema: { tags: ['auth'], summary: '会员手机号 + 验证码登录' } }, async (request, reply) => {
    const { phone, code } = request.body ?? {}
    if (!isValidPhone(phone)) {
      fail('INVALID_PHONE')
    }
    if (code !== DEMO_CODE) {
      fail('CODE_INVALID')
    }
    db.prepare(
      `INSERT INTO members (phone, nickname, created_at) VALUES (?, ?, ?)
       ON CONFLICT(phone) DO NOTHING`,
    ).run(phone, `咖啡友${phone.slice(-4)}`, new Date().toISOString())
    const member = db
      .prepare('SELECT id, phone, nickname, points, level, created_at FROM members WHERE phone = ?')
      .get(phone) as { id: number; phone: string; nickname: string; points: number; level: string; created_at: string }
    const token = issueToken(db, 'member', member.id)
    return sendOk(reply, { token, member: serializeMember(db, member) })
  })

  app.register(async (instance) => {
    instance.addHook('preHandler', memberGuard(db))

    instance.get('/api/v1/members/me', { schema: { tags: ['auth', 'members'], summary: '当前会员信息', security: [{ memberBearer: [] }] } }, async (request, reply) => {
      const session = request.member!
      const member = db
        .prepare('SELECT id, phone, nickname, points, level, created_at FROM members WHERE id = ?')
        .get(session.id) as { id: number; phone: string; nickname: string; points: number; level: string; created_at: string }
      return sendOk(reply, serializeMember(db, member))
    })

    instance.post('/api/v1/auth/logout', { schema: { tags: ['auth'], summary: '会员登出', security: [{ memberBearer: [] }] } }, async (request, reply) => {
      const header = request.headers.authorization
      if (typeof header === 'string' && header.startsWith('Bearer ')) {
        revokeToken(db, header.slice(7).trim())
      }
      return sendOk(reply, { loggedOut: true })
    })
  })

  // ---------- 后台 ----------

  app.post<{ Body: AdminLoginBody }>('/api/v1/admin/auth/login', { schema: { tags: ['auth'], summary: '后台账号密码登录' } }, async (request, reply) => {
    const { username, password } = request.body ?? {}
    if (typeof username !== 'string' || typeof password !== 'string' || username.length === 0 || password.length === 0) {
      fail('BAD_REQUEST', '请输入账号和密码')
    }
    const row = db
      .prepare('SELECT id, username, password_hash, salt, role, store_id, nickname, status FROM admin_users WHERE username = ?')
      .get(username) as
      | { id: number; username: string; password_hash: string; salt: string; role: string; store_id: number | null; nickname: string; status: string }
      | undefined
    if (!row || row.status !== 'active') {
      fail('LOGIN_FAILED')
    }
    if (!verifyPassword(password, row.salt, row.password_hash)) {
      fail('LOGIN_FAILED')
    }
    const token = issueToken(db, 'admin', row.id)
    return sendOk(reply, {
      token,
      admin: {
        id: row.id,
        username: row.username,
        role: row.role,
        storeId: row.store_id,
        nickname: row.nickname,
      },
    })
  })

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))

    instance.get('/api/v1/admin/auth/me', { schema: { tags: ['auth'], summary: '当前后台账号信息', security: [{ adminBearer: [] }] } }, async (request, reply) => {
      const admin = request.admin!
      return sendOk(reply, {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        storeId: admin.storeId,
        nickname: admin.nickname,
      })
    })

    instance.post('/api/v1/admin/auth/logout', { schema: { tags: ['auth'], summary: '后台登出', security: [{ adminBearer: [] }] } }, async (request, reply) => {
      const header = request.headers.authorization
      if (typeof header === 'string' && header.startsWith('Bearer ')) {
        revokeToken(db, header.slice(7).trim())
      }
      return sendOk(reply, { loggedOut: true })
    })
  })
}
