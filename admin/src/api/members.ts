/** 后台会员管理接口 */
import { apiFetch } from './client'

export interface AdminMember {
  id: number
  phone: string
  maskedPhone: string
  nickname: string
  points: number
  level: 'silver' | 'gold' | 'black'
  levelText: string
  nextLevel: string | null
  nextLevelText: string | null
  pointsToNextLevel: number
  createdAt: string
  orderCount: number
  totalPayFen: number
  lastOrderAt: string | null
}

export interface AdminMemberList {
  list: AdminMember[]
  total: number
  page: number
  pageSize: number
}

export interface AdminMemberOrder {
  id: number
  orderNo: string
  storeId: number
  orderType: string
  status: string
  totalFen: number
  discountFen: number
  payFen: number
  pickupCode: string | null
  createdAt: string
}

export interface AdminMemberCoupon {
  id: number
  name: string
  type: string
  status: string
  validFrom: string
  validTo: string
}

export interface AdminMemberPointsLog {
  id: number
  change: number
  reason: string
  orderId: number | null
  createdAt: string
}

export interface AdminMemberDetail extends AdminMember {
  orders: AdminMemberOrder[]
  pointsLogs: AdminMemberPointsLog[]
  coupons: AdminMemberCoupon[]
}

export interface MemberQuery {
  keyword?: string
  level?: string
  page?: number
  pageSize?: number
}

function toQueryString(query: MemberQuery): string {
  const params = new URLSearchParams()
  if (query.keyword) {
    params.set('keyword', query.keyword)
  }
  if (query.level) {
    params.set('level', query.level)
  }
  params.set('page', String(query.page ?? 1))
  params.set('page_size', String(query.pageSize ?? 10))
  return params.toString()
}

/** 会员列表（手机号脱敏） */
export function fetchAdminMembers(query: MemberQuery = {}): Promise<AdminMemberList> {
  return apiFetch<AdminMemberList>(`/api/v1/admin/members?${toQueryString(query)}`)
}

/** 会员详情 */
export function fetchAdminMember(id: number): Promise<AdminMemberDetail> {
  return apiFetch<AdminMemberDetail>(`/api/v1/admin/members/${id}`)
}
