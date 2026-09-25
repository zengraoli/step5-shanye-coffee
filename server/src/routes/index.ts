import type { FastifyInstance } from 'fastify'
import { authRoutes } from '../modules/auth.js'

/** 注册全部业务路由（随任务增量扩展） */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes)
}
