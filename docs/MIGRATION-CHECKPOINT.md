# Agent Trace migration checkpoint

Date: 2026-09-02

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
  `@cordisx/protocol/sessions/v1`, performs immutable snapshot paging, atomic
  replay/live subscription, and fail-closed generation/terminal fencing;
- truthful unavailable state whenever the public Session service or exact
  route-bound permission is absent;
- focused architecture, manifest, model, registration, typecheck,
  build, and package gates.

It does not import Host-private code, use TDesign or Host selectors, create an
adapter/ledger, access a raw bridge, or depend on concrete `ctx.agentLoop`.

## PROTOCOL_READY handoff

Contract owner task: `01a06193-0485-7bc1-a7f9-85cd7edc50a6`.

Formal Protocol dependency:

- repository: `CordisX/cordisx-protocol`;
- main commit: `3e3f248abb94fe57e613b020ffa8a6ceaba6c3cd`;
- pull request: `https://github.com/cordisx/cordisx-protocol/pull/73`;
- public entrypoint: `@cordisx/protocol/sessions/v1`;
- status: merged to remote main with successful CI and fresh-clone readback;
  not yet pinned by Mono.

The consumer lives in `src/session-store.ts`.
`src/react-view.tsx` remains unaware of Host services. `src/index.ts` declares
only the formal `sessions` injection and the optional v5
`sessions.get/read/subscribe` capabilities, all bound to the same-plugin
`session.timeline` route's exact `:sessionId`.

No `agent/*` live subscription is currently necessary: every fact rendered by
the Timeline is a durable `SessionEvent`. If a future UI requirement needs a
non-durable live fact, it must use the separate formal Agent subscription and
must never manufacture a durable cursor or ledger.

## Deferred owner actions

Until Protocol is distributed, Host implements the public service, and real
integration verification succeeds:

- do not remove the built-in Host package or its tests;
- do not register both packages in one Host composition;
- do not update the Mono submodule pointer;
- do not publish npm artifacts;
- do not claim real runtime verification.

The declared Git dependency and lockfile resolve the exact formal Protocol
main commit from GitHub.
