import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildApp } from '../src/app.js'

test('GET /health 返回统一响应格式', async () => {
  const app = await buildApp()
  try {
    const res = await app.inject({ method: 'GET', url: '/health' })
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.code, 0)
    assert.equal(body.message, 'ok')
    assert.equal(body.data.status, 'ok')
    assert.equal(typeof body.data.time, 'string')
  } finally {
    await app.close()
  }
})

test('未知接口返回统一错误格式', async () => {
  const app = await buildApp()
  try {
    const res = await app.inject({ method: 'GET', url: '/not-exist' })
    assert.equal(res.statusCode, 404)
    const body = res.json()
    assert.notEqual(body.code, 0)
    assert.equal(body.data, null)
    assert.equal(typeof body.message, 'string')
    assert.ok(body.message.length > 0)
  } finally {
    await app.close()
  }
})
