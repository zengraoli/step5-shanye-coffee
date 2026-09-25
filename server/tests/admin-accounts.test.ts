import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, loginAdmin } from './helpers.js'

const NEW_PASSWORD = 'new-account-pass-1'

async function createAccount(
  app: Awaited<ReturnType<typeof createTestApp>>['app'],
  token: string,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/admin/accounts',
    headers: { authorization: `Bearer ${token}` },
    payload,
  })
}

test('新增后台账号并返回初始密码', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const res = await createAccount(app, adminToken, {
      username: 'staff2',
      role: 'staff',
      storeId: 2,
      nickname: '三里屯店员',
    })
    assert.equal(res.statusCode, 201, res.body)
    const body = res.json().data
    assert.equal(body.account.username, 'staff2')
    assert.equal(body.account.role, 'staff')
    assert.equal(body.account.storeId, 2)
    assert.ok(body.password.length >= 6)

    // 新账号可以登录
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { username: 'staff2', password: body.password },
    })
    assert.equal(login.statusCode, 200, login.body)
    assert.equal(login.json().data.admin.storeId, 2)

    // 列表包含新账号与创建时间
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/accounts',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const accounts = list.json().data as { username: string; createdAt: string }[]
    assert.equal(accounts.length, 3)
    assert.ok(accounts.every((item) => typeof item.createdAt === 'string'))
  } finally {
    await app.close()
  }
})

test('账号名校验与重复注册', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const bad = await createAccount(app, adminToken, { username: 'a', role: 'admin' })
    assert.equal(bad.statusCode, 400)
    assert.equal(bad.json().code, 10000)

    const duplicate = await createAccount(app, adminToken, { username: 'admin', role: 'admin' })
    assert.equal(duplicate.statusCode, 400)
    assert.match(duplicate.json().message, /已存在/)

    const staffNoStore = await createAccount(app, adminToken, { username: 'staff9', role: 'staff' })
    assert.equal(staffNoStore.statusCode, 400)
    assert.match(staffNoStore.json().message, /绑定门店/)
  } finally {
    await app.close()
  }
})

test('停用账号后无法登录，启用后恢复', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const created = await createAccount(app, adminToken, {
      username: 'tempstaff',
      role: 'staff',
      storeId: 1,
      password: NEW_PASSWORD,
    })
    const id = created.json().data.account.id as number

    const disabled = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/accounts/${id}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'inactive' },
    })
    assert.equal(disabled.statusCode, 200)
    assert.equal(disabled.json().data.status, 'inactive')

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { username: 'tempstaff', password: NEW_PASSWORD },
    })
    assert.equal(login.statusCode, 401)
    assert.equal(login.json().code, 10006)

    const enabled = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/accounts/${id}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'active' },
    })
    assert.equal(enabled.json().data.status, 'active')
    const loginAgain = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { username: 'tempstaff', password: NEW_PASSWORD },
    })
    assert.equal(loginAgain.statusCode, 200)
  } finally {
    await app.close()
  }
})

test('不能停用自己，也不能停用最后一个管理员', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const self = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/accounts/1/status',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'inactive' },
    })
    assert.equal(self.statusCode, 403)
    assert.equal(self.json().code, 10003)
  } finally {
    await app.close()
  }
})

test('重置密码：旧密码失效，新密码生效', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const created = await createAccount(app, adminToken, {
      username: 'resetstaff',
      role: 'staff',
      storeId: 1,
      password: 'old-pass-123',
    })
    const id = created.json().data.account.id as number

    // 先登录拿到 token，重置后 token 失效
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { username: 'resetstaff', password: 'old-pass-123' },
    })
    const oldToken = login.json().data.token as string

    const reset = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/accounts/${id}/reset-password`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { password: 'brand-new-pass-9' },
    })
    assert.equal(reset.statusCode, 200, reset.body)
    assert.equal(reset.json().data.generated, false)

    const oldLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { username: 'resetstaff', password: 'old-pass-123' },
    })
    assert.equal(oldLogin.statusCode, 401)

    const newLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { username: 'resetstaff', password: 'brand-new-pass-9' },
    })
    assert.equal(newLogin.statusCode, 200)

    // 旧 token 已失效
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/me',
      headers: { authorization: `Bearer ${oldToken}` },
    })
    assert.equal(me.statusCode, 401)
  } finally {
    await app.close()
  }
})

test('未提供密码时服务端生成随机密码', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const created = await createAccount(app, adminToken, { username: 'genstaff', role: 'staff', storeId: 1 })
    const password = created.json().data.password as string
    assert.ok(password.length >= 6)
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { username: 'genstaff', password },
    })
    assert.equal(login.statusCode, 200)
  } finally {
    await app.close()
  }
})

test('角色分配：店员可改管理员，管理员不能改自己角色', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const created = await createAccount(app, adminToken, { username: 'rolestaff', role: 'staff', storeId: 1 })
    const id = created.json().data.account.id as number

    const promoted = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/accounts/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'admin', storeId: null },
    })
    assert.equal(promoted.statusCode, 200, promoted.body)
    assert.equal(promoted.json().data.role, 'admin')
    assert.equal(promoted.json().data.storeId, null)

    const demoted = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/accounts/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'staff', storeId: 3 },
    })
    assert.equal(demoted.json().data.role, 'staff')
    assert.equal(demoted.json().data.storeId, 3)

    // 改成店员但未绑门店被拒绝
    const noStore = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/accounts/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'staff', storeId: null },
    })
    assert.equal(noStore.statusCode, 400)

    // 不能修改自己的角色
    const selfRole = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/accounts/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'staff' },
    })
    assert.equal(selfRole.statusCode, 403)
  } finally {
    await app.close()
  }
})

test('店员不能访问账号管理接口', async () => {
  const { app } = await createTestApp()
  const staffToken = await loginAdmin(app, 'staff')
  try {
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/accounts',
      headers: { authorization: `Bearer ${staffToken}` },
    })
    assert.equal(list.statusCode, 403)
    assert.equal(list.json().code, 10003)

    const create = await createAccount(app, staffToken, { username: 'hacker', role: 'admin' })
    assert.equal(create.statusCode, 403)
  } finally {
    await app.close()
  }
})
