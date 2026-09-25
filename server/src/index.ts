import { buildApp } from './app.js'
import { defaultDbPath, openDb } from './db/index.js'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

const { db, seededCredentials } = openDb({ path: defaultDbPath() })

const app = await buildApp({ logger: true, db })

if (seededCredentials.length > 0) {
  app.log.info('已初始化种子数据，后台账号初始密码如下（仅本次显示，请尽快登录后修改）：')
  for (const credential of seededCredentials) {
    app.log.info(`  ${credential.username}（${credential.role}）：${credential.password}`)
  }
}

const shutdown = async (signal: string): Promise<void> => {
  app.log.info(`收到 ${signal}，正在关闭服务`)
  await app.close()
  db.close()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
