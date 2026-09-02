# Agent Trace migration checkpoint

Date: 2026-09-02

This document records the read-only source audit and the exact boundary at
which the independent repository waits for the SessionEvent contract owner.
It is not a declaration of a new public API.

## Owning source audited

The built-in package at `CordisX/cordisx:packages/agent-trace-showcase` contains:

- package/docs/build: `README.md`, `README.zh-Hans.md`, `package.json`,
  `tsconfig.json`, `scripts/copy-readme.mjs`;
- runtime: `src/entry.ts`, `src/index.ts`, `src/types.ts`, `src/model.ts`,
  `src/providers.ts`, `src/live-provider.ts`, `src/history-provider.ts`, and
  `src/react-view.tsx`;
- focused tests: `test/config.test.ts`, `test/entry.test.ts`,
  `test/history-provider.test.ts`, `test/live-provider.test.ts`,
  `test/model.test.ts`, `test/providers.test.ts`, and `test/view.test.ts`.

Host integration and gate references also exist in:

- `packages/cli/scripts/live-smoke.mjs`;
- `tests/agent-history.test.ts`;
- `tests/agent-trace-readme.integration.test.ts`;
- `tests/agent-trace-showcase.integration.test.ts`;
- `tests/fixtures/session-header-sibling-plugin.ts`;
- `tests/navigation.test.ts`;
- `tests/plugin-readme-localization-files.test.ts`;
- `tests/react-plugin-page-gate.test.ts`;
- `tests/route-page-metadata-gate.test.ts`;
- `tests/ui-copy-principles.test.ts`;
- the root `package-lock.json` workspace records.

## Legacy dependency audit

The built-in module injects `i18n`, `pages`, `routes`, `slots`, `agentEvents`,
`agentHistory`, `agents`, and `systemPrompt`.

- `src/live-provider.ts` queries/subscribes through `ctx.agentEvents`, uses
  `ctx.agents` for followup/steer/inject demonstrations, and registers prompt
  contributions through `ctx.systemPrompt`.
- `src/history-provider.ts` reads/tails `ctx.agentHistory`, imports the live
  event projector, and merges the JSONL-derived historical evidence with the
  live store.
- `src/index.ts` selects `live`, `historical`, or `fixture`, requests
  `agent.events.read`, `agent.history.read`, `agent.messages.append`,
  `agent.prompt.section`, and `agent.prompt.context`, and wires the route/page.
- `src/providers.ts` supplies deterministic fixtures that also expose mutation
  demos through the common store interface.

None of those legacy services or mutation demos are carried into this
design-validation repository. There is no historical compatibility mode.

## Independent repository boundary

This repository currently owns:

- versioned package and immutable package/runtime manifests;
- structured page, route, and session-header action contributions;
- Host-neutral Timeline model, filtering, grouping, and read-only body view;
- `TraceProvider` / `TraceShowcaseStore`, which are internal contract-neutral
  provider seams and do not define Host Session APIs;
- deterministic, explicitly labeled fixture provider;
- truthful unavailable provider for live mode;
- focused architecture, manifest, provider, model, registration, typecheck,
  build, and package gates.

It does not import Host-private code, use TDesign or Host selectors, create an
adapter/ledger, access a raw bridge, or depend on concrete `ctx.agentLoop`.

## NEED_API handoff

Contract owner task: `01a06193-0485-7bc1-a7f9-85cd7edc50a6`.

The plugin is waiting for the owner-provided Protocol/Host artifacts for:

1. a permission-scoped, read-only Session service that returns immutable
   snapshots of the authoritative append-only `SessionEvent` log and offers
   a post-commit subscription/cursor contract;
2. the necessary public `agent/*` live projections for status/lifecycle facts
   that are intentionally not durable Session events;
3. public capability identifiers/scopes and runtime availability semantics;
4. public TypeScript entrypoints consumable from an independent repository.

After handoff, the consumer belongs behind `TraceProvider` in a new focused
provider module. `src/react-view.tsx` must remain unaware of Host services.
`src/index.ts` may then add only the formal public injections and manifest
capabilities. It must not use `ctx.agentEvents`, `ctx.agentHistory`, concrete
`ctx.agentLoop`, private imports/casts, or a raw Electron/app-server bridge.

## Deferred owner actions

Until the formal API is integrated and real Playground verification succeeds:

- do not remove the built-in Host package or its tests;
- do not register both packages in one Host composition;
- do not update the Mono submodule pointer;
- do not publish npm artifacts;
- do not claim live, historical, Desktop, or real-Codex verification.
