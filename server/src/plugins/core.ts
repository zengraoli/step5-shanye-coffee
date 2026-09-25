import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AppError, ERROR_CODES } from '../lib/errors.js'
import { RAW_REPLY } from '../lib/response.js'

/**
 * 响应包装插件：所有 2xx 响应统一包装为 { code: 0, data, message: 'ok' }。
 * 已被标记 RAW_REPLY 的响应（错误响应）原样透出。
 */
export async function responsePlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onSend', async (request: FastifyRequest, reply, payload) => {
    if ((reply as unknown as Record<symbol, unknown>)[RAW_REPLY]) {
      return payload
    }
    if (payload === null || payload === undefined || payload === '') {
      return payload
    }
    let data: unknown = payload
    if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
      const text = payload.toString()
      if (text === '') {
        return payload
      }
      try {
        data = JSON.parse(text) as unknown
      } catch {
        // 非 JSON 内容（如 HTML 文档页）不包装
        return payload
      }
    }
    const body = JSON.stringify({ code: 0, data, message: 'ok' })
    reply.header('content-type', 'application/json; charset=utf-8')
    return body
  })
}

/** 全局错误处理：统一错误响应格式，中文 message */
export async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ code: error.code, url: request.url }, error.message)
      ;(reply as unknown as Record<symbol, unknown>)[RAW_REPLY] = true
      return reply.code(error.httpStatus).send({
        code: error.code,
        data: null,
        message: error.message,
      })
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500
    if (status < 500) {
      // Fastify 校验错误等客户端错误
      request.log.warn({ err: error, url: request.url }, 'request rejected')
      ;(reply as unknown as Record<symbol, unknown>)[RAW_REPLY] = true
      return reply.code(status).send({
        code: ERROR_CODES.BAD_REQUEST.code,
        data: null,
        message: ERROR_CODES.BAD_REQUEST.message,
      })
    }
    request.log.error({ err: error, url: request.url }, 'internal error')
    ;(reply as unknown as Record<symbol, unknown>)[RAW_REPLY] = true
    return reply.code(ERROR_CODES.INTERNAL.http).send({
      code: ERROR_CODES.INTERNAL.code,
      data: null,
      message: ERROR_CODES.INTERNAL.message,
    })
  })

  app.setNotFoundHandler((request, reply) => {
    ;(reply as unknown as Record<symbol, unknown>)[RAW_REPLY] = true
    return reply.code(404).send({
      code: ERROR_CODES.NOT_FOUND.code,
      data: null,
      message: '接口不存在',
    })
  })
}
