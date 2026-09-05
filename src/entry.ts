import type { Context } from '@deepseek-ai/cordis'

export const SURFACE_CONTRIBUTION_V3_SCHEMA =
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v3.schema.json'

export const TRACE_SESSION_HEADER_ACTION = Object.freeze({
  $schema: SURFACE_CONTRIBUTION_V3_SCHEMA,
  schemaVersion: 3 as const,
  id: 'open-timeline' as const,
  surface: 'session.header.actions' as const,
  group: 'action' as const,
  order: 10 as const,
  item: Object.freeze({
    label: Object.freeze({
      namespace: 'agent-trace-showcase',
      key: 'action.open',
      fallback: 'Open Agent Trace Timeline',
    }),
    ariaLabel: Object.freeze({
      namespace: 'agent-trace-showcase',
      key: 'action.open',
      fallback: 'Open Agent Trace Timeline',
    }),
    icon: 'host:history' as const,
    route: Object.freeze({ id: 'session.timeline' as const }),
    routeBehavior: 'toggle' as const,
  }),
})

export interface SessionHeaderEntryAdapter {
  register(ctx: Context, contribution: typeof TRACE_SESSION_HEADER_ACTION): () => void
}

export const STRUCTURED_SESSION_HEADER_ENTRY: SessionHeaderEntryAdapter = Object.freeze({
  register: (ctx: Context, contribution: typeof TRACE_SESSION_HEADER_ACTION) =>
    ctx.slots.register({
      name: contribution.surface,
      id: contribution.id,
      group: contribution.group,
      order: contribution.order,
    }, contribution.item),
})
