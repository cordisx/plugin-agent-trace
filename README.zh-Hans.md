# CordisX Agent Trace Showcase

Agent Trace Showcase 为单个 Agent 会话提供只读 Timeline。它适合查看持久化的
会话事件、生命周期变化、工具活动、审批，以及会话记录的精确 Entity 定义；插件
不会获得控制该会话的能力。

## 安装

插件 ID：`agent-trace-showcase`。当前版本：`0.1.1`。

CordisX Community Marketplace feed 不是 trust root，且必须先配置并启用，
`--source` 才能选择它：

```sh
FEED_URL=https://raw.githubusercontent.com/cordisx/marketplace/main/marketplace.json
npx cordisx@beta source add "$FEED_URL" --yes
npx cordisx@beta plugin install agent-trace-showcase --source "$FEED_URL" --version 0.1.1
```

若该 feed 已启用，可跳过 `source add`。使用其他 profile 时，两条命令都要添加
相同的 `--profile <profile>`。`--yes` 只确认来源变更，不会批准插件权限。
Marketplace 条目列出 `0.1.1` artifact 后，安装命令才可用；在此之前，可从
[GitHub Release](https://github.com/cordisx/plugin-agent-trace/releases/tag/v0.1.1)
下载压缩包与 `SHA256SUMS`。

## 使用

在 CordisX 中打开一个 Agent 会话，然后使用会话 Timeline 操作。页面读取当前
`session.timeline` 路由允许访问的不可变历史，并跟随新提交的事件。它不会创建、
修改、恢复或取消 Agent 工作。

## 配置

`timelineWindowSize` 限制内存中和页面上保留的事件数量，默认值为 `500`，可选范围
为 `50` 到 `500`。配置在插件重启后生效。

## 权限与限制

插件为当前路由中的精确 Session ID 请求可选的 `sessions.get`、`sessions.read` 和
`sessions.subscribe` 权限。数据只在当前运行期内使用，不会传输到外部。

Host 服务、精确路由权限、Session、读取或订阅不可用时，Timeline 会保持为空并
显示不可用原因，不会切换到其他事件来源、查询可变 Entity 状态或补造缺失历史。

## 排错

- **找不到 `0.1.1`：**确认 Marketplace feed 已加入该版本 artifact；`--source`
  不会注册或修复 feed。
- **Timeline 为空：**从具体 Agent 会话打开 Timeline，并在插件设置中检查三项
  Session 权限。
- **Timeline 停止更新：**重新打开会话路由。插件会显示终止原因，不会静默切换
  数据源。

## 许可证

包与依赖条款见 [LICENSE](LICENSE) 和 [legal](legal/)。维护者的环境、检查、打包与
发布说明见 [AGENTS.md](AGENTS.md)。
