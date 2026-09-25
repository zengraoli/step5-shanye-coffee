/** 数据看板接口 */
import { apiFetch } from './client'

export interface DashboardToday {
  date: string
  revenueFen: number
  orderCount: number
  avgOrderFen: number
  newMembers: number
}

export interface DashboardTrendPoint {
  date: string
  revenueFen: number
  orderCount: number
}

export interface DashboardTopProduct {
  productId: number
  productName: string
  quantity: number
  amountFen: number
}

export interface DashboardLatestOrder {
  id: number
  orderNo: string
  storeId: number
  storeName: string
  memberPhone: string
  memberNickname: string
  status: string
  statusText: string
  totalFen: number
  discountFen: number
  payFen: number
  pickupCode: string | null
  createdAt: string
}

export interface DashboardData {
  scope: 'all' | 'store'
  storeId: number | null
  today: DashboardToday
  trend: DashboardTrendPoint[]
  topProducts: DashboardTopProduct[]
  latestOrders: DashboardLatestOrder[]
}

/** 获取看板数据 */
export function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/v1/admin/dashboard')
}
