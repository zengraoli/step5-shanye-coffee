/** 订单状态机（纯逻辑） */

export const ORDER_STATUSES = [
  'pending_pay',
  'paid',
  'making',
  'pickable',
  'completed',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  pending_pay: '待支付',
  paid: '已支付',
  making: '制作中',
  pickable: '待取餐',
  completed: '已完成',
  cancelled: '已取消',
}

export const ORDER_TYPE_TEXT: Record<'takeout' | 'dine_in', string> = {
  takeout: '自提',
  dine_in: '堂食',
}

/** 允许的状态流转。支付前（待支付）可取消，支付后不可取消。 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_pay: ['paid', 'cancelled'],
  paid: ['making'],
  making: ['pickable'],
  pickable: ['completed'],
  completed: [],
  cancelled: [],
}

/** 店员推进订单时的固定链路：已支付 → 制作中 → 待取餐 → 已完成 */
export const ADVANCE_CHAIN: OrderStatus[] = ['paid', 'making', 'pickable', 'completed']

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** 推进到下一状态；终态返回 null */
export function nextStatus(from: OrderStatus): OrderStatus | null {
  const index = ADVANCE_CHAIN.indexOf(from)
  if (index === -1 || index === ADVANCE_CHAIN.length - 1) {
    return null
  }
  return ADVANCE_CHAIN[index + 1] ?? null
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value)
}
