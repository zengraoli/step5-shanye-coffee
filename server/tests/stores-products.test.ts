import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestApp, loginAdmin } from './helpers.js'
import { maskPhone } from '../src/lib/phone.js'

test('门店列表返回 3 家门店与营业状态', async () => {
  const { app } = await createTestApp()
  try {
    const res = await app.inject({ method: 'GET', url: '/api/v1/stores' })
    assert.equal(res.statusCode, 200)
    const stores = res.json().data as Record<string, unknown>[]
    assert.equal(stores.length, 3)
    for (const store of stores) {
      assert.ok(['open', 'rest'].includes(store.status as string))
      assert.ok(['营业中', '休息中'].includes(store.statusText as string))
      assert.equal(typeof store.openTime, 'string')
      assert.equal(typeof store.closeTime, 'string')
    }
  } finally {
    await app.close()
  }
})

test('门店详情：存在与不存在', async () => {
  const { app } = await createTestApp()
  try {
    const ok = await app.inject({ method: 'GET', url: '/api/v1/stores/1' })
    assert.equal(ok.statusCode, 200)
    assert.equal(ok.json().data.name, '山野咖啡 · 望京店')

    const missing = await app.inject({ method: 'GET', url: '/api/v1/stores/999' })
    assert.equal(missing.statusCode, 404)
    assert.equal(missing.json().code, 20001)

    const bad = await app.inject({ method: 'GET', url: '/api/v1/stores/abc' })
    assert.equal(bad.statusCode, 400)
    assert.equal(bad.json().code, 10000)
  } finally {
    await app.close()
  }
})

test('分类列表返回 4 个分类', async () => {
  const { app } = await createTestApp()
  try {
    const res = await app.inject({ method: 'GET', url: '/api/v1/categories' })
    assert.equal(res.statusCode, 200)
    const categories = res.json().data as { name: string; productCount: number }[]
    assert.equal(categories.length, 4)
    assert.deepEqual(
      categories.map((item) => item.name),
      ['咖啡', '茶饮', '轻食', '周边'],
    )
    assert.equal(categories[0]?.productCount, 6)
  } finally {
    await app.close()
  }
})

test('商品列表分页与筛选', async () => {
  const { app } = await createTestApp()
  try {
    const all = await app.inject({ method: 'GET', url: '/api/v1/products?page=1&page_size=10' })
    assert.equal(all.statusCode, 200)
    const body = all.json().data as { list: unknown[]; total: number; page: number; pageSize: number }
    assert.equal(body.list.length, 10)
    assert.equal(body.total, 24)

    const coffee = await app.inject({ method: 'GET', url: '/api/v1/products?category_id=1' })
    const coffeeBody = coffee.json().data as { list: { name: string }[]; total: number }
    assert.equal(coffeeBody.total, 6)

    const searched = await app.inject({ method: 'GET', url: '/api/v1/products?keyword=拿铁' })
    const searchedBody = searched.json().data as { list: { name: string }[] }
    assert.ok(searchedBody.list.length >= 1)
    assert.ok(searchedBody.list.every((item) => item.name.includes('拿铁')))
  } finally {
    await app.close()
  }
})

test('商品详情返回规格与价格（分）', async () => {
  const { app } = await createTestApp()
  try {
    const res = await app.inject({ method: 'GET', url: '/api/v1/products/1' })
    assert.equal(res.statusCode, 200)
    const product = res.json().data as { basePrice: number; specs: { key: string; options: { extra: number }[] }[] }
    assert.equal(product.basePrice, 3200)
    assert.equal(product.specs.length, 3)
    const cup = product.specs.find((group) => group.key === 'cup')
    assert.equal(cup?.options[1]?.extra, 300)
  } finally {
    await app.close()
  }
})

test('下架商品在用户端列表消失、详情报错', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const patch = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/products/1/status',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { onSale: false },
    })
    assert.equal(patch.statusCode, 200)
    assert.equal(patch.json().data.onSale, false)

    const list = await app.inject({ method: 'GET', url: '/api/v1/products' })
    const listBody = list.json().data as { list: { id: number }[]; total: number }
    assert.equal(listBody.total, 23)
    assert.ok(listBody.list.every((item) => item.id !== 1))

    const detail = await app.inject({ method: 'GET', url: '/api/v1/products/1' })
    assert.equal(detail.statusCode, 400)
    assert.equal(detail.json().code, 30002)

    // 后台仍能看到下架商品（分页结构）
    const adminList = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/products?page=1&page_size=50',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(adminList.json().data.total, 24)
    assert.equal(adminList.json().data.list.length, 24)
  } finally {
    await app.close()
  }
})

test('售罄商品在用户端标记 soldOut', async () => {
  const { app } = await createTestApp()
  const staffToken = await loginAdmin(app, 'staff')
  try {
    const patch = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/products/2/status',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { soldOut: true },
    })
    assert.equal(patch.statusCode, 200)
    assert.equal(patch.json().data.soldOut, true)

    const detail = await app.inject({ method: 'GET', url: '/api/v1/products/2' })
    assert.equal(detail.statusCode, 200)
    assert.equal(detail.json().data.soldOut, true)

    // 店员不能上下架
    const forbidden = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/products/3/status',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { onSale: false },
    })
    assert.equal(forbidden.statusCode, 403)
    assert.equal(forbidden.json().code, 10003)
  } finally {
    await app.close()
  }
})

test('管理员可以新增与修改商品', async () => {
  const { app } = await createTestApp()
  const adminToken = await loginAdmin(app, 'admin')
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/products',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        categoryId: 1,
        name: '测试限定拿铁',
        subtitle: '限定',
        description: '自动化测试商品',
        basePrice: 3600,
      },
    })
    assert.equal(created.statusCode, 201, created.body)
    const product = created.json().data as { id: number; basePrice: number }
    assert.equal(product.basePrice, 3600)

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/products/${product.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { basePrice: 3900, name: '测试限定拿铁pro' },
    })
    assert.equal(updated.statusCode, 200)
    assert.equal(updated.json().data.basePrice, 3900)
    assert.equal(updated.json().data.name, '测试限定拿铁pro')

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/products',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { categoryId: 1, name: '坏商品', basePrice: 12.5 },
    })
    assert.equal(invalid.statusCode, 400)
    assert.equal(invalid.json().code, 10000)
  } finally {
    await app.close()
  }
})

test('用户端接口不泄露会员手机号', async () => {
  const { app } = await createTestApp()
  try {
    const phonePattern = /1[3-9]\d{9}/
    for (const url of ['/api/v1/stores', '/api/v1/categories', '/api/v1/products', '/api/v1/products/1']) {
      const res = await app.inject({ method: 'GET', url })
      assert.equal(res.statusCode, 200, url)
      assert.ok(!phonePattern.test(res.body), `${url} 不应包含未脱敏手机号`)
    }
  } finally {
    await app.close()
  }
})

test('手机号脱敏函数', () => {
  assert.equal(maskPhone('13812345678'), '138****5678')
  assert.equal(maskPhone('19900001111'), '199****1111')
})
