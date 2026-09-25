import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from '../db/index.js'
import { fail } from './errors.js'
import { resolveToken } from './token.js'

export interface MemberSession {
  id: number
  phone: string
  nickname: string
  points: number
  level: string
}

export interface AdminSession {
  id: number
  username: string
  role: 'admin' | 'staff'
  storeId: number | null
  nickname: string
}

declare module 'fastify' {
  interface FastifyRequest {
    member?: MemberSession
    admin?: AdminSession
  }
}

function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice(7).trim()
    return token.length > 0 ? token : null
  }
  return null
}

/** 会员鉴权守卫 */
export function memberGuard(db: Db) {
  return async (request: FastifyRequest): Promise<void> => {
    const token = bearerToken(request)
    if (!token) {
      fail('UNAUTHORIZED')
    }
    const memberId = resolveToken(db, token as string, 'member')
    if (memberId === null) {
      fail('UNAUTHORIZED')
    }
    const member = db
      .prepare('SELECT id, phone, nickname, points, level FROM members WHERE id = ?')
      .get(memberId) as MemberSession | undefined
    if (!member) {
      fail('UNAUTHORIZED')
    }
    request.member = member
  }
}

/** 后台账号鉴权守卫（管理员与店员均可） */
export function adminGuard(db: Db) {
  return async (request: FastifyRequest): Promise<void> => {
    const token = bearerToken(request)
    if (!token) {
      fail('UNAUTHORIZED')
    }
    const adminId = resolveToken(db, token as string, 'admin')
    if (adminId === null) {
      fail('UNAUTHORIZED')
    }
    const admin = db
      .prepare('SELECT id, username, role, store_id, nickname FROM admin_users WHERE id = ? AND status = ?')
      .get(adminId, 'active') as
      | { id: number; username: string; role: string; store_id: number | null; nickname: string }
      | undefined
    if (!admin) {
      fail('UNAUTHORIZED')
    }
    if (admin.role !== 'admin' && admin.role !== 'staff') {
      fail('FORBIDDEN')
    }
    request.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      storeId: admin.store_id,
      nickname: admin.nickname,
    }
  }
}

/** 仅管理员可访问 */
export function adminOnly() {
  return async (request: FastifyRequest): Promise<void> => {
    if (request.admin?.role !== 'admin') {
      fail('FORBIDDEN')
    }
  }
}

/** 取当前会员（守卫之后调用） */
export function currentMember(request: FastifyRequest): MemberSession {
  if (!request.member) {
    fail('UNAUTHORIZED')
  }
  return request.member
}

/** 取当前后台账号（守卫之后调用） */
export function currentAdmin(request: FastifyRequest): AdminSession {
  if (!request.admin) {
    fail('UNAUTHORIZED')
  }
  return request.admin
}

export type { FastifyReply }
