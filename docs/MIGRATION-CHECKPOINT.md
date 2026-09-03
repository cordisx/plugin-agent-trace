# Agent Trace migration checkpoint

Date: 2026-09-03

This document records the read-only source audit and the exact boundary at
which the independent repository consumed the SessionEvent contract owner's
formal local handoff. It does not define a plugin-owned public API.

## Owning source audited

The built-in package at `CordisX/cordisx:packages/agent-trace-showcase` contains:

- package/docs/build: `README.md`, `README.zh-Hans.md`, `package.json`,
  `tsconfig.json`, `scripts/copy-readme.mjs`;
- all runtime modules under `src/`;
- all focused tests under `test/`.

Host integration and gate references also exist in:

- `packages/cli/scripts/live-smoke.mjs`;
- `tests/agent-history.test.ts`;
- `tests/agent-trace-readme.integration.test.ts`;
- `tests/agent-trace-showcase.integration.test.ts`;
- `tests/navigation.test.ts`;
- `tests/plugin-readme-localization-files.test.ts`;
- `tests/react-plugin-page-gate.test.ts`;
- `tests/route-page-metadata-gate.test.ts`;
- `tests/ui-copy-principles.test.ts`;
- the root `package-lock.json` workspace records.

## Legacy dependency audit

The built-in module injects `i18n`, `pages`, `routes`, `slots`, `agentEvents`,
`agentHistory`, `agents`, and `systemPrompt`.

- legacy runtime modules queried separate event and history services, exposed
  mutations, and registered prompt contributions.
- `src/index.ts` selected among multiple legacy data sources, requested read
  and mutation capabilities, and wired the route/page.

None of those legacy services or mutation demos are carried into this
design-validation repository. There is no historical compatibility mode.

## Independent repository boundary

This repository currently owns:

- versioned package and immutable package/runtime manifests;
- structured page, route, and session-header action contributions;
- Host-neutral Timeline model, filtering, grouping, and read-only body view;
- `TraceShowcaseStore`, which is the read-only Timeline state boundary;
- `src/session-store.ts`, which consumes only
  `@cordisx/protocol/sessions/v1` plus the
  `EntityDefinitionBoundSessionEvent` extension from
  `@cordisx/protocol/entities/v1`, performs immutable snapshot paging, atomic
  replay/live subscription, and fail-closed generation/terminal fencing;
- truthful unavailable state whenever the public Session service or exact
  route-bound permission is absent;
- focused architecture, manifest, model, registration, typecheck,
  build, and package gates.

It does not import Host-private code, use TDesign or Host selectors, create an
adapter/ledger, access a raw bridge, or depend on concrete `ctx.agentLoop`.

## PROTOCOL_READY handoff

Formal Protocol dependency:

- repository: `CordisX/cordisx-protocol`;
- main commit: `c96c290697f9e802a68c6d3bb094fd27d8d00d1e`;
- pull requests: `https://github.com/cordisx/cordisx-protocol/pull/77` and
  `https://github.com/cordisx/cordisx-protocol/pull/78`, plus entities/v1
  `https://github.com/cordisx/cordisx-protocol/pull/79`;
- public entrypoints: `@cordisx/protocol/sessions/v1` and
  `@cordisx/protocol/entities/v1`;
- status: merged to remote main; focused type, conformance, distribution,
  diff, naming, and formal-main export readback passed. The broad Protocol
  workflow retains its pre-existing Manager v2 AJV strict-union failure. Mono
  is not updated by this task.

The consumer lives in `src/session-store.ts`.
`src/react-view.tsx` remains unaware of Host services. `src/index.ts` declares
only the formal `sessions` injection and the optional v5
`sessions.get/read/subscribe` capabilities, all bound to the same-plugin
`session.timeline` route's exact `:sessionId`.

No `agent/*` live subscription is currently necessary: every fact rendered by
the Timeline is a durable `SessionEvent`. If a future UI requirement needs a
non-durable live fact, it must use the separate formal Agent subscription and
must never manufacture a durable cursor or ledger.

## HOST_RUNTIME_READY handoff

Formal Host dependency:

- repository: `CordisX/cordisx`;
- main commit: `ff9cf8b1ba4e4caffa23abbd767dbba0b8884c8a`;
- pull requests: `https://github.com/cordisx/cordisx/pull/224` through
  `https://github.com/cordisx/cordisx/pull/236`;
- status: merged to remote main and pinned to Protocol
  `c96c290697f9e802a68c6d3bb094fd27d8d00d1e`; focused Agent/Session runtime,
  Shell v4 terminal, permission/scope, no-check type, package allowlist, and
  diff checks passed. The #231 composition focus passed 14/14 with CLI
  `tsc --noCheck`. Its broad workflow stopped at
  `check:clean-dev -> prepare:dev` on the pre-existing
  Playground/Manager/Navigation TypeScript baseline; no #231-changed file was
  in the diagnostic set and later broad gates did not run.

The Host provides the permission-scoped `ctx.sessions` service and fences
route, Session, plugin generation, permission, and connection replacement.
Those terminal fences clear the Timeline and leave it honestly unavailable.
This repository does not import or package the Host runtime implementation.
Only a launcher-owned, ready local-development artifact in the Playground may
receive the Host's no-dialog authorization; it still resolves and persists one
exact Session scope behind a revocable generation/connection-fenced lease.
Installed/production and ordinary Playground plugins retain interactive,
fail-closed authorization.

The actual `dev:ui` session-load path gives explicitly configured, enabled
local entries the Host-verified local-development identity, provenance, and
artifact generation required by that authorization rule. Packaged, remote,
disabled, and non-Playground entries do not receive that provenance.

The Playground secondary-embedding path omits inline sourcemaps only for those
embedded local-development candidates. Ordinary local-development and real-App
builds retain inline sourcemaps. Host-provided shared-React virtual inputs are
excluded from filesystem watch/import graphs so Vite cannot reinterpret
`cordisx/react`, `cordisx/ui`, or JSX-runtime virtual sources as absolute file
imports; the real transitive source watch graph remains intact.

## ENTITY_DEFINITION_BINDING_READY handoff

Formal entity-backed consumers:

- Host main: `ff9cf8b1ba4e4caffa23abbd767dbba0b8884c8a`
  (`https://github.com/cordisx/cordisx/pull/236`);
- Chatroom main: `dc1d672b93e6b6a3a29961561546957d66955a1a`
  (`https://github.com/cordisx/plugin-chatroom/pull/10`);
- Protocol main: `c96c290697f9e802a68c6d3bb094fd27d8d00d1e`.

Host persists `entity/definition-bound` as an ignorable SessionEvent when it
creates an entity-backed Session and resumes only from that persisted binding.
Chatroom creates against the exact current Entity identity and resumes an
existing Session with `definitionSource: 'session-persisted'`.

Agent Trace recognizes that one durable extension during the existing
snapshot/replay/live path. Its projection exposes
`binding.resolution.identity`, `binding.resolution.digest`, and
`binding.resolution.definition`. It does not inject or query `ctx.entities`,
consult Chatroom configuration, or relabel historical runs from a current
registry snapshot. Other unknown required events still fail closed; unrelated
extensions remain skippable only when explicitly marked `ignorable: true`.

## Deferred owner actions

Until real-App integration verification succeeds:

- do not remove the built-in Host package or its tests;
- do not register both packages in one Host composition;
- do not update the Mono submodule pointer;
- do not publish npm artifacts;
- do not claim real runtime verification.

The declared Git dependency and lockfile resolve the exact formal Protocol
main commit from GitHub.
