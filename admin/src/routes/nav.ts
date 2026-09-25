/** 后台导航配置：按角色控制菜单可见性 */
import {
  BadgePercent,
  LayoutDashboard,
  Percent,
  Package,
  ReceiptText,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AdminRole = 'admin' | 'staff'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** 允许看到该菜单的角色 */
  roles: AdminRole[]
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: '数据看板',
    icon: LayoutDashboard,
    roles: ['admin', 'staff'],
    description: '营业额、订单量与经营趋势',
  },
  {
    to: '/orders',
    label: '订单管理',
    icon: ReceiptText,
    roles: ['admin', 'staff'],
    description: '处理订单与推进取餐状态',
  },
  {
    to: '/products',
    label: '商品管理',
    icon: Package,
    roles: ['admin', 'staff'],
    description: '商品、规格、上下架与售罄',
  },
  {
    to: '/stores',
    label: '门店管理',
    icon: Store,
    roles: ['admin'],
    description: '门店信息与营业时间',
  },
  {
    to: '/members',
    label: '会员管理',
    icon: Users,
    roles: ['admin'],
    description: '会员列表、积分与等级',
  },
  {
    to: '/coupons',
    label: '优惠券管理',
    icon: BadgePercent,
    roles: ['admin'],
    description: '满减券与折扣券模板',
  },
  {
    to: '/accounts',
    label: '账号与角色',
    icon: ShieldCheck,
    roles: ['admin'],
    description: '后台账号、停用与角色分配',
  },
  {
    to: '/promo',
    label: '活动管理',
    icon: Percent,
    roles: ['admin'],
    description: '第二杯半价活动的时间与适用商品',
  },
]

/** 按角色过滤导航 */
export function navItemsForRole(role: AdminRole | undefined): NavItem[] {
  if (!role) {
    return []
  }
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

/** 判断角色是否可以访问某路径（未配置的路径默认放行） */
export function canAccessPath(role: AdminRole | undefined, path: string): boolean {
  if (!role) {
    return false
  }
  const item = NAV_ITEMS.find((nav) => path === nav.to || path.startsWith(`${nav.to}/`))
  return item ? item.roles.includes(role) : true
}
