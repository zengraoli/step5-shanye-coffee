import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openDb } from '../src/db/index.js'
import { seed, hashPassword, verifyPassword } from '../src/db/seed.js'
import { SPEC_GROUPS, isValidSpec, specExtra } from '../src/lib/specs.js'

function count(db: ReturnType<typeof openDb>['db'], table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
  return row.n
}

test('首次启动自动建表并写入种子数据', () => {
  const { db } = openDb({ path: ':memory:' })
  try {
    assert.equal(count(db, 'stores'), 3)
    assert.equal(count(db, 'categories'), 4)
    assert.equal(count(db, 'products'), 24)
    assert.equal(count(db, 'admin_users'), 2)
    assert.equal(count(db, 'coupons'), 2)
  } finally {
    db.close()
  }
})

test('重复启动不会重复写入种子数据', () => {
  const { db, seededCredentials } = openDb({ path: ':memory:' })
  try {
    assert.equal(seededCredentials.length, 2)
    const second = seed(db)
    assert.deepEqual(second, [])
    assert.equal(count(db, 'stores'), 3)
    assert.equal(count(db, 'products'), 24)
    assert.equal(count(db, 'admin_users'), 2)
    assert.equal(count(db, 'coupons'), 2)
  } finally {
    db.close()
  }
})

test('金额字段全部为整数分', () => {
  const { db } = openDb({ path: ':memory:' })
  try {
    const products = db.prepare('SELECT base_price FROM products').all() as { base_price: number }[]
    assert.equal(products.length, 24)
    for (const product of products) {
      assert.ok(Number.isInteger(product.base_price), `base_price 应为整数：${product.base_price}`)
      assert.ok(product.base_price > 0)
    }
    const coupons = db
      .prepare('SELECT threshold_fen, reduce_fen, max_reduce_fen FROM coupons')
      .all() as { threshold_fen: number; reduce_fen: number; max_reduce_fen: number }[]
    for (const coupon of coupons) {
      for (const value of [coupon.threshold_fen, coupon.reduce_fen, coupon.max_reduce_fen]) {
        assert.ok(Number.isInteger(value))
      }
    }
  } finally {
    db.close()
  }
})

test('优惠券种子包含满减与折扣两种类型', () => {
  const { db } = openDb({ path: ':memory:' })
  try {
    const types = db.prepare('SELECT DISTINCT type FROM coupons').all() as { type: string }[]
    assert.deepEqual(
      types.map((row) => row.type).sort(),
      ['discount', 'full_reduction'],
    )
  } finally {
    db.close()
  }
})

test('密码散列与校验', () => {
  const salt = 'abc123'
  const hash = hashPassword('correct-horse', salt)
  assert.ok(verifyPassword('correct-horse', salt, hash))
  assert.ok(!verifyPassword('wrong', salt, hash))
})

test('规格定义：大杯加价 300 分，其余不加价', () => {
  assert.equal(SPEC_GROUPS.length, 3)
  assert.ok(isValidSpec({ cup: 'large', temp: 'ice', sugar: 'less' }))
  assert.ok(!isValidSpec({ cup: 'huge', temp: 'ice', sugar: 'less' }))
  assert.ok(!isValidSpec({ cup: 'large' }))
  assert.equal(specExtra({ cup: 'medium', temp: 'hot', sugar: 'none' }), 0)
  assert.equal(specExtra({ cup: 'large', temp: 'ice', sugar: 'standard' }), 300)
})
