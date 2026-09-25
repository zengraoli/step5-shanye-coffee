import type { FastifyInstance } from 'fastify'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
import { SPEC_GROUPS } from '../lib/specs.js'
import { adminGuard, adminOnly } from '../lib/guards.js'

interface ProductRow {
  id: number
  category_id: number
  name: string
  subtitle: string
  description: string
  base_price: number
  image: string
  on_sale: number
  sold_out: number
  sort: number
}

interface CategoryRow {
  id: number
  name: string
  sort: number
}

function serializeProduct(product: ProductRow, categoryName: string) {
  return {
    id: product.id,
    categoryId: product.category_id,
    categoryName,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    image: product.image,
    basePrice: product.base_price,
    onSale: product.on_sale === 1,
    soldOut: product.sold_out === 1,
    sort: product.sort,
    specs: SPEC_GROUPS,
  }
}

function toInt(value: unknown, fallback: number): number {
  const num = Number(value)
  return Number.isInteger(num) ? num : fallback
}

/** 商品公开接口 + 后台商品管理 */
export async function productRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  // ---------- 用户端 ----------

  app.get('/api/v1/categories', { schema: { tags: ['products'], summary: '分类列表' } }, async (_request, reply) => {
    const rows = db.prepare('SELECT * FROM categories ORDER BY sort, id').all() as unknown as CategoryRow[]
    const counts = db
      .prepare(
        `SELECT category_id, COUNT(*) AS n FROM products WHERE on_sale = 1 GROUP BY category_id`,
      )
      .all() as unknown as { category_id: number; n: number }[]
    const countMap = new Map(counts.map((row) => [row.category_id, row.n]))
    return sendOk(
      reply,
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        sort: row.sort,
        productCount: countMap.get(row.id) ?? 0,
      })),
    )
  })

  app.get<{ Querystring: { category_id?: string; keyword?: string; page?: string; page_size?: string } }>(
    '/api/v1/products',
    { schema: { tags: ['products'], summary: '商品列表（仅上架商品，可分页筛选）' } },
    async (request, reply) => {
      const { category_id: categoryId, keyword } = request.query
      const page = Math.max(1, toInt(request.query.page, 1))
      const pageSize = Math.min(50, Math.max(1, toInt(request.query.page_size, 20)))

      const conditions: string[] = ['p.on_sale = 1']
      const params: (string | number)[] = []
      if (categoryId !== undefined && categoryId !== '' && categoryId !== 'all') {
        const id = Number(categoryId)
        if (!Number.isInteger(id) || id <= 0) {
          fail('BAD_REQUEST', '分类 id 不合法')
        }
        conditions.push('p.category_id = ?')
        params.push(id)
      }
      if (keyword !== undefined && keyword.trim() !== '') {
        conditions.push('p.name LIKE ?')
        params.push(`%${keyword.trim()}%`)
      }
      const where = `WHERE ${conditions.join(' AND ')}`

      const totalRow = db.prepare(`SELECT COUNT(*) AS n FROM products p ${where}`).get(...params) as unknown as { n: number }
      const rows = db
        .prepare(
          `SELECT p.*, c.name AS category_name FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           ${where} ORDER BY p.sort, p.id LIMIT ? OFFSET ?`,
        )
        .all(...params, pageSize, (page - 1) * pageSize) as unknown as (ProductRow & { category_name: string | null })[]

      return sendOk(reply, {
        list: rows.map((row) => serializeProduct(row, row.category_name ?? '')),
        total: totalRow.n,
        page,
        pageSize,
      })
    },
  )

  app.get<{ Params: { id: string } }>('/api/v1/products/:id', { schema: { tags: ['products'], summary: '商品详情（含规格）' } }, async (request, reply) => {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      fail('BAD_REQUEST', '商品 id 不合法')
    }
    const product = db
      .prepare(
        `SELECT p.*, c.name AS category_name FROM products p
         LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
      )
      .get(id) as unknown as (ProductRow & { category_name: string | null }) | undefined
    if (!product) {
      fail('PRODUCT_NOT_FOUND')
    }
    if (product.on_sale !== 1) {
      fail('PRODUCT_OFF_SALE')
    }
    return sendOk(reply, serializeProduct(product, product.category_name ?? ''))
  })

  // ---------- 后台 ----------

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))

    instance.get('/api/v1/admin/products', { schema: { tags: ['admin', 'products'], summary: '后台商品列表（含下架商品，可分页筛选）', security: [{ adminBearer: [] }] } }, async (request, reply) => {
      const query = request.query as { category_id?: string; keyword?: string; on_sale?: string; sold_out?: string; page?: string; page_size?: string }
      const conditions: string[] = []
      const params: (string | number)[] = []
      if (query.category_id !== undefined && query.category_id !== '') {
        const id = Number(query.category_id)
        if (!Number.isInteger(id) || id <= 0) {
          fail('BAD_REQUEST', '分类 id 不合法')
        }
        conditions.push('p.category_id = ?')
        params.push(id)
      }
      if (query.keyword !== undefined && query.keyword.trim() !== '') {
        conditions.push('p.name LIKE ?')
        params.push(`%${query.keyword.trim()}%`)
      }
      if (query.on_sale === '0' || query.on_sale === '1') {
        conditions.push('p.on_sale = ?')
        params.push(Number(query.on_sale))
      }
      if (query.sold_out === '0' || query.sold_out === '1') {
        conditions.push('p.sold_out = ?')
        params.push(Number(query.sold_out))
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const page = Math.max(1, toInt(query.page, 1))
      const pageSize = Math.min(100, Math.max(1, toInt(query.page_size, 20)))
      const totalRow = db
        .prepare(`SELECT COUNT(*) AS n FROM products p ${where}`)
        .get(...params) as unknown as { n: number }
      const rows = db
        .prepare(
          `SELECT p.*, c.name AS category_name FROM products p
           LEFT JOIN categories c ON c.id = p.category_id ${where} ORDER BY p.sort, p.id LIMIT ? OFFSET ?`,
        )
        .all(...params, pageSize, (page - 1) * pageSize) as unknown as (ProductRow & { category_name: string | null })[]
      return sendOk(reply, {
        list: rows.map((row) => serializeProduct(row, row.category_name ?? '')),
        total: totalRow.n,
        page,
        pageSize,
      })
    })

    // 上架 / 下架：仅管理员
    instance.register(async (adminScope) => {
      adminScope.addHook('preHandler', adminOnly())
      adminScope.post<{ Body: Partial<ProductPayload> }>('/api/v1/admin/products', { schema: { tags: ['admin', 'products'], summary: '新增商品', security: [{ adminBearer: [] }] } }, async (request, reply) => {
        const payload = request.body ?? {}
        const categoryId = Number(payload.categoryId)
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
          fail('BAD_REQUEST', '请选择商品分类')
        }
        const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)
        if (!category) {
          fail('BAD_REQUEST', '商品分类不存在')
        }
        if (typeof payload.name !== 'string' || payload.name.trim().length === 0) {
          fail('BAD_REQUEST', '请填写商品名称')
        }
        if (payload.name.trim().length > 30) {
          fail('BAD_REQUEST', '商品名称不能超过 30 个字')
        }
        const basePrice = Number(payload.basePrice)
        if (!Number.isInteger(basePrice) || basePrice <= 0) {
          fail('BAD_REQUEST', '商品价格必须为大于 0 的整数分')
        }
        const info = db
          .prepare(
            `INSERT INTO products (category_id, name, subtitle, description, base_price, image, on_sale, sold_out, sort, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
          )
          .run(
            categoryId,
            payload.name.trim(),
            typeof payload.subtitle === 'string' ? payload.subtitle.trim() : '',
            typeof payload.description === 'string' ? payload.description.trim() : '',
            basePrice,
            typeof payload.image === 'string' ? payload.image.trim() : '',
            Number.isInteger(Number(payload.sort)) ? Number(payload.sort) : 0,
            new Date().toISOString(),
          )
        const created = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(info.lastInsertRowid)) as unknown as ProductRow
        return sendOk(reply, serializeProduct(created, ''), 201)
      })

      adminScope.put<{ Params: { id: string }; Body: Partial<ProductPayload> }>(
        '/api/v1/admin/products/:id',
        { schema: { tags: ['admin', 'products'], summary: '编辑商品', security: [{ adminBearer: [] }] } },
        async (request, reply) => {
          const id = Number(request.params.id)
          if (!Number.isInteger(id) || id <= 0) {
            fail('BAD_REQUEST', '商品 id 不合法')
          }
          const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as unknown as ProductRow | undefined
          if (!existing) {
            fail('PRODUCT_NOT_FOUND')
          }
          const payload = request.body ?? {}
          const updates: string[] = []
          const params: (string | number)[] = []
          if (payload.categoryId !== undefined) {
            const categoryId = Number(payload.categoryId)
            if (!Number.isInteger(categoryId) || categoryId <= 0) {
              fail('BAD_REQUEST', '请选择商品分类')
            }
            updates.push('category_id = ?')
            params.push(categoryId)
          }
          if (payload.name !== undefined) {
            if (typeof payload.name !== 'string' || payload.name.trim().length === 0) {
              fail('BAD_REQUEST', '请填写商品名称')
            }
            updates.push('name = ?')
            params.push(payload.name.trim())
          }
          if (payload.subtitle !== undefined) {
            updates.push('subtitle = ?')
            params.push(typeof payload.subtitle === 'string' ? payload.subtitle.trim() : '')
          }
          if (payload.description !== undefined) {
            updates.push('description = ?')
            params.push(typeof payload.description === 'string' ? payload.description.trim() : '')
          }
          if (payload.basePrice !== undefined) {
            const basePrice = Number(payload.basePrice)
            if (!Number.isInteger(basePrice) || basePrice <= 0) {
              fail('BAD_REQUEST', '商品价格必须为大于 0 的整数分')
            }
            updates.push('base_price = ?')
            params.push(basePrice)
          }
          if (payload.image !== undefined) {
            updates.push('image = ?')
            params.push(typeof payload.image === 'string' ? payload.image.trim() : '')
          }
          if (payload.sort !== undefined) {
            const sort = Number(payload.sort)
            if (!Number.isInteger(sort)) {
              fail('BAD_REQUEST', '排序必须为整数')
            }
            updates.push('sort = ?')
            params.push(sort)
          }
          if (updates.length === 0) {
            fail('BAD_REQUEST', '没有需要更新的字段')
          }
          params.push(id)
          db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params)
          const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as unknown as ProductRow
          return sendOk(reply, serializeProduct(updated, ''))
        },
      )
    })

    // 上下架 / 售罄：管理员可改全部，店员仅可改售罄
    instance.patch<{ Params: { id: string }; Body: { onSale?: unknown; soldOut?: unknown } }>(
      '/api/v1/admin/products/:id/status',
      { schema: { tags: ['admin', 'products'], summary: '上下架 / 售罄（店员仅可改售罄）', security: [{ adminBearer: [] }] } },
      async (request, reply) => {
        const id = Number(request.params.id)
        if (!Number.isInteger(id) || id <= 0) {
          fail('BAD_REQUEST', '商品 id 不合法')
        }
        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as unknown as ProductRow | undefined
        if (!existing) {
          fail('PRODUCT_NOT_FOUND')
        }
        const admin = request.admin!
        const { onSale, soldOut } = request.body ?? {}
        if (onSale !== undefined) {
          if (admin.role !== 'admin') {
            fail('FORBIDDEN', '只有管理员可以上下架商品')
          }
          if (typeof onSale !== 'boolean') {
            fail('BAD_REQUEST', 'onSale 必须为布尔值')
          }
        }
        if (soldOut !== undefined && typeof soldOut !== 'boolean') {
          fail('BAD_REQUEST', 'soldOut 必须为布尔值')
        }
        if (onSale === undefined && soldOut === undefined) {
          fail('BAD_REQUEST', '没有需要更新的字段')
        }
        if (onSale !== undefined) {
          db.prepare('UPDATE products SET on_sale = ? WHERE id = ?').run(onSale ? 1 : 0, id)
        }
        if (soldOut !== undefined) {
          db.prepare('UPDATE products SET sold_out = ? WHERE id = ?').run(soldOut ? 1 : 0, id)
        }
        const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as unknown as ProductRow
        return sendOk(reply, serializeProduct(updated, ''))
      },
    )
  })
}

interface ProductPayload {
  categoryId?: number
  name?: string
  subtitle?: string
  description?: string
  basePrice?: number
  image?: string
  sort?: number
}
