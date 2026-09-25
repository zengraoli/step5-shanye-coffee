import type { FastifyInstance } from 'fastify'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
import { adminGuard, adminOnly } from '../lib/guards.js'
import { isWithinBusinessHours } from '../lib/time.js'

interface StoreRow {
  id: number
  name: string
  address: string
  phone: string
  open_time: string
  close_time: string
}

function serializeStore(store: StoreRow) {
  const open = isWithinBusinessHours(store.open_time, store.close_time)
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    phone: store.phone,
    openTime: store.open_time,
    closeTime: store.close_time,
    status: open ? 'open' : 'rest',
    statusText: open ? '营业中' : '休息中',
  }
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

/** 后台门店管理：列表与信息编辑 */
export async function adminStoreRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  app.register(async (instance) => {
    instance.addHook('preHandler', adminGuard(db))
    instance.addHook('preHandler', adminOnly())

    instance.get('/api/v1/admin/stores', { schema: { tags: ['admin', 'stores'], summary: '后台门店列表', security: [{ adminBearer: [] }] } }, async (_request, reply) => {
      const stores = db.prepare('SELECT * FROM stores ORDER BY id').all() as unknown as StoreRow[]
      return sendOk(reply, stores.map(serializeStore))
    })

    interface StorePayload {
      name?: unknown
      address?: unknown
      phone?: unknown
      openTime?: unknown
      closeTime?: unknown
    }
    instance.put<{ Params: { id: string }; Body: StorePayload }>('/api/v1/admin/stores/:id', { schema: { tags: ['admin', 'stores'], summary: '编辑门店信息与营业时间', security: [{ adminBearer: [] }] } }, async (request, reply) => {
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        fail('BAD_REQUEST', '门店 id 不合法')
      }
      const existing = db.prepare('SELECT * FROM stores WHERE id = ?').get(id) as unknown as StoreRow | undefined
      if (!existing) {
        fail('STORE_NOT_FOUND')
      }
      const payload = request.body ?? {}
      const updates: string[] = []
      const params: (string | number)[] = []

      if (payload.name !== undefined) {
        const name = typeof payload.name === 'string' ? payload.name.trim() : ''
        if (name.length === 0 || name.length > 30) {
          fail('BAD_REQUEST', '门店名称必填且不超过 30 个字')
        }
        updates.push('name = ?')
        params.push(name)
      }
      if (payload.address !== undefined) {
        const address = typeof payload.address === 'string' ? payload.address.trim() : ''
        if (address.length === 0 || address.length > 80) {
          fail('BAD_REQUEST', '门店地址必填且不超过 80 个字')
        }
        updates.push('address = ?')
        params.push(address)
      }
      if (payload.phone !== undefined) {
        const phone = typeof payload.phone === 'string' ? payload.phone.trim() : ''
        if (phone.length === 0 || phone.length > 20) {
          fail('BAD_REQUEST', '门店电话必填且不超过 20 个字符')
        }
        updates.push('phone = ?')
        params.push(phone)
      }
      if (payload.openTime !== undefined) {
        const openTime = typeof payload.openTime === 'string' ? payload.openTime.trim() : ''
        if (!TIME_RE.test(openTime)) {
          fail('BAD_REQUEST', '开始时间格式应为 HH:mm')
        }
        updates.push('open_time = ?')
        params.push(openTime)
      }
      if (payload.closeTime !== undefined) {
        const closeTime = typeof payload.closeTime === 'string' ? payload.closeTime.trim() : ''
        if (!TIME_RE.test(closeTime)) {
          fail('BAD_REQUEST', '打烊时间格式应为 HH:mm')
        }
        updates.push('close_time = ?')
        params.push(closeTime)
      }
      if (updates.length === 0) {
        fail('BAD_REQUEST', '没有需要更新的字段')
      }
      params.push(id)
      db.prepare(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`).run(...params)
      const updated = db.prepare('SELECT * FROM stores WHERE id = ?').get(id) as unknown as StoreRow
      return sendOk(reply, serializeStore(updated))
    })
  })
}
