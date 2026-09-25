# 山野咖啡 · 品牌官网与会员中心

Vue 3 + Vite + TypeScript + Vue Router。品牌视觉主题变量集中在 `src/styles/theme.css`（深山棕主色、焦糖点缀、抹茶辅助、米白底色），与 admin / miniapp 三端统一。

## 启动

```bash
cd web
npm install
npm run dev        # http://127.0.0.1:5102
```

需先启动 API 服务（`server`，默认 http://127.0.0.1:3000）。接口地址可通过环境变量覆盖：

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000 npm run dev
```

## 常用命令

| 命令 | 说明 |
|-|-|
| `npm run dev` | 开发模式（端口 5102） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 单元测试（Vitest） |
| `npm run preview` | 预览生产构建 |

## 页面

- 首页：品牌主视觉、当季推荐、门店入口
- 菜单：按分类浏览商品与规格
- 门店：门店列表与实时营业状态
- 品牌故事：品牌理念与烘焙哲学
- 会员中心：手机号登录后查看订单、积分、等级、优惠券

## 已知问题

- 官网以下单浏览为主，点单下单请使用小程序端
- 会员登录验证码为演示固定值 `123456`
- 商品图为自绘 SVG 插画占位，暂无实拍图
