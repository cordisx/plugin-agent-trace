# CordisX Agent Trace Showcase

Agent Trace Showcase 是独立、只读的 CordisX 插件仓库。插件只负责 Timeline
业务投影与正文组合；会话 chrome、路由行为、共享控件、无障碍、权限 UI 与
native lifecycle authority 均由 Host 负责。

当前仓库是 API checkpoint 骨架：fixture 模式可作为确定性 demo 使用；在
CordisX 发布符合 DSH ownership 的公开契约前，live 模式会明确返回
`NEED_API`。

## API checkpoint

目标架构严格遵循 DeepSeek Harness：

- Host-private Session authority 唯一拥有 append-only `SessionEvent` log；
- 插件只通过受权限约束、只读的 `ctx.sessions` 获取不可变 Session snapshot
  与 post-commit event subscription；
- `ctx.agents` 负责 create/resume/get，并返回公开 live Agent handle；
- 插件只观察展示必需的公开 `agent/*` 实时投影；
- `ctx.agentLoop` 是 Host concrete driver/factory provider，不是插件依赖。

CordisX Protocol 尚未发布 `ctx.sessions` / `SessionEvent` 契约。因此插件不消费
旧 `ctx.agentEvents`、`ctx.agentHistory` 或 concrete `ctx.agentLoop`，也不使用
Host-private import、cast、raw Electron/app-server bridge，不创建第二 adapter
或 ledger。

## Host-owned UI

插件注册结构化 route、page 与 session-header action 描述，并仅用 `cordisx/ui`
渲染 Timeline 业务正文。它不导入 TDesign，不复制 Host chrome/tab，不查询
Host-private selector，也不修改 Host DOM。

## 数据模式

- `live` 在公开 Session API 落地前明确 unavailable，且不 fallback 到其他
  evidence source。
- `fixture` 是确定性 demo；所有事件都带 `origin: fixture`，UI 明示
  `DEMO · fixture`。它不是 Codex、Desktop、AgentLoop、持久化、实时或历史
  数据证据。

当前设计验证骨架没有 historical 模式。未来 durable history 必须是同一个
Session 服务的 immutable snapshot，而不是独立 JSONL reader 或兼容 provider。

## 验证与打包

```sh
npm ci
npm run check
```

`npm run check` 包含 typecheck、build、focused tests 与
`npm pack --dry-run`。公开 Session API 尚未确定，因此 package 当前标为
private，与 Chatroom 仓库的 no-publish checkpoint 一致；正式契约接入并验证
后再启用发布 workflow。
