import type { FastifyInstance } from 'fastify'
import { authRoutes } from '../modules/auth.js'
import { couponRoutes } from '../modules/coupons.js'
import { orderRoutes } from '../modules/orders.js'
import { productRoutes } from '../modules/products.js'
import { storeRoutes } from '../modules/stores.js'

/** 注册全部业务路由（随任务增量扩展） */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes)
  await app.register(storeRoutes)
  await app.register(productRoutes)
  await app.register(couponRoutes)
  await app.register(orderRoutes)
}
