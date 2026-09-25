# 山野咖啡 · 点单小程序

uni-app（Vue 3 + Vite）点单小程序，编译目标为微信小程序（mp-weixin），也可运行 H5 调试模式。

## 启动

```bash
cd miniapp
npm install

# H5 调试模式（浏览器预览，端口 5103）
npm run dev:h5

# 微信小程序开发模式（生成微信开发者工具可导入的工程）
npm run dev:mp-weixin
```

接口基地址默认 `http://127.0.0.1:3000`，可通过环境变量覆盖：

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000 npm run dev:h5
```

## 在微信开发者工具中导入

1. 执行 `npm run build:mp-weixin`（或 `npm run dev:mp-weixin` 保持监听编译）；
2. 打开微信开发者工具 → 导入项目 → 选择本仓库的 **`miniapp/dist/build/mp-weixin`** 目录；
3. AppID 选择“测试号”（`src/manifest.json` 中 `appid` 留空）；
4. 在“详情 → 本地设置”中勾选“**不校验合法域名、web-view（业务域名、TLS 版本以及 HTTPS 证书）**”，否则无法请求 `http://127.0.0.1:3000` 的开发接口。

## 常用命令

| 命令 | 说明 |
|-|-|
| `npm run dev:h5` | H5 调试（端口 5103） |
| `npm run dev:mp-weixin` | 微信小程序编译监听 |
| `npm run build:mp-weixin` | 产出到 `dist/build/mp-weixin` |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 单元测试（Vitest） |

## 页面

- 首页：门店选择、轮播、推荐商品
- 点单：左侧分类、右侧商品，规格弹窗，底部购物车浮层
- 确认订单：自提 / 堂食、优惠券选择、金额明细、模拟支付
- 订单详情：取餐码、状态进度条
- 我的：会员卡、积分、等级、优惠券、订单列表

会员登录演示验证码固定为 `123456`。

## 设计说明

- 品牌主题变量集中在 `src/uni.scss`（深山棕主色、焦糖点缀、抹茶辅助、米白底色），与 admin / web 三端统一
- 底部导航与商品插画均为 CSS / 自绘 SVG，不依赖外部图片或 CDN
- 金额在界面统一格式化为 `¥xx.xx`（接口传输为整数“分”）；时间按北京时间展示（接口为 UTC ISO8601）

## 已知问题

- 微信开发者工具中请求 http 接口需手动开启“不校验合法域名”（开发期）；上线需配置 HTTPS 域名
- 登录态与购物车存储在本地缓存中，卸载小程序或清除缓存后会重置
- 支付为模拟支付，未接入微信支付
