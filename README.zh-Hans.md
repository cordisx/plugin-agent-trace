# CordisX Agent Trace Showcase

Agent Trace Showcase 是独立、只读的 CordisX 插件仓库。插件只负责 Timeline
业务投影与正文组合；会话 chrome、路由行为、共享控件、无障碍、权限 UI 与
native lifecycle authority 均由 Host 负责。

Timeline 只消费公开 Agent/Session Runtime 契约。Host 未提供受权限约束的
Session 服务时，Timeline 会保持空数据并明确显示 unavailable。

## API checkpoint

Agent/Session Runtime 的 ownership model 如下：

- Host-private Session authority 唯一拥有 append-only `SessionEvent` log；
- 插件只通过受权限约束、只读的 `ctx.sessions` 获取不可变 Session snapshot
  与 post-commit event subscription；
- `ctx.agents` 负责 create/resume/get，并返回公开 live Agent handle；
- `ctx.approvals` 负责 approval request 与 decision；
- 环境组合和 transport binding 均为 Host-private，不改变插件契约、权限或
  Session 事实。

正式契约是 Protocol main commit
`c96c290697f9e802a68c6d3bb094fd27d8d00d1e` 的
`@cordisx/protocol/sessions/v1`，以及
`@cordisx/protocol/entities/v1` 中增量定义的
`EntityDefinitionBoundSessionEvent`。Timeline 先读取固定 Session snapshot，
分页读取 immutable watermark，再接续 atomic replay/live subscription；订阅
终止时会清空视图并报告 terminal code。

对 entity-backed Session，`entity/definition-bound` 是历史定义 identity、
digest 与 definition bytes 的唯一持久事实。Timeline 只投影该 Session 事件中
持久化的 binding，绝不查询 `ctx.entities`，也不按最新 local entity revision
重标历史。

插件不消费替代 event service，也不使用 Host-private import、unsafe cast、
raw bridge、额外 adapter 或第二 ledger。

v5 runtime manifest 对 `sessions.get`、`sessions.read`、
`sessions.subscribe` 分别声明 optional capability，并全部绑定到当前
`session.timeline` 路由的精确 `:sessionId`；空 scope 和 wildcard 均不允许。

## Host-owned UI

插件注册结构化 route、page 与 session-header action 描述，并仅用 `cordisx/ui`
渲染 Timeline 业务正文。它不导入 TDesign，不复制 Host chrome/tab，不查询
Host-private selector，也不修改 Host DOM。

## Session 事实

Agent Trace 只读取 `ctx.sessions` 的 `SessionEvent` 事实。immutable history 与
post-commit update 是同一 Session authority 的两个视图。service、精确路由
权限、Session、read 或 subscription 任一不可用时都保持空数据，且不
fallback 到其他来源。

## 验证与打包

```sh
npm ci
npm run check
```

`npm run check` 包含 typecheck、build、focused tests 与
`npm pack --dry-run`。Protocol dependency 精确 pin 到可从远端解析的 main
commit。entity-backed Host Runtime 已在 CordisX main commit
`ff9cf8b1ba4e4caffa23abbd767dbba0b8884c8a` 正式提供；Chatroom 的 entity-backed
消费已在 main commit `dc1d672b93e6b6a3a29961561546957d66955a1a`
落地。真实 App 集成验证闭合前，package 保持 private。
