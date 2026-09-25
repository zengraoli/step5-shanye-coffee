import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { errorHandlerPlugin, responsePlugin } from './plugins/core.js'
import type { Db } from './db/index.js'

export interface BuildAppOptions {
  /** 是否开启请求日志，默认关闭（测试与冒烟脚本使用） */
  logger?: boolean
  /** 数据库实例，测试可传入内存库 */
  db?: Db
}

/** 构建 Fastify 实例（测试与冒烟脚本复用） */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  })

  if (options.db) {
    app.decorate('db', options.db)
  }

  await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })

  // 直接在根实例上挂载，保证所有路由（含后续模块）都经过统一包装与错误处理
  await responsePlugin(app)
  await errorHandlerPlugin(app)

  app.get('/health', async () => ({
    status: 'ok',
    service: 'shanye-coffee-server',
    time: new Date().toISOString(),
  }))

  return app
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
  }
}
