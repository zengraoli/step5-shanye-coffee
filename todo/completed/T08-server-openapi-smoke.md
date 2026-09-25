# T08 OpenAPI 文档与冒烟脚本

阶段：S0 server
状态：已完成（v0.8，2026-09-26）

## 要做什么
提供 OpenAPI 文档页；`npm run smoke` 跑通：会员登录 → 下单 → 支付 → 状态推进 → 积分到账。

## 完成标准
- `npm run smoke` 全部通过
- server/README.md 写明启动方式和默认账号
- 相关构建、类型检查、测试全部通过
