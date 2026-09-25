import type { FastifyReply } from 'fastify'

/** 统一成功响应体 */
export interface ApiOk<T> {
  code: 0
  data: T
  message: 'ok'
}

/** 统一错误响应体 */
export interface ApiErr {
  code: number
  data: null
  message: string
}

/** 标记“响应体已包装，onSend 钩子不要再包一层” */
export const RAW_REPLY = Symbol.for('shanye.rawReply')

/** 统一成功响应 */
export function sendOk<T>(reply: FastifyReply, data: T, statusCode = 200): FastifyReply {
  ;(reply as unknown as Record<symbol, unknown>)[RAW_REPLY] = true
  const body: ApiOk<T> = { code: 0, data, message: 'ok' }
  return reply.code(statusCode).send(body)
}

/** 统一错误响应（供错误处理器与需要直接返回错误的场景使用） */
export function sendErr(
  reply: FastifyReply,
  code: number,
  message: string,
  statusCode: number,
): FastifyReply {
  ;(reply as unknown as Record<symbol, unknown>)[RAW_REPLY] = true
  const body: ApiErr = { code, data: null, message }
  return reply.code(statusCode).send(body)
}
