# CordisX Agent Trace Showcase

Agent Trace Showcase is an independent, read-only CordisX plugin repository.
It owns the Timeline business projection and body composition; the Host owns
session chrome, route behavior, shared controls, accessibility, permission UI,
and native lifecycle authority.

The Timeline consumes the public Agent/Session Runtime contract. It reports an
honest empty unavailable state whenever the Host does not provide the
permission-scoped Session service.

## API checkpoint

The Agent/Session Runtime ownership model is:

- a Host-private Session authority owns one append-only `SessionEvent` log;
- the public plugin seam is a permission-scoped, read-only `ctx.sessions`
  service for immutable Session snapshots and post-commit event subscription;
- `ctx.agents` owns create/resume/get and returns public live Agent handles;
- `ctx.approvals` owns approval requests and decisions;
- environment composition and transport bindings remain Host-private and do
  not change plugin contracts, permissions, or Session facts.

The contract candidate is `@cordisx/protocol/sessions/v1` at Protocol commit
`d1b3486df18034bb5aecde090b3bd1b29b2c55d8`. It is locally verified but is not
yet pushed, published, or pinned by CordisX Mono. The Timeline reads a fixed
Session snapshot, pages through its immutable watermark, then follows the
atomic replay/live subscription. Subscription termination clears the view and
reports the terminal code.

The plugin consumes no alternate event service, Host-private import, unsafe
cast, raw bridge, adapter, or second ledger.

The v5 runtime manifest declares optional `sessions.get`, `sessions.read`, and
`sessions.subscribe` capabilities. Each is bound to the active
`session.timeline` route's exact `:sessionId`; no empty or wildcard scope is
accepted.

## Host-owned UI

The plugin registers structured route, page, and session-header-action
descriptors. Its React contribution renders only the Timeline business body
using `cordisx/ui`. It does not import TDesign, copy Host chrome or tabs, query
Host-private selectors, or mutate Host DOM.

## Session facts

Agent Trace reads only `SessionEvent` facts from `ctx.sessions`. Immutable
history and post-commit updates are two views of the same Session authority.
If the service, exact route permission, Session, read, or subscription is
unavailable, the Timeline shows no rows and never falls back to another source.

## Configuration

| Setting | Default | Values | Meaning |
| --- | --- | --- | --- |
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
Until Protocol commit `d1b3486` is pushed, a fresh `npm ci` cannot resolve the
pinned Git dependency; local verification uses a tarball packed from the exact
owner worktree. The package remains private until Protocol distribution, Host
implementation, and real integration verification are complete.
