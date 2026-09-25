import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

/** OpenAPI 文档：/docs 为文档页，/docs/json 为规范文件 */
export async function openapiPlugin(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: '山野咖啡 · 点单平台 API',
        description:
          '门店点单平台接口文档。统一响应格式 { code, data, message }；金额单位为整数“分”；时间为 UTC ISO8601；错误码见 server/docs/errors.md。',
        version: '1.0.0',
      },
      servers: [{ url: 'http://127.0.0.1:3000', description: '本地开发' }],
      tags: [
        { name: 'health', description: '健康检查' },
        { name: 'auth', description: '登录鉴权' },
        { name: 'stores', description: '门店' },
        { name: 'products', description: '商品与分类' },
        { name: 'coupons', description: '优惠券' },
        { name: 'orders', description: '订单' },
        { name: 'members', description: '会员与积分' },
        { name: 'admin', description: '后台管理' },
      ],
      components: {
        securitySchemes: {
          memberBearer: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'token',
            description: '会员登录 token（POST /api/v1/auth/login 获取）',
          },
          adminBearer: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'token',
            description: '后台账号 token（POST /api/v1/admin/auth/login 获取）',
          },
        },
        schemas: {
          ApiOk: {
            type: 'object',
            properties: {
              code: { type: 'integer', example: 0 },
              data: {},
              message: { type: 'string', example: 'ok' },
            },
          },
          ApiErr: {
            type: 'object',
            properties: {
              code: { type: 'integer', example: 10002 },
              data: { type: 'null' },
              message: { type: 'string', example: '未登录或登录已过期' },
            },
          },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  })
}
