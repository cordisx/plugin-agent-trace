# Repository Rules

## Ownership and boundaries

- Agent Trace consumes only documented, permission-scoped Host projections.
- Do not import Host-private modules, read a raw bridge, create an adapter or
  ledger, or claim generated rows are Session facts.
- The Host owns page chrome, routing behavior, controls, accessibility, DOM
  integration, and lifecycle fencing. The plugin owns only Timeline business
  projection and body composition.
- The read boundary is the public, read-only `ctx.sessions` / `SessionEvent`
  service.
- Do not consume alternate event/history services or Host-private transport
  contracts. `ctx.agents` owns create/resume/get and returns live Agent handles.
- Agent Trace consumes only `@cordisx/protocol/sessions/v1` and is honestly
  unavailable when the Host service, exact route permission, or subscription
  is unavailable or replaced.
- Every Session capability must be optional and dynamically bound by the Host
  to the active same-plugin route's exact `:sessionId`; never use an empty or
  wildcard scope.

## Delivery

- Keep `main` releasable and use `codex/` branches for feature work.
- Add focused tests for projection, manifest, lifecycle cleanup, packaging,
  and unavailable states.
- Run `npm run check`, `npm pack --dry-run`, and `git diff --check` before a
  checkpoint commit.
