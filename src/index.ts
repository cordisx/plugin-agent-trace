import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { defineReactPage } from 'cordisx/react'
import {
  CORDISX_PAGE_SCHEMA_V3,
  CORDISX_PLUGIN_MANIFEST_SCHEMA_V1,
  CORDISX_ROUTE_SCHEMA_V2,
  type CordisXPageMetadataV3,
  type CordisXPluginManifestV1,
  type CordisXPluginPresentation,
  type CordisXRouteDefinitionV2,
} from 'cordisx/contracts'
import { STRUCTURED_SESSION_HEADER_ENTRY, TRACE_SESSION_HEADER_ACTION, type SessionHeaderEntryAdapter } from './entry.js'
import { FixtureTraceProvider, UnavailableTraceProvider, UnavailableTraceStore } from './providers.js'
import { createTraceReactPage } from './react-view.js'
import type { TraceProvider, TraceShowcaseStore } from './types.js'

export const name = 'agent-trace-showcase'
export const inject = ['i18n', 'pages', 'routes', 'slots']

function text(key: string, fallback: string) {
  return Object.freeze({ namespace: 'agent-trace-showcase', key, fallback } as const)
}

export const presentation = Object.freeze({
  name: text('plugin.name', 'Agent Trace Showcase'),
  description: text('plugin.description', 'Read-only Timeline of Host-projected Agent session events.'),
} satisfies CordisXPluginPresentation)

export const TRACE_SESSION_PAGE_METADATA = Object.freeze({
  $schema: CORDISX_PAGE_SCHEMA_V3,
  schemaVersion: 3,
  id: 'session.timeline',
  title: text('page.timeline.title', 'Agent Trace Timeline'),
  description: text('page.timeline.description', 'Inspect the read-only Host projection for the active Agent session.'),
  icon: 'host:history',
  chrome: 'body-only',
} satisfies CordisXPageMetadataV3)

export const TRACE_SESSION_ROUTE_DEFINITION = Object.freeze({
  $schema: CORDISX_ROUTE_SCHEMA_V2,
  schemaVersion: 2,
  id: 'session.timeline',
  path: '/sessions/:sessionId/agent-trace',
  outlet: 'session.content',
  page: 'session.timeline',
  title: text('route.timeline.title', 'Open Agent Trace'),
  description: text('route.timeline.description', 'Open the read-only Agent Trace Timeline for the active session.'),
} satisfies CordisXRouteDefinitionV2<'session.content'>)

export interface Config {
  readonly mode: 'live' | 'fixture'
  readonly timelineWindowSize: number
}

export const Config = Schema.object({
  mode: Schema.union([Schema.const('live'), Schema.const('fixture')]).default('live')
    .extra('extra', { label: { en: 'Data mode', 'zh-CN': '数据模式' } })
    .extra('description', {
      en: 'Use the future read-only Session projection, or the explicit fixture demo.',
      'zh-CN': '使用未来的只读 Session 投影，或明确标注的 fixture demo。',
    }),
  timelineWindowSize: Schema.natural().default(500).min(50).max(500).step(50)
    .extra('extra', { label: { en: 'Timeline window size', 'zh-CN': '时间线窗口大小' } }),
})

export const configApplies = 'restart' as const

export const manifest = Object.freeze({
  $schema: CORDISX_PLUGIN_MANIFEST_SCHEMA_V1,
  schemaVersion: 1,
  id: 'agent-trace-showcase',
  name: 'Agent Trace Showcase',
  capabilities: [],
} as const satisfies CordisXPluginManifestV1)

export type AgentTraceShowcaseConfig = Config

export function configFrom(value: unknown): AgentTraceShowcaseConfig {
  return Config(value === null || typeof value !== 'object' || Array.isArray(value) ? {} : value)
}

export function createTraceShowcaseStore(
  config: AgentTraceShowcaseConfig,
  routeSessionId?: string,
): TraceShowcaseStore {
  if (routeSessionId === undefined) return new UnavailableTraceStore(undefined, config.timelineWindowSize, 'host-session-id-unavailable')
  return createTraceProvider(config).open(routeSessionId)
}

export function createTraceProvider(config: AgentTraceShowcaseConfig): TraceProvider {
  if (config.mode === 'fixture') return new FixtureTraceProvider(config.timelineWindowSize)
  return new UnavailableTraceProvider(
    config.timelineWindowSize,
    'NEED_API: public read-only ctx.sessions/SessionEvent and permission-scoped agent/* projections are not available',
  )
}

export function installAgentTraceShowcase(
  ctx: Context,
  rawConfig: unknown,
  entry: SessionHeaderEntryAdapter = STRUCTURED_SESSION_HEADER_ENTRY,
): void {
  const config = configFrom(rawConfig)
  ctx.i18n.define({
    namespace: 'agent-trace-showcase', locale: 'en', default: true,
    messages: {
      'plugin.name': 'Agent Trace Showcase',
      'plugin.description': 'Read-only Timeline of Host-projected Agent session events.',
      'action.open': 'Open Agent Trace Timeline',
      'route.timeline.title': 'Open Agent Trace',
      'route.timeline.description': 'Open the read-only Agent Trace Timeline for the active session.',
      'page.timeline.title': 'Agent Trace Timeline',
      'page.timeline.description': 'Inspect the read-only Host projection for the active Agent session.',
    },
  })
  ctx.i18n.define({
    namespace: 'agent-trace-showcase', locale: 'zh-CN',
    messages: {
      'plugin.name': 'Agent Trace 展示',
      'plugin.description': '查看 Host 投影的只读 Agent 会话时间线。',
      'action.open': '打开 Agent Trace 时间线',
      'route.timeline.title': '打开 Agent Trace',
      'route.timeline.description': '打开当前会话的只读 Agent Trace 时间线。',
      'page.timeline.title': 'Agent Trace 时间线',
      'page.timeline.description': '查看当前 Agent 会话的只读 Host 投影。',
    },
  })
  ctx.pages.register(
    TRACE_SESSION_PAGE_METADATA,
    defineReactPage(createTraceReactPage(sessionId => createTraceShowcaseStore(config, sessionId))),
  )
  ctx.routes.register(TRACE_SESSION_ROUTE_DEFINITION)
  ctx.effect(() => entry.register(ctx, TRACE_SESSION_HEADER_ACTION), 'agent-trace-showcase: session header entry')
}

export function apply(ctx: Context, config: unknown): void {
  installAgentTraceShowcase(ctx, config)
}

export type * from './types.js'
export { FixtureTraceProvider, FixtureTraceStore, UnavailableTraceProvider, UnavailableTraceStore } from './providers.js'
export { STRUCTURED_SESSION_HEADER_ENTRY, TRACE_SESSION_HEADER_ACTION, type SessionHeaderEntryAdapter } from './entry.js'
