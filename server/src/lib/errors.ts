/**
 * 业务错误码登记表。
 * code 会通过 API 透出给前端，message 为中文原因。
 * http 为该错误对应的 HTTP 状态码。
 */
export const ERROR_CODES = {
  /** 请求参数缺失或格式不正确 */
  BAD_REQUEST: { code: 10000, http: 400, message: '请求参数错误' },
  /** 手机号格式不正确 */
  INVALID_PHONE: { code: 10001, http: 400, message: '手机号格式不正确' },
  /** 未登录或 token 失效 */
  UNAUTHORIZED: { code: 10002, http: 401, message: '未登录或登录已过期' },
  /** 已登录但角色不符 */
  FORBIDDEN: { code: 10003, http: 403, message: '没有权限执行该操作' },
  /** 资源不存在 */
  NOT_FOUND: { code: 10004, http: 404, message: '资源不存在' },
  /** 短信验证码错误 */
  CODE_INVALID: { code: 10005, http: 400, message: '验证码错误或已过期' },
  /** 后台账号或密码错误 */
  LOGIN_FAILED: { code: 10006, http: 401, message: '账号或密码错误' },
  /** 门店不存在 */
  STORE_NOT_FOUND: { code: 20001, http: 404, message: '门店不存在' },
  /** 门店休息中 */
  STORE_CLOSED: { code: 20002, http: 400, message: '门店休息中，暂无法下单' },
  /** 商品不存在 */
  PRODUCT_NOT_FOUND: { code: 30001, http: 404, message: '商品不存在' },
  /** 商品已下架 */
  PRODUCT_OFF_SALE: { code: 30002, http: 400, message: '商品已下架' },
  /** 商品已售罄 */
  PRODUCT_SOLD_OUT: { code: 30003, http: 400, message: '商品已售罄' },
  /** 优惠券不存在 */
  COUPON_NOT_FOUND: { code: 40001, http: 404, message: '优惠券不存在' },
  /** 优惠券已领取 */
  COUPON_ALREADY_CLAIMED: { code: 40002, http: 400, message: '优惠券已领取过，快去使用吧' },
  /** 优惠券已使用 */
  COUPON_USED: { code: 40003, http: 400, message: '优惠券已使用' },
  /** 优惠券已过期 */
  COUPON_EXPIRED: { code: 40004, http: 400, message: '优惠券已过期' },
  /** 不满足优惠券使用条件 */
  COUPON_NOT_APPLICABLE: { code: 40005, http: 400, message: '订单金额未满足优惠券使用条件' },
  /** 订单不存在 */
  ORDER_NOT_FOUND: { code: 50001, http: 404, message: '订单不存在' },
  /** 非法状态流转 */
  ORDER_STATUS_INVALID: { code: 50002, http: 400, message: '当前订单状态不允许该操作' },
  /** 越权操作订单 */
  ORDER_FORBIDDEN: { code: 50003, http: 403, message: '无权操作该订单' },
  /** 订单中没有有效商品 */
  ORDER_EMPTY: { code: 50004, http: 400, message: '订单中没有有效商品' },
  /** 服务器内部错误 */
  INTERNAL: { code: 10999, http: 500, message: '服务器开小差了，请稍后再试' },
} as const

export type ErrorCodeKey = keyof typeof ERROR_CODES

/** 业务错误：抛出后由全局错误处理器转换为统一响应 */
export class AppError extends Error {
  readonly code: number
  readonly httpStatus: number

  constructor(key: ErrorCodeKey, message?: string) {
    const meta = ERROR_CODES[key]
    super(message ?? meta.message)
    this.name = 'AppError'
    this.code = meta.code
    this.httpStatus = meta.http
  }
}

/** 快捷抛出方法 */
export function fail(key: ErrorCodeKey, message?: string): never {
  throw new AppError(key, message)
}
