# 山野咖啡 · API 服务

Node.js 24 + TypeScript + Fastify + SQLite（使用 Node 内置 `node:sqlite`，无需编译原生依赖）。

## 启动

```bash
cd server
npm install
npm run dev        # 开发模式（热重启），默认 http://127.0.0.1:3000
```

生产模式：

```bash
npm run build      # 编译到 dist/
npm start          # 运行编译产物
```

## 默认账号

| 账号 | 角色 | 权限 |
|-|-|-|
| `admin` | 管理员 | 全部权限 |
| `staff` | 店员 | 仅本门店订单、商品售罄状态 |

密码通过环境变量指定；未指定时首次启动自动生成，并打印在启动日志中（仅显示一次，请妥善保存）：

```bash
ADMIN_PASSWORD=xxx STAFF_PASSWORD=xxx npm run dev
```

会员登录使用手机号 + 短信验证码，演示环境验证码固定为 `123456`。

## 常用命令

| 命令 | 说明 |
|-|-|
| `npm run dev` | 开发模式启动（热重启） |
| `npm run build` | TypeScript 编译到 `dist/` |
| `npm start` | 运行编译产物 |
| `npm run typecheck` | 类型检查 |
| `npm test` | 单元测试（node:test，64 个用例） |
| `npm run smoke` | 冒烟脚本：登录 → 下单 → 支付 → 状态推进 → 积分到账 |

## 环境变量

| 变量 | 默认值 | 说明 |
|-|-|-|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | 监听地址 |
| `DB_PATH` | `./data/shanye.db` | SQLite 文件位置（`:memory:` 为内存库） |
| `ADMIN_USERNAME` / `STAFF_USERNAME` | `admin` / `staff` | 后台账号名 |
| `ADMIN_PASSWORD` / `STAFF_PASSWORD` | 随机生成 | 后台账号密码（首次创建时生效） |

## 接口约定

- 统一响应：`{"code":0,"data":...,"message":"ok"}`；错误码登记在 `docs/errors.md`
- 金额一律为整数“分”；时间一律为 UTC ISO8601（界面按北京时间展示）
- 手机号在列表与后台接口中脱敏为 `138****1234`
- 接口文档：启动后访问 `/docs`（OpenAPI 3 规范，规范文件在 `/docs/json`）

## 接口一览

| 分组 | 路径 |
|-|-|
| 健康检查 | `GET /health` |
| 会员登录 | `POST /api/v1/auth/sms-code`、`POST /api/v1/auth/login`、`POST /api/v1/auth/logout` |
| 会员信息 | `GET /api/v1/members/me`、`GET /api/v1/members/me/points`、`GET /api/v1/members/me/coupons` |
| 门店 | `GET /api/v1/stores`、`GET /api/v1/stores/:id` |
| 商品 | `GET /api/v1/categories`、`GET /api/v1/products`、`GET /api/v1/products/:id` |
| 优惠券 | `GET /api/v1/coupons`、`POST /api/v1/coupons/:id/claim`、`POST /api/v1/orders/quote` |
| 订单 | `POST /api/v1/orders`、`GET /api/v1/orders`、`GET /api/v1/orders/:id`、`POST /api/v1/orders/:id/pay`、`POST /api/v1/orders/:id/cancel`、`POST /api/v1/orders/:id/confirm` |
| 后台登录 | `POST /api/v1/admin/auth/login`、`GET /api/v1/admin/auth/me` |
| 后台商品 | `GET/POST /api/v1/admin/products`、`PUT /api/v1/admin/products/:id`、`PATCH /api/v1/admin/products/:id/status` |
| 后台优惠券 | `GET/POST /api/v1/admin/coupons`、`PUT /api/v1/admin/coupons/:id`、`PATCH /api/v1/admin/coupons/:id/status` |
| 后台订单 | `GET /api/v1/admin/orders`、`GET /api/v1/admin/orders/:id`、`POST /api/v1/admin/orders/:id/advance` |
| 后台会员 | `GET /api/v1/admin/members`、`GET /api/v1/admin/members/:id` |
| 后台账号 | `GET /api/v1/admin/accounts` |
| 后台看板 | `GET /api/v1/admin/dashboard` |
| 后台门店 | `GET /api/v1/admin/stores`、`PUT /api/v1/admin/stores/:id` |
| 活动（第二杯半价） | `GET /api/v1/promo`、`GET/PUT /api/v1/admin/promo` |

鉴权方式：请求头 `Authorization: Bearer <token>`，会员与后台 token 不通用。

## 已知问题

- 支付为模拟支付，未接入真实支付渠道；短信验证码固定为 `123456`。
- 后台账号暂无“修改密码 / 重置密码”接口，密码目前只能通过环境变量在首次创建时设定（后续任务补充）。
- 商品 `image` 字段已预留，但种子数据未附带本地图片资源，前端暂用自绘插画占位。
- SQLite 为单文件数据库，高并发写入依赖 `busy_timeout` 重试，未做读写分离。
- 优惠券为整券模板发放，暂不支持批量发放与定向发券。
- 第二杯半价活动按“同一订单中同一适用商品的第 2、4… 杯半价”计价，与优惠券叠加时先算活动价再用券。
