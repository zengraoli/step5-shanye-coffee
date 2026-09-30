import type { Db } from '../db/index.js'
import { fail } from '../lib/errors.js'

/** 门店级售罄：product_store_status 中出现该行即代表该门店已售罄 */

/** 某商品在某门店是否售罄（全局售罄 或 该门店被单独标为售罄） */
export function isSoldOutAtStore(db: Db, productId: number, storeId: number): boolean {
  const product = db
    .prepare('SELECT sold_out FROM products WHERE id = ?')
    .get(productId) as unknown as { sold_out: number } | undefined
  if (product?.sold_out === 1) {
    return true
  }
  const row = db
    .prepare('SELECT sold_out FROM product_store_status WHERE product_id = ? AND store_id = ?')
    .get(productId, storeId) as unknown as { sold_out: number } | undefined
  return row?.sold_out === 1
}

/** 某商品被标记售罄的门店 id 列表 */
export function soldOutStoreIds(db: Db, productId: number): number[] {
  const rows = db
    .prepare('SELECT store_id FROM product_store_status WHERE product_id = ? AND sold_out = 1 ORDER BY store_id')
    .all(productId) as unknown as { store_id: number }[]
  return rows.map((row) => row.store_id)
}

/** 设置某门店下某商品的售罄状态 */
export function setStoreSoldOut(db: Db, productId: number, storeId: number, soldOut: boolean): void {
  if (soldOut) {
    db.prepare(
      `INSERT INTO product_store_status (product_id, store_id, sold_out, updated_at) VALUES (?, ?, 1, ?)
       ON CONFLICT(product_id, store_id) DO UPDATE SET sold_out = 1, updated_at = excluded.updated_at`,
    ).run(productId, storeId, new Date().toISOString())
  } else {
    db.prepare('DELETE FROM product_store_status WHERE product_id = ? AND store_id = ?').run(productId, storeId)
  }
}

/** 校验门店存在，返回门店 id */
export function ensureStoreExists(db: Db, storeId: number | null | undefined, message = '门店不存在'): number {
  if (storeId === null || storeId === undefined) {
    fail('BAD_REQUEST', '请选择门店')
  }
  const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(storeId)
  if (!store) {
    fail('STORE_NOT_FOUND', message)
  }
  return Number(storeId)
}
