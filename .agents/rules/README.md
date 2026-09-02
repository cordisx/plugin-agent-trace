# Repository Rules

## Ownership and boundaries

- Agent Trace consumes only documented, permission-scoped Host projections.
- Do not import Host-private modules, read a raw bridge, create an adapter or
  ledger, or claim fixture rows are Desktop Agent data.
- The Host owns page chrome, routing behavior, controls, accessibility, DOM
  integration, and lifecycle fencing. The plugin owns only Timeline business
  projection and body composition.
- The target read boundary is a public, read-only `ctx.sessions` / `SessionEvent`
  service plus only the `agent/*` live projections needed for presentation.
- Do not consume legacy `ctx.agentEvents` or concrete `ctx.agentLoop`.
  `ctx.agents` owns create/resume/get and returns live Agent handles;
  `ctx.agentLoop` is a Host concrete driver/factory provider.
- Live mode is honestly unavailable until the public Session contract exists.
- Fixture mode is an explicit deterministic demo and must never be described
  as Codex, Desktop, AgentLoop, persisted, or historical evidence.

## Delivery

- Keep `main` releasable and use `codex/` branches for feature work.
- Add focused tests for projection, manifest, lifecycle cleanup, packaging,
  and unavailable states.
- Run `npm run check`, `npm pack --dry-run`, and `git diff --check` before a
  checkpoint commit.
