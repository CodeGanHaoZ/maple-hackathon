# 枫况 · 栖霞山秋日伴游

面向移动 H5 的栖霞山轻量伴游首版。它把“地图与路线”和“分点位枫况”作为两个并列入口，文字伴游负责解释和跳转；即使模型不可用，结构化地图、路线、设施和枫况仍可使用。

> 当前仓库是可运行的第一版演示。点位、道路、路线、设施和枫况均为**演示数据**，不代表现场实时状态，也不能用于步行导航。正式上线前需要由现场核验人员替换并审核数据。

## 技术栈

- 前端：Vue 3、Vite、TypeScript、Vue Router、Pinia、Lucide Vue
- 后端：Node.js、Hono、TypeScript、Zod
- 数据：首版使用内存 fixture，API 契约按 PRD 的 `/api/v1` 设计；后续可平滑接入 SQLite + Drizzle
- UI：qixia-autumn-ui「栖霞秋册」范式，使用暖纸底、枫阶、册页卡与靛青山影页脚

## 快速开始

环境要求：Node.js 20+、pnpm 9+。

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:5173`。Vite 前端默认请求 `http://localhost:8787/api/v1`，API 服务也会由 `pnpm dev` 同时启动。

可通过 `VITE_API_URL` 修改前端 API 地址。

## 已实现的首版能力

- 双主线首页，游客类型选择和 sessionStorage 条件记忆
- 核验范围示意地图、点位列表、路线卡片与路线详情抽屉
- 按人群确定性筛选路线，并展示时间、台阶、设施和不匹配说明
- 分点位枫况：红度、密度、视角、观测日期、来源、有效期
- “看色彩 / 看成片 / 看层次”赏枫筛选
- 厕所、休息点、座位三类设施 API
- 文字伴游降级回答和结构化卡片入口
- 纠错接口、最小内容后台监看页
- 移动端底部导航、键盘焦点、`prefers-reduced-motion` 支持

## 素材与设计来源

界面使用 `qixia-autumn-ui` 提供的官方栖霞山标识、山影纹样和 design tokens。部分点位图片来自共享素材目录 `枫客松文档资料/枫叶素材_队友共享版`，按原文件名语义选择了秋林、湖面、牌坊和红叶坡素材；素材许可和正式发布范围仍需项目方确认。图片只用于演示，不将其描述为现场实时照片。

## API

API 前缀为 `/api/v1`，主要接口：`GET /bootstrap`、`GET /pois`、`GET /pois/:id`、`GET /routes`、`GET /routes/:id`、`GET /facilities`、`GET /maple`、`GET /maple/:poiId`、`POST /recommendations/routes`、`POST /recommendations/maple`、`POST /chat`、`POST /feedback`、`POST /events`。

成功响应包含 `data` 和 `meta.requestId/dataVersion/generatedAt`。首版聊天使用确定性的降级 provider，不假装已连接外部模型；生产接入模型时密钥只能放在服务端环境变量。

## 校验命令

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 发布前工作

1. 使用现场核验后的 GeoJSON、路线段、设施和来源替换 `apps/api/src/index.ts` 的演示 fixture。
2. 按 PRD 接入 SQLite、发布状态（draft/verified/published/withdrawn）、审计日志、管理员 HttpOnly 会话和 CSRF 防护。
3. 配置获得授权的底图、署名和 WGS84 坐标；当前示意地图不提供定位导航。
4. 确认共享图片的版权、拍摄日期和展示许可后再用于生产内容。

## 目录

```text
apps/web/          Vue 游客端
apps/api/          Hono API 与演示 fixtures
docs/              项目文档
data/              运行时数据目录（不提交）
```
