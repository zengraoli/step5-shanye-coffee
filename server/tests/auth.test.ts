import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { beforeEach, test } from 'node:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { openDb } from '../src/db/index.js'

// 测试用密码运行时随机生成，不落库到任何文件
const TEST_ADMIN_PASSWORD = randomBytes(16).toString('hex')
const TEST_STAFF_PASSWORD = randomBytes(16).toString('hex')

let app: FastifyInstance

beforeEach(async () => {
  process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD
  process.env.STAFF_PASSWORD = TEST_STAFF_PASSWORD
  const { db } = openDb({ path: ':memory:' })
  app = await buildApp({ db })
})

async function loginMember(phone: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { phone, code: '123456' },
  })
  assert.equal(res.statusCode, 200, res.body)
  return (res.json().data as { token: string }).token
}

async function loginAdmin(username: string, password: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/auth/login',
    payload: { username, password },
  })
  assert.equal(res.statusCode, 200, res.body)
  return (res.json().data as { token: string }).token
}

test('会员手机号 + 固定验证码登录，返回 token 与会员信息', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { phone: '13812345678', code: '123456' },
  })
  assert.equal(res.statusCode, 200)
  const body = res.json()
  assert.equal(body.code, 0)
  assert.ok(body.data.token.length > 20)
  assert.equal(body.data.member.phone, '13812345678')
  assert.equal(body.data.member.maskedPhone, '138****5678')
  assert.equal(body.data.member.points, 0)
  assert.equal(body.data.member.level, 'silver')
})

test('验证码错误返回 10005', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { phone: '13812345678', code: '000000' },
  })
  assert.equal(res.statusCode, 400)
  const body = res.json()
  assert.equal(body.code, 10005)
  assert.equal(body.data, null)
})

test('手机号格式错误返回 10001', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { phone: '12345', code: '123456' },
  })
  assert.equal(res.statusCode, 400)
  assert.equal(res.json().code, 10001)
})

test('未登录访问受保护接口返回统一错误格式', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/members/me' })
  assert.equal(res.statusCode, 401)
  const body = res.json()
  assert.equal(body.code, 10002)
  assert.equal(body.data, null)
  assert.equal(body.message, '未登录或登录已过期')
})

test('携带会员 token 可以读取本人信息', async () => {
  const token = await loginMember('13900001111')
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/members/me',
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(res.statusCode, 200)
  assert.equal(res.json().data.phone, '13900001111')
})

test('同一手机号重复登录返回同一个会员', async () => {
  const first = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { phone: '13711112222', code: '123456' },
  })
  const second = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { phone: '13711112222', code: '123456' },
  })
  assert.equal(first.json().data.member.id, second.json().data.member.id)
})

test('后台账号密码登录成功', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/auth/login',
    payload: { username: 'admin', password: TEST_ADMIN_PASSWORD },
  })
  assert.equal(res.statusCode, 200)
  const body = res.json()
  assert.equal(body.data.admin.role, 'admin')
  assert.ok(body.data.token.length > 20)
})

test('后台密码错误返回 10006', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/auth/login',
    payload: { username: 'admin', password: 'wrong-pass' },
  })
  assert.equal(res.statusCode, 401)
  assert.equal(res.json().code, 10006)
})

test('店员访问管理员接口被拒绝（403）', async () => {
  const staffToken = await loginAdmin('staff', TEST_STAFF_PASSWORD)
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/accounts',
    headers: { authorization: `Bearer ${staffToken}` },
  })
  assert.equal(res.statusCode, 403)
  const body = res.json()
  assert.equal(body.code, 10003)
  assert.equal(body.message, '没有权限执行该操作')
})

test('管理员可以访问账号列表，店员 token 不能访问会员接口', async () => {
  const adminToken = await loginAdmin('admin', TEST_ADMIN_PASSWORD)
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/accounts',
    headers: { authorization: `Bearer ${adminToken}` },
  })
  assert.equal(res.statusCode, 200)
  const accounts = res.json().data as { username: string; role: string }[]
  assert.equal(accounts.length, 2)
  assert.ok(accounts.some((item) => item.role === 'staff'))

  const memberRes = await app.inject({
    method: 'GET',
    url: '/api/v1/members/me',
    headers: { authorization: `Bearer ${adminToken}` },
  })
  assert.equal(memberRes.statusCode, 401)
  assert.equal(memberRes.json().code, 10002)
})

test('会员 token 不能访问后台接口', async () => {
  const token = await loginMember('13611112222')
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/auth/me',
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(res.statusCode, 401)
  assert.equal(res.json().code, 10002)
})

test('登出后 token 失效', async () => {
  const token = await loginMember('13511112222')
  const logout = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout',
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(logout.statusCode, 200)
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/members/me',
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(res.statusCode, 401)
})
