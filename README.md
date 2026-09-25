# 山野咖啡 · 门店点单平台

> 虚构品牌，门店、地址、商品、价格和会员均为示例数据，仅用于 AI 编程实测。

本仓库由 Step 5 Preview（阶跃星辰）通过 Step Code 编程助手完成，需求见 `docs/brief.md`，任务见 `todo/`。

- 提交作者 `step-5-preview`：模型自己的提交
- 提交作者 `host`：主持者的初始化或人工介入

| 目录 | 内容 | 技术栈 |
|-|-|-|
| `server/` | API 服务 | Node.js + TypeScript + Fastify + SQLite |
| `admin/` | 后台管理 | React + shadcn/ui（Base UI）+ Tailwind CSS v4 |
| `web/` | 品牌官网与会员中心 | Vue 3 + Vite |
| `miniapp/` | 点单小程序 | uni-app（编译到微信小程序） |
