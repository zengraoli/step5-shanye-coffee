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
    manual_closed INTEGER NOT NULL DEFAULT 0,
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
    spec_groups TEXT NOT NULL DEFAULT '["cup","temp","sugar"]',
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  /* ---------- 门店手动状态与门店级售罄 ---------- */
  `CREATE TABLE IF NOT EXISTS product_store_status (
    product_id INTEGER NOT NULL REFERENCES products(id),
    store_id INTEGER NOT NULL REFERENCES stores(id),
    sold_out INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (product_id, store_id)
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
    used_at TEXT,
    -- 以下为领取时的模板快照：后台改模板不影响已领取的券
    name TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'full_reduction',
    threshold_fen INTEGER NOT NULL DEFAULT 0,
    reduce_fen INTEGER NOT NULL DEFAULT 0,
    discount_percent INTEGER NOT NULL DEFAULT 100,
    max_reduce_fen INTEGER NOT NULL DEFAULT 0
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
  addStoreManualClosed(db)
  addProductSpecGroups(db)
  addMemberCouponSnapshotColumns(db)
}

function addColumn(db: { exec: (sql: string) => unknown }, table: string, column: string, ddl: string, columns: { name: string }[]): void {
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
  }
}

/**
 * 会员券快照字段：领取时把券模板的名称与优惠条件复制到会员券上，
 * 之后后台编辑券模板不会影响已领取的券（弹窗承诺“对新领取的券生效”）。
 */
function addProductSpecGroups(db: {
  prepare: (sql: string) => { all: () => unknown[] }
  exec: (sql: string) => unknown
}): void {
  const columns = db.prepare('PRAGMA table_info(products)').all() as { name: string }[]
  addColumn(db, 'products', 'spec_groups', "TEXT NOT NULL DEFAULT '[\"cup\",\"temp\",\"sugar\"]'", columns)
  // 轻食与周边默认不需要杯型 / 温度 / 糖度
  db.exec(`UPDATE products SET spec_groups = '[]' WHERE category_id IN (SELECT id FROM categories WHERE name IN ('轻食', '周边'))`)
}

function addStoreManualClosed(db: {
  prepare: (sql: string) => { all: () => unknown[] }
  exec: (sql: string) => unknown
}): void {
  const columns = db.prepare('PRAGMA table_info(stores)').all() as { name: string }[]
  addColumn(db, 'stores', 'manual_closed', 'INTEGER NOT NULL DEFAULT 0', columns)
}

function addMemberCouponSnapshotColumns(db: {
  prepare: (sql: string) => { all: () => unknown[] }
  exec: (sql: string) => unknown
}): void {
  const columns = db.prepare('PRAGMA table_info(member_coupons)').all() as { name: string }[]
  addColumn(db, 'member_coupons', 'name', 'TEXT NOT NULL DEFAULT \'\'', columns)
  addColumn(db, 'member_coupons', 'type', 'TEXT NOT NULL DEFAULT \'full_reduction\'', columns)
  addColumn(db, 'member_coupons', 'threshold_fen', 'INTEGER NOT NULL DEFAULT 0', columns)
  addColumn(db, 'member_coupons', 'reduce_fen', 'INTEGER NOT NULL DEFAULT 0', columns)
  addColumn(db, 'member_coupons', 'discount_percent', 'INTEGER NOT NULL DEFAULT 100', columns)
  addColumn(db, 'member_coupons', 'max_reduce_fen', 'INTEGER NOT NULL DEFAULT 0', columns)
  // 旧数据按模板回填一次（name 为空表示尚未快照）
  db.exec(`
    UPDATE member_coupons SET
      name = (SELECT c.name FROM coupons c WHERE c.id = member_coupons.coupon_id),
      type = (SELECT c.type FROM coupons c WHERE c.id = member_coupons.coupon_id),
      threshold_fen = (SELECT c.threshold_fen FROM coupons c WHERE c.id = member_coupons.coupon_id),
      reduce_fen = (SELECT c.reduce_fen FROM coupons c WHERE c.id = member_coupons.coupon_id),
      discount_percent = (SELECT c.discount_percent FROM coupons c WHERE c.id = member_coupons.coupon_id),
      max_reduce_fen = (SELECT c.max_reduce_fen FROM coupons c WHERE c.id = member_coupons.coupon_id)
    WHERE name = '' AND coupon_id IN (SELECT id FROM coupons)
  `)
}

/** 执行建表（幂等） */
export function migrate(db: {
  exec: (sql: string) => unknown
}): void {
  for (const sql of MIGRATIONS) {
    db.exec(sql)
  }
}
