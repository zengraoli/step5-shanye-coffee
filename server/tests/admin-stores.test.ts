import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, loginAdmin } from './helpers.js'

test('后台门店列表', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stores',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const stores = res.json().data as { id: number; name: string; status: string; statusText: string }[]
    assert.equal(stores.length, 3)
    assert.ok(stores.every((store) => ['open', 'rest'].includes(store.status)))
  } finally {
    await app.close()
  }
})

test('编辑门店信息与营业时间', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/stores/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: '山野咖啡 · 望京旗舰店',
        address: '北京市朝阳区望京街道新地址 100 号',
        phone: '010-64789999',
        openTime: '07:30',
        closeTime: '22:30',
      },
    })
    assert.equal(res.statusCode, 200, res.body)
    const store = res.json().data
    assert.equal(store.name, '山野咖啡 · 望京旗舰店')
    assert.equal(store.openTime, '07:30')
    assert.equal(store.closeTime, '22:30')

    // 用户端接口同步生效
    const publicRes = await app.inject({ method: 'GET', url: '/api/v1/stores/1' })
    assert.equal(publicRes.json().data.name, '山野咖啡 · 望京旗舰店')
  } finally {
    await app.close()
  }
})

test('营业时间格式不合法被拒绝', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/stores/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { openTime: '25:00' },
    })
    assert.equal(res.statusCode, 400)
    assert.equal(res.json().code, 10000)

    const empty = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/stores/1',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {},
    })
    assert.equal(empty.statusCode, 400)
  } finally {
    await app.close()
  }
})

test('店员不能编辑门店', async () => {
  const { app } = await createTestApp()
  const staffToken = await loginAdmin(app, 'staff')
  try {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/stores/1',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { name: '非法修改' },
    })
    assert.equal(res.statusCode, 403)
    assert.equal(res.json().code, 10003)
  } finally {
    await app.close()
  }
})

test('编辑不存在的门店返回 20001', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/stores/999',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: '测试' },
    })
    assert.equal(res.statusCode, 404)
    assert.equal(res.json().code, 20001)
  } finally {
    await app.close()
  }
})
