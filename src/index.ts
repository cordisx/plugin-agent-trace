import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type { HostRouteSessionScopeBinding, SessionRegistry } from '@cordisx/protocol/sessions/v1'
import { defineReactPage } from 'cordisx/react'
import {
  CORDISX_PAGE_SCHEMA_V3,
  CORDISX_ROUTE_SCHEMA_V2,
  type CordisXPageMetadataV3,
  type CordisXPluginPresentation,
  type CordisXRouteDefinitionV2,
} from 'cordisx/contracts'
import {
  type SessionHeaderEntryAdapter,
  STRUCTURED_SESSION_HEADER_ENTRY,
  TRACE_SESSION_HEADER_ACTION,
} from './entry.js'
import { SessionTraceStore } from './session-store.js'
import { UnavailableTraceStore } from './unavailable-store.js'
import { createTraceReactPage } from './react-view.js'
import type { TraceShowcaseStore } from './types.js'

export const name = 'agent-trace-showcase'
export const inject = ['i18n', 'pages', 'routes', 'slots', 'sessions']

function text(key: string, fallback: string) {
  return Object.freeze({ namespace: 'agent-trace-showcase', key, fallback } as const)
}

export const presentation = Object.freeze(
  {
    name: text('plugin.name', 'Agent Trace Showcase'),
    description: text('plugin.description', 'Read-only Timeline of Host-projected Agent session events.'),
  } satisfies CordisXPluginPresentation,
)

export const TRACE_SESSION_PAGE_METADATA = Object.freeze(
  {
    $schema: CORDISX_PAGE_SCHEMA_V3,
    schemaVersion: 3,
    id: 'session.timeline',
    title: text('page.timeline.title', 'Agent Trace Timeline'),
    description: text(
      'page.timeline.description',
      'Inspect the read-only Host projection for the active Agent session.',
    ),
    icon: 'host:history',
    chrome: 'body-only',
  } satisfies CordisXPageMetadataV3,
)

export const TRACE_SESSION_ROUTE_DEFINITION = Object.freeze(
  {
    $schema: CORDISX_ROUTE_SCHEMA_V2,
    schemaVersion: 2,
    id: 'session.timeline',
    path: '/sessions/:sessionId/agent-trace',
    outlet: 'session.content',
    page: 'session.timeline',
    title: text('route.timeline.title', 'Open Agent Trace'),
    description: text('route.timeline.description', 'Open the read-only Agent Trace Timeline for the active session.'),
  } satisfies CordisXRouteDefinitionV2<'session.content'>,
)

export interface Config {
  readonly timelineWindowSize: number
}

export const Config = Schema.object({
  timelineWindowSize: Schema.natural().default(500).min(50).max(500).step(50)
    .extra('extra', { label: { en: 'Timeline window size', 'zh-CN': '时间线窗口大小' } }),
})

export const configApplies = 'restart' as const

const CORDISX_PLUGIN_MANIFEST_SCHEMA_V5 =
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v5.schema.json' as const
const SESSION_ROUTE_SCOPE = Object.freeze(
  {
    kind: 'host-route-param',
    routeId: TRACE_SESSION_ROUTE_DEFINITION.id,
    param: 'sessionId',
  } as const satisfies HostRouteSessionScopeBinding,
)

function sessionCapability(name: 'sessions.get' | 'sessions.read' | 'sessions.subscribe') {
  return Object.freeze(
    {
      name,
      required: false,
      scope: Object.freeze({ sessionIds: SESSION_ROUTE_SCOPE }),
      rationale: Object.freeze({
        title: text('permission.sessions.title', 'Read this Agent session'),
        description: text(
          'permission.sessions.description',
          'Read permission-filtered durable events for the Agent session in the active Host route.',
        ),
        feature: text('permission.sessions.feature', 'Shows the read-only Agent Trace Timeline.'),
        deniedBehavior: text(
          'permission.sessions.denied',
          'The Timeline stays empty and reports that live Session data is unavailable.',
        ),
      }),
      security: Object.freeze(
        {
          dataUse: 'ephemeral',
          retention: 'runtime',
          externalTransfer: false,
        } as const,
      ),
    } as const,
  )
}

export const manifest = Object.freeze(
  {
    $schema: CORDISX_PLUGIN_MANIFEST_SCHEMA_V5,
    schemaVersion: 5,
    id: 'agent-trace-showcase',
    name: 'Agent Trace Showcase',
    capabilities: Object.freeze([
      sessionCapability('sessions.get'),
      sessionCapability('sessions.read'),
      sessionCapability('sessions.subscribe'),
    ]),
    services: Object.freeze([]),
  } as const,
)

export type AgentTraceShowcaseConfig = Config

export function configFrom(value: unknown): AgentTraceShowcaseConfig {
  return Config(value === null || typeof value !== 'object' || Array.isArray(value) ? {} : value)
}

export function createTraceShowcaseStore(
  config: AgentTraceShowcaseConfig,
  routeSessionId?: string,
  sessions?: SessionRegistry,
): TraceShowcaseStore {
  if (routeSessionId === undefined) {
    return new UnavailableTraceStore(undefined, config.timelineWindowSize, 'host-session-id-unavailable')
  }
  if (sessions === undefined) {
    return new UnavailableTraceStore(routeSessionId, config.timelineWindowSize, 'session-service-unavailable')
  }
  return new SessionTraceStore(sessions, routeSessionId, config.timelineWindowSize)
}

export type AgentTraceContext = Context & { readonly sessions?: SessionRegistry }

export function installAgentTraceShowcase(
  ctx: AgentTraceContext,
  rawConfig: unknown,
  entry: SessionHeaderEntryAdapter = STRUCTURED_SESSION_HEADER_ENTRY,
): void {
  const config = configFrom(rawConfig)
  ctx.i18n.define({
    namespace: 'agent-trace-showcase',
    locale: 'en',
    default: true,
    messages: {
      'plugin.name': 'Agent Trace Showcase',
      'plugin.description': 'Read-only Timeline of Host-projected Agent session events.',
      'action.open': 'Open Agent Trace Timeline',
      'route.timeline.title': 'Open Agent Trace',
      'route.timeline.description': 'Open the read-only Agent Trace Timeline for the active session.',
      'page.timeline.title': 'Agent Trace Timeline',
      'page.timeline.description': 'Inspect the read-only Host projection for the active Agent session.',
      'permission.sessions.title': 'Read this Agent session',
      'permission.sessions.description':
        'Read permission-filtered durable events for the Agent session in the active Host route.',
      'permission.sessions.feature': 'Shows the read-only Agent Trace Timeline.',
      'permission.sessions.denied': 'The Timeline stays empty and reports that live Session data is unavailable.',
    },
  })
  ctx.i18n.define({
    namespace: 'agent-trace-showcase',
    locale: 'zh-CN',
    messages: {
      'plugin.name': 'Agent Trace 展示',
      'plugin.description': '查看 Host 投影的只读 Agent 会话时间线。',
      'action.open': '打开 Agent Trace 时间线',
      'route.timeline.title': '打开 Agent Trace',
      'route.timeline.description': '打开当前会话的只读 Agent Trace 时间线。',
      'page.timeline.title': 'Agent Trace 时间线',
      'page.timeline.description': '查看当前 Agent 会话的只读 Host 投影。',
      'permission.sessions.title': '读取当前 Agent 会话',
      'permission.sessions.description': '读取当前 Host 路由内 Agent 会话经过权限过滤的持久事件。',
      'permission.sessions.feature': '显示只读 Agent Trace 时间线。',
      'permission.sessions.denied': '时间线保持为空，并明确显示实时 Session 数据不可用。',
    },
  })
  ctx.pages.register(
    TRACE_SESSION_PAGE_METADATA,
    defineReactPage(createTraceReactPage(sessionId => {
      if (sessionId === undefined) {
        return new UnavailableTraceStore(undefined, config.timelineWindowSize, 'host-session-id-unavailable')
      }
      return createTraceShowcaseStore(config, sessionId, ctx.sessions)
    })),
  )
  ctx.routes.register(TRACE_SESSION_ROUTE_DEFINITION)
  ctx.effect(() => entry.register(ctx, TRACE_SESSION_HEADER_ACTION), 'agent-trace-showcase: session header entry')
}

export function apply(ctx: AgentTraceContext, config: unknown): void {
  installAgentTraceShowcase(ctx, config)
}

export type * from './types.js'
export { projectSessionEvent, SessionTraceStore } from './session-store.js'
export { UnavailableTraceStore } from './unavailable-store.js'
export {
  type SessionHeaderEntryAdapter,
  STRUCTURED_SESSION_HEADER_ENTRY,
  TRACE_SESSION_HEADER_ACTION,
} from './entry.js'
