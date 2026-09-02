# CordisX Agent Trace Showcase

Agent Trace Showcase is an independent, read-only CordisX plugin repository.
It owns the Timeline business projection and body composition; the Host owns
session chrome, route behavior, shared controls, accessibility, permission UI,
and native lifecycle authority.

This repository is currently an API-checkpoint scaffold. Fixture mode is fully
usable as a deterministic demo. Live mode deliberately reports `NEED_API`
until CordisX publishes the DSH-aligned public contracts described below.

## API checkpoint

The target architecture follows DeepSeek Harness ownership:

- a Host-private Session authority owns one append-only `SessionEvent` log;
- the public plugin seam is a permission-scoped, read-only `ctx.sessions`
  service for immutable Session snapshots and post-commit event subscription;
- `ctx.agents` owns create/resume/get and returns public live Agent handles;
- the plugin may observe only the necessary public `agent/*` live projections;
- `ctx.agentLoop` is the Host concrete driver/factory provider and is not a
  plugin dependency.

CordisX Protocol does not yet publish that `ctx.sessions` / `SessionEvent`
contract. This plugin therefore does not consume legacy `ctx.agentEvents`,
`ctx.agentHistory`, concrete `ctx.agentLoop`, a Host-private import, a cast, or
a raw Electron/app-server bridge. It also creates no adapter or ledger.

## Host-owned UI

The plugin registers structured route, page, and session-header-action
descriptors. Its React contribution renders only the Timeline business body
using `cordisx/ui`. It does not import TDesign, copy Host chrome or tabs, query
Host-private selectors, or mutate Host DOM.

## Data modes

- `live` is unavailable until the public Session API is implemented. It never
  falls back to a different evidence source.
- `fixture` is a deterministic demo. Every event has `origin: fixture` and the
  UI displays `DEMO · fixture`; it is not Codex, Desktop, AgentLoop, persisted,
  live, or historical evidence.

There is no historical mode in this design-validation scaffold. Durable
history will be the immutable snapshot side of the same future Session service,
not a separate JSONL reader or compatibility provider.

## Configuration

| Setting | Default | Values | Meaning |
| --- | --- | --- | --- |
| `mode` | `live` | `live`, `fixture` | Select truthful unavailable live mode or the explicit demo. |
| `timelineWindowSize` | `500` | 50-500 | Bound the in-memory and rendered Timeline window. |

Configuration applies on restart so the owning Cordis fiber replaces page
state cleanly. Page unmount and plugin deactivation own their disposers.

## Development and packaging

```sh
npm ci
npm run check
```

`npm run check` runs typecheck, build, focused tests, and
`npm pack --dry-run`. `cordisx.plugin.json` is the immutable package manifest.
The package is private while the public Session API is unresolved, matching
the current Chatroom repository's no-publish checkpoint. Enabling a release
workflow is deferred until the formal contract is integrated and verified.
