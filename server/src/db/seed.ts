import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'

/** 后台账号默认用户名（密码通过环境变量指定，未指定时首次启动随机生成并打印） */
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
export const STAFF_USERNAME = process.env.STAFF_USERNAME ?? 'staff'

export interface SeededCredential {
  username: string
  role: string
  password: string
  generated: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex')
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  if (actual.length !== expected.length) {
    return false
  }
  return timingSafeEqual(actual, expected)
}

function randomPassword(): string {
  return randomBytes(12).toString('base64url')
}

interface StoreSeed {
  name: string
  address: string
  phone: string
  open_time: string
  close_time: string
}

const STORES: StoreSeed[] = [
  {
    name: '山野咖啡 · 望京店',
    address: '北京市朝阳区望京南湖东园一区 212 号',
    phone: '010-64781234',
    open_time: '08:00',
    close_time: '22:00',
  },
  {
    name: '山野咖啡 · 三里屯店',
    address: '北京市朝阳区工人体育场北路 8 号院 3 号楼',
    phone: '010-64168899',
    open_time: '09:00',
    close_time: '22:30',
  },
  {
    name: '山野咖啡 · 五道口店',
    address: '北京市海淀区成府路 28 号购物中心 1 层',
    phone: '010-62341200',
    open_time: '08:30',
    close_time: '21:30',
  },
]

interface CategorySeed {
  name: string
  sort: number
}

const CATEGORIES: CategorySeed[] = [
  { name: '咖啡', sort: 1 },
  { name: '茶饮', sort: 2 },
  { name: '轻食', sort: 3 },
  { name: '周边', sort: 4 },
]

interface ProductSeed {
  category: string
  name: string
  subtitle: string
  description: string
  base_price: number
  sort: number
}

const PRODUCTS: ProductSeed[] = [
  // 咖啡
  { category: '咖啡', name: '山野拿铁', subtitle: '招牌', description: '云南SOE浓缩与冷藏鲜奶的柔和平衡，坚果与可可尾韵。', base_price: 3200, sort: 1 },
  { category: '咖啡', name: '琥珀美式', subtitle: '清爽', description: '双重萃取冰美式，柑橘酸质明亮，回甘干净。', base_price: 2800, sort: 2 },
  { category: '咖啡', name: '云南SOE手冲', subtitle: '单一产区', description: '普洱产区日晒豆，热带水果与红酒香气，V60 手工冲煮。', base_price: 3800, sort: 3 },
  { category: '咖啡', name: '生椰丝绒拿铁', subtitle: '人气', description: '现开椰青水与浓缩咖啡，丝绒奶泡覆盖，清甜不腻。', base_price: 3600, sort: 4 },
  { category: '咖啡', name: '海盐焦糖玛奇朵', subtitle: '香甜', description: '焦糖酱挂壁，海盐奶盖中和甜度，层次分明。', base_price: 3500, sort: 5 },
  { category: '咖啡', name: '燕麦Dirty', subtitle: '冷热交替', description: '燕麦奶打底，热浓缩缓缓渗入，大口喝下第一口最佳。', base_price: 3300, sort: 6 },
  // 茶饮
  { category: '茶饮', name: '山野乌龙奶盖', subtitle: '茶香', description: '冷萃高山乌龙配咸香奶盖，茶味清冽。', base_price: 3000, sort: 1 },
  { category: '茶饮', name: '白桃乌龙气泡', subtitle: '气泡', description: '白桃果肉与乌龙茶汤，充入微气泡，夏日限定。', base_price: 2800, sort: 2 },
  { category: '茶饮', name: '柠檬鸭屎香', subtitle: '果茶', description: '凤凰单丛鸭屎香手打柠檬，花香高扬。', base_price: 2600, sort: 3 },
  { category: '茶饮', name: '玫瑰荔枝红茶', subtitle: '花香', description: '大吉岭红茶浸泡重瓣玫瑰，荔枝原汁提鲜。', base_price: 3200, sort: 4 },
  { category: '茶饮', name: '抹茶牛乳', subtitle: '无咖啡因', description: '宇治抹茶现打，冷藏牛乳调和，微苦回甘。', base_price: 3000, sort: 5 },
  { category: '茶饮', name: '百香果绿茶', subtitle: '酸甜', description: '黄金百香果与炒青绿茶，维生素感满满。', base_price: 2400, sort: 6 },
  // 轻食
  { category: '轻食', name: '海盐芝士可颂', subtitle: '现烤', description: '48 小时冷发酵黄油可颂，夹海盐芝士流心。', base_price: 1800, sort: 1 },
  { category: '轻食', name: '全麦烟熏鸡胸三明治', subtitle: '轻卡', description: '全麦欧包夹烟熏鸡胸、水煮蛋与生菜，低脂酱汁。', base_price: 2600, sort: 2 },
  { category: '轻食', name: '巴斯克芝士蛋糕', subtitle: '现切', description: '高温焦化表面，内芯绵密顺滑，冷藏后食用。', base_price: 2400, sort: 3 },
  { category: '轻食', name: '提拉米苏杯', subtitle: '经典', description: '马斯卡彭与浓缩咖啡手指饼干，朗姆酒香气。', base_price: 2200, sort: 4 },
  { category: '轻食', name: '蓝莓麦芬', subtitle: '烘焙', description: '野生蓝莓爆浆，表面撒酥粒，配咖啡绝佳。', base_price: 1600, sort: 5 },
  { category: '轻食', name: '牛肉恰巴塔', subtitle: '咸口', description: '意式恰巴塔夹黑椒牛肉、芝士与芝麻菜。', base_price: 2800, sort: 6 },
  // 周边
  { category: '周边', name: '山野随行杯 500ml', subtitle: '周边', description: '双层不锈钢随行杯，山野绿哑光漆面。', base_price: 8900, sort: 1 },
  { category: '周边', name: '手冲滤纸 50 张', subtitle: '耗材', description: 'V60-02 原色滤纸，50 张一包。', base_price: 2500, sort: 2 },
  { category: '周边', name: '山野咖啡豆 · 云南SOE 250g', subtitle: '熟豆', description: '普洱产区中浅烘焙，茉莉花与蜂蜜风味。', base_price: 9800, sort: 3 },
  { category: '周边', name: '帆布咖啡袋', subtitle: '周边', description: '16A 加厚帆布，可装两包咖啡豆，附内袋。', base_price: 4500, sort: 4 },
  { category: '周边', name: '玻璃分享壶 600ml', subtitle: '周边', description: '耐热硼硅玻璃，附不锈钢滤网，适合两人分享。', base_price: 6800, sort: 5 },
  { category: '周边', name: '会员徽章礼盒', subtitle: '礼盒', description: '山野三款金属徽章与烫金卡片，会员伴手礼。', base_price: 5600, sort: 6 },
]

interface CouponSeed {
  name: string
  type: 'full_reduction' | 'discount'
  threshold_fen: number
  reduce_fen: number
  discount_percent: number
  max_reduce_fen: number
  valid_days: number
  total: number
}

const COUPONS: CouponSeed[] = [
  {
    name: '新客满 50 减 10',
    type: 'full_reduction',
    threshold_fen: 5000,
    reduce_fen: 1000,
    discount_percent: 100,
    max_reduce_fen: 0,
    valid_days: 30,
    total: 1000,
  },
  {
    name: '全场 8.5 折（最高减 20）',
    type: 'discount',
    threshold_fen: 3000,
    reduce_fen: 0,
    discount_percent: 85,
    max_reduce_fen: 2000,
    valid_days: 15,
    total: 1000,
  },
]

/**
 * 写入种子数据。已初始化过的数据库不会重复写入。
 * 返回首次创建的后台账号凭据（含随机生成的密码）。
 */
export function seed(db: DatabaseSync): SeededCredential[] {
  const storeCount = db.prepare('SELECT COUNT(*) AS n FROM stores').get() as { n: number }
  if (storeCount.n > 0) {
    return []
  }

  const credentials: SeededCredential[] = []
  const createdAt = nowIso()

  const insertStore = db.prepare(
    'INSERT INTO stores (name, address, phone, open_time, close_time, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const insertCategory = db.prepare('INSERT INTO categories (name, sort) VALUES (?, ?)')
  const insertProduct = db.prepare(
    `INSERT INTO products (category_id, name, subtitle, description, base_price, image, on_sale, sold_out, sort, created_at)
     VALUES (?, ?, ?, ?, ?, '', 1, 0, ?, ?)`,
  )
  const insertCoupon = db.prepare(
    `INSERT INTO coupons (name, type, threshold_fen, reduce_fen, discount_percent, max_reduce_fen, valid_days, total, remaining, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
  )
  const insertAdmin = db.prepare(
    `INSERT INTO admin_users (username, password_hash, salt, role, store_id, nickname, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
  )

  const categoryIds = new Map<string, number>()
  for (const category of CATEGORIES) {
    const info = insertCategory.run(category.name, category.sort)
    categoryIds.set(category.name, Number(info.lastInsertRowid))
  }

  for (const store of STORES) {
    insertStore.run(store.name, store.address, store.phone, store.open_time, store.close_time, createdAt)
  }

  for (const product of PRODUCTS) {
    const categoryId = categoryIds.get(product.category)
    if (categoryId === undefined) {
      throw new Error(`未知分类：${product.category}`)
    }
    insertProduct.run(categoryId, product.name, product.subtitle, product.description, product.base_price, product.sort, createdAt)
  }

  for (const coupon of COUPONS) {
    insertCoupon.run(
      coupon.name,
      coupon.type,
      coupon.threshold_fen,
      coupon.reduce_fen,
      coupon.discount_percent,
      coupon.max_reduce_fen,
      coupon.valid_days,
      coupon.total,
      coupon.total,
      createdAt,
    )
  }

  // 后台账号：密码来自环境变量，未提供时随机生成（仅首次创建时返回，由启动日志打印）
  const adminPassword = process.env.ADMIN_PASSWORD ?? randomPassword()
  const staffPassword = process.env.STAFF_PASSWORD ?? randomPassword()
  credentials.push({
    username: ADMIN_USERNAME,
    role: 'admin',
    password: adminPassword,
    generated: !process.env.ADMIN_PASSWORD,
  })
  credentials.push({
    username: STAFF_USERNAME,
    role: 'staff',
    password: staffPassword,
    generated: !process.env.STAFF_PASSWORD,
  })

  const adminSalt = randomBytes(16).toString('hex')
  insertAdmin.run(
    ADMIN_USERNAME,
    hashPassword(adminPassword, adminSalt),
    adminSalt,
    'admin',
    null,
    '系统管理员',
    createdAt,
  )

  const staffSalt = randomBytes(16).toString('hex')
  insertAdmin.run(
    STAFF_USERNAME,
    hashPassword(staffPassword, staffSalt),
    staffSalt,
    'staff',
    1,
    '门店店员',
    createdAt,
  )

  return credentials
}
