# 山野咖啡 · API 服务

Fastify + TypeScript + SQLite（Node 内置 `node:sqlite`，无需原生依赖）。

## 启动

```bash
cd server
npm install
npm run dev        # 开发模式（热重启），默认 http://127.0.0.1:3000
```

## 常用命令

| 命令 | 说明 |
|-|-|
| `npm run dev` | 开发模式启动 |
| `npm run build` | 编译到 `dist/` |
| `npm start` | 运行编译产物 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 单元测试（node:test） |
| `npm run smoke` | 冒烟脚本 |

## 约定

- 统一响应：`{"code":0,"data":...,"message":"ok"}`，错误码见 `docs/errors.md`
- 金额单位为整数“分”；时间为 UTC ISO8601
- 手机号在列表与日志中脱敏为 `138****1234`
