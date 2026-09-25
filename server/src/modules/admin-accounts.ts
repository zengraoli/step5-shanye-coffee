import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/index.js'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
import { adminGuard, adminOnly } from '../lib/guards.js'
import { hashPassword } from '../db/seed.js'

interface AdminUserRow {
  id: number
  username: string
  password_hash: string
  salt: string
  role: string
  store_id: number | null
  nickname: string
  status: string
  created_at: string
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

function serializeAdmin(row: AdminUserRow & { store_name: string | null }) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    storeId: row.store_id,
    storeName: row.store_name,
    nickname: row.nickname,
    status: row.status,
    createdAt: row.created_at,
  }
}

function loadAdmin(db: Db, id: number): (AdminUserRow & { store_name: string | null }) | undefined {
  return db
    .prepare(
      `SELECT a.*, s.name AS store_name FROM admin_users a
       LEFT JOIN stores s ON s.id = a.store_id WHERE a.id = ?`,
    )
    .get(id) as unknown as (AdminUserRow & { store_name: string | null }) | undefined
}

/** 后台账号管理：列表、新增、停用、重置密码、角色分配 */
export async function adminAccountRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))
    instance.addHook('preHandler', adminOnly())

    instance.get(
      '/api/v1/admin/accounts',
      { schema: { tags: ['admin'], summary: '后台账号列表（含创建时间）', security: [{ adminBearer: [] }] } },
      async (_request, reply) => {
        const rows = db
          .prepare(
            `SELECT a.*, s.name AS store_name FROM admin_users a
             LEFT JOIN stores s ON s.id = a.store_id ORDER BY a.id`,
          )
          .all() as unknown as (AdminUserRow & { store_name: string | null })[]
        return sendOk(reply, rows.map(serializeAdmin))
      },
    )

    interface CreateBody {
      username?: unknown
      password?: unknown
      role?: unknown
      storeId?: unknown
      nickname?: unknown
    }
    instance.post<{ Body: CreateBody }>(
      '/api/v1/admin/accounts',
      { schema: { tags: ['admin'], summary: '新增后台账号', security: [{ adminBearer: [] }] } },
      async (request, reply) => {
        const body = request.body ?? {}
        const username = typeof body.username === 'string' ? body.username.trim() : ''
        if (!USERNAME_RE.test(username)) {
          fail('BAD_REQUEST', '账号须为 3-20 位字母、数字或下划线')
        }
        const exists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username)
        if (exists) {
          fail('BAD_REQUEST', '账号已存在')
        }
        const role = body.role
        if (role !== 'admin' && role !== 'staff') {
          fail('BAD_REQUEST', '角色必须为 admin 或 staff')
        }
        let storeId: number | null = null
        if (body.storeId !== undefined && body.storeId !== null && body.storeId !== '') {
          const value = Number(body.storeId)
          if (!Number.isInteger(value) || value <= 0) {
            fail('BAD_REQUEST', '绑定门店 id 不合法')
          }
          const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(value)
          if (!store) {
            fail('STORE_NOT_FOUND', '绑定门店不存在')
          }
          storeId = value
        }
        if (role === 'staff' && storeId === null) {
          fail('BAD_REQUEST', '店员账号必须绑定门店')
        }
        let password: string
        if (typeof body.password === 'string' && body.password.length > 0) {
          if (body.password.length < 6) {
            fail('BAD_REQUEST', '密码至少 6 位')
          }
          password = body.password
        } else {
          password = randomBytes(12).toString('hex')
        }
        const nickname =
          typeof body.nickname === 'string' && body.nickname.trim().length > 0
            ? body.nickname.trim().slice(0, 20)
            : username
        const salt = randomBytes(16).toString('hex')
        const info = db
          .prepare(
            `INSERT INTO admin_users (username, password_hash, salt, role, store_id, nickname, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
          )
          .run(username, hashPassword(password, salt), salt, role, storeId, nickname, new Date().toISOString())
        const created = loadAdmin(db, Number(info.lastInsertRowid))!
        return sendOk(reply, { account: serializeAdmin(created), password }, 201)
      },
    )

    instance.patch<{ Params: { id: string }; Body: { status?: unknown } }>(
      '/api/v1/admin/accounts/:id/status',
      { schema: { tags: ['admin'], summary: '停用 / 启用后台账号', security: [{ adminBearer: [] }] } },
      async (request, reply) => {
        const admin = request.admin!
        const id = Number(request.params.id)
        if (!Number.isInteger(id) || id <= 0) {
          fail('BAD_REQUEST', '账号 id 不合法')
        }
        if (id === admin.id) {
          fail('FORBIDDEN', '不能停用当前登录账号')
        }
        const status = request.body?.status
        if (status !== 'active' && status !== 'inactive') {
          fail('BAD_REQUEST', '状态必须为 active 或 inactive')
        }
        const target = loadAdmin(db, id)
        if (!target) {
          fail('NOT_FOUND', '账号不存在')
        }
        if (target.role === 'admin' && status === 'inactive') {
          const activeAdmins = db
            .prepare(`SELECT COUNT(*) AS n FROM admin_users WHERE role = 'admin' AND status = 'active'`)
            .get() as unknown as { n: number }
          if (activeAdmins.n <= 1) {
            fail('FORBIDDEN', '至少保留一个启用的管理员账号')
          }
        }
        db.prepare('UPDATE admin_users SET status = ? WHERE id = ?').run(status, id)
        if (status === 'inactive') {
          db.prepare(`DELETE FROM tokens WHERE kind = 'admin' AND user_id = ?`).run(id)
        }
        const updated = loadAdmin(db, id)!
        return sendOk(reply, serializeAdmin(updated))
      },
    )

    instance.post<{ Params: { id: string }; Body: { password?: unknown } }>(
      '/api/v1/admin/accounts/:id/reset-password',
      { schema: { tags: ['admin'], summary: '重置后台账号密码', security: [{ adminBearer: [] }] } },
      async (request, reply) => {
        const id = Number(request.params.id)
        if (!Number.isInteger(id) || id <= 0) {
          fail('BAD_REQUEST', '账号 id 不合法')
        }
        const target = loadAdmin(db, id)
        if (!target) {
          fail('NOT_FOUND', '账号不存在')
        }
        const provided = request.body?.password
        if (provided !== undefined && (typeof provided !== 'string' || provided.length < 6)) {
          fail('BAD_REQUEST', '密码至少 6 位')
        }
        const password =
          typeof provided === 'string' && provided.length > 0 ? provided : randomBytes(12).toString('hex')
        const salt = randomBytes(16).toString('hex')
        db.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?').run(
          hashPassword(password, salt),
          salt,
          id,
        )
        db.prepare(`DELETE FROM tokens WHERE kind = 'admin' AND user_id = ?`).run(id)
        return sendOk(reply, {
          id,
          username: target.username,
          password,
          generated: typeof provided !== 'string',
        })
      },
    )

    interface UpdateBody {
      role?: unknown
      storeId?: unknown
      nickname?: unknown
    }
    instance.patch<{ Params: { id: string }; Body: UpdateBody }>(
      '/api/v1/admin/accounts/:id',
      { schema: { tags: ['admin'], summary: '修改角色与门店绑定', security: [{ adminBearer: [] }] } },
      async (request, reply) => {
        const admin = request.admin!
        const id = Number(request.params.id)
        if (!Number.isInteger(id) || id <= 0) {
          fail('BAD_REQUEST', '账号 id 不合法')
        }
        const target = loadAdmin(db, id)
        if (!target) {
          fail('NOT_FOUND', '账号不存在')
        }
        const body = request.body ?? {}
        if (body.role !== undefined && body.role !== 'admin' && body.role !== 'staff') {
          fail('BAD_REQUEST', '角色必须为 admin 或 staff')
        }
        const nextRole = body.role !== undefined ? (body.role as string) : target.role
        if (id === admin.id && body.role !== undefined && body.role !== target.role) {
          fail('FORBIDDEN', '不能修改当前登录账号的角色')
        }

        let nextStoreId: number | null = target.store_id
        if (body.storeId !== undefined) {
          if (body.storeId === null || body.storeId === '') {
            nextStoreId = null
          } else {
            const value = Number(body.storeId)
            if (!Number.isInteger(value) || value <= 0) {
              fail('BAD_REQUEST', '绑定门店 id 不合法')
            }
            const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(value)
            if (!store) {
              fail('STORE_NOT_FOUND', '绑定门店不存在')
            }
            nextStoreId = value
          }
        }
        if (nextRole === 'staff' && nextStoreId === null) {
          fail('BAD_REQUEST', '店员账号必须绑定门店')
        }
        const updates: string[] = []
        const params: (string | number | null)[] = []
        if (body.role !== undefined) {
          updates.push('role = ?')
          params.push(nextRole)
        }
        if (body.storeId !== undefined) {
          updates.push('store_id = ?')
          params.push(nextStoreId)
        }
        if (body.nickname !== undefined) {
          const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 20) : ''
          if (nickname.length === 0) {
            fail('BAD_REQUEST', '昵称不能为空')
          }
          updates.push('nickname = ?')
          params.push(nickname)
        }
        if (updates.length === 0) {
          fail('BAD_REQUEST', '没有需要更新的字段')
        }
        params.push(id)
        db.prepare(`UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`).run(...params)
        const updated = loadAdmin(db, id)!
        return sendOk(reply, serializeAdmin(updated))
      },
    )
  })
}
