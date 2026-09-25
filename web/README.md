# 山野咖啡 · 品牌官网与会员中心

Vue 3 + Vite + TypeScript + Vue Router。品牌视觉主题变量集中在 `src/styles/theme.css`（深山棕主色、焦糖点缀、抹茶辅助、米白底色），与 admin / miniapp 三端统一。

## 启动

```bash
# 1. 先启动 API 服务（另开终端）
cd server
npm install
npm run dev          # http://127.0.0.1:3000

# 2. 启动官网
cd web
npm install
npm run dev          # http://127.0.0.1:5102
```

接口地址默认指向 `http://127.0.0.1:3000`，可通过环境变量覆盖：

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000 npm run dev
```

## 常用命令

| 命令 | 说明 |
|-|-|
| `npm run dev` | 开发模式（端口 5102） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 单元测试（Vitest，33 个用例） |
| `npm run check:responsive` | 响应式核验（需先启动 dev，检查 390 / 768 / 1440 无横向滚动） |
| `npm run preview` | 预览生产构建 |

## 页面

- 首页：品牌主视觉（自绘 SVG 山野日出插画）、当季推荐、品牌理念、门店入口、会员 CTA
- 菜单：按分类浏览全部在售商品与规格说明
- 门店：门店列表、实时营业状态、自绘示意地图
- 品牌故事：品牌时间线、产地 / 烘焙 / 冲煮理念（插画全部自绘）
- 会员中心：手机号 + 验证码登录后查看订单、积分明细、等级进度与优惠券

会员登录演示验证码固定为 `123456`，未注册手机号首次登录自动创建会员。

## 设计说明

- 所有插画与图标均为自绘 SVG（`src/components/` 与 `src/components/story/`），不引用任何外部图片或 CDN 资源，有专项测试守护
- 金额在界面统一格式化为 `¥xx.xx`（接口传输为整数“分”）；时间按北京时间展示（接口为 UTC ISO8601）
- 手机号在会员中心展示为脱敏格式 `138****8888`
- 响应式覆盖手机 / 平板 / 桌面三档，`npm run check:responsive` 可复现核验

## 已知问题

- 官网以品牌展示与会员查询为主，点单下单（购物车、支付、取餐码）请使用小程序端
- 会员登录验证码为演示固定值 `123456`，未接入真实短信
- 商品图为自绘 SVG 插画占位，暂无实拍图
