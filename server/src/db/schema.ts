/**
 * 建表语句。所有金额字段均为整数“分”，时间字段均为 UTC ISO8601 字符串。
 */
export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 0,
    level TEXT NOT NULL DEFAULT 'silver',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    base_price INTEGER NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    on_sale INTEGER NOT NULL DEFAULT 1,
    sold_out INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    threshold_fen INTEGER NOT NULL DEFAULT 0,
    reduce_fen INTEGER NOT NULL DEFAULT 0,
    discount_percent INTEGER NOT NULL DEFAULT 100,
    max_reduce_fen INTEGER NOT NULL DEFAULT 0,
    valid_days INTEGER NOT NULL DEFAULT 7,
    total INTEGER NOT NULL DEFAULT 0,
    remaining INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS member_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id),
    member_id INTEGER NOT NULL REFERENCES members(id),
    status TEXT NOT NULL DEFAULT 'unused',
    valid_from TEXT NOT NULL,
    valid_to TEXT NOT NULL,
    obtained_at TEXT NOT NULL,
    used_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL,
    store_id INTEGER REFERENCES stores(id),
    nickname TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    member_id INTEGER NOT NULL REFERENCES members(id),
    store_id INTEGER NOT NULL REFERENCES stores(id),
    order_type TEXT NOT NULL,
    status TEXT NOT NULL,
    total_fen INTEGER NOT NULL DEFAULT 0,
    discount_fen INTEGER NOT NULL DEFAULT 0,
    pay_fen INTEGER NOT NULL DEFAULT 0,
    member_coupon_id INTEGER,
    pickup_code TEXT,
    remark TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    paid_at TEXT,
    making_at TEXT,
    pickable_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    spec TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS points_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id),
    change INTEGER NOT NULL,
    reason TEXT NOT NULL,
    order_id INTEGER,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_member_coupons_member ON member_coupons(member_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_points_logs_member ON points_logs(member_id)`,
  /* ---------- 第二杯半价活动 ---------- */
  `CREATE TABLE IF NOT EXISTS promo_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'second_half',
    status TEXT NOT NULL DEFAULT 'inactive',
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS promo_activity_products (
    activity_id INTEGER NOT NULL REFERENCES promo_activities(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    PRIMARY KEY (activity_id, product_id)
  )`,
]

/**
 * 兼容已有数据库：为 orders 增加活动优惠金额字段。
 * （CREATE TABLE IF NOT EXISTS 不会给旧表补列，需要显式 ALTER。）
 */
export function migrateSchema(db: {
  prepare: (sql: string) => { all: () => unknown[] }
  exec: (sql: string) => unknown
}): void {
  const columns = db.prepare('PRAGMA table_info(orders)').all() as { name: string }[]
  if (!columns.some((column) => column.name === 'promo_discount_fen')) {
    db.exec('ALTER TABLE orders ADD COLUMN promo_discount_fen INTEGER NOT NULL DEFAULT 0')
  }
}

/** 执行建表（幂等） */
export function migrate(db: {
  exec: (sql: string) => unknown
}): void {
  for (const sql of MIGRATIONS) {
    db.exec(sql)
  }
}
