import type { FastifyInstance } from 'fastify'
import { fail } from '../lib/errors.js'
import { sendOk } from '../lib/response.js'
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

/** 门店公开接口 */
export async function storeRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db

  app.get('/api/v1/stores', { schema: { tags: ['stores'], summary: '门店列表（含营业状态）' } }, async (_request, reply) => {
    const stores = db.prepare('SELECT * FROM stores ORDER BY id').all() as unknown as StoreRow[]
    return sendOk(reply, stores.map(serializeStore))
  })

  app.get<{ Params: { id: string } }>('/api/v1/stores/:id', { schema: { tags: ['stores'], summary: '门店详情（含营业状态）' } }, async (request, reply) => {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      fail('BAD_REQUEST', '门店 id 不合法')
    }
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(id) as unknown as StoreRow | undefined
    if (!store) {
      fail('STORE_NOT_FOUND')
    }
    return sendOk(reply, serializeStore(store))
  })
}
