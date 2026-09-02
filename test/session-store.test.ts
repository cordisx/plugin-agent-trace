import { describe, expect, it, vi } from 'vitest'
import type {
  Session,
  SessionEvent,
  SessionEventObserver,
  SessionEventPage,
  SessionRegistry,
  SessionSubscription,
  SessionSubscriptionCloseCode,
  SessionSubscriptionClosed,
  SessionSubscriptionPage,
} from '@cordisx/protocol/sessions/v1'
import { SessionTraceStore, projectSessionEvent } from '../src/session-store.js'

const schema = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-event.v1.schema.json' as const

function event(seq: number, type: SessionEvent['type'], data: unknown): SessionEvent {
  return {
    $schema: schema,
    contract: 'cordisx.session-event/v1',
    schemaVersion: 1,
    sessionId: 'session-a',
    seq,
    time: Date.UTC(2026, 0, 1, 0, 0, seq),
    type,
    data,
  } as unknown as SessionEvent
}

function page(afterSeq: number, snapshotSeq: number, events: readonly SessionEvent[]): SessionEventPage {
  const nextAfterSeq = events.at(-1)?.seq ?? afterSeq
  return {
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-event-page.v1.schema.json',
    contract: 'cordisx.session-event-page/v1',
    schemaVersion: 1,
    sessionId: 'session-a',
    sessionGeneration: 4,
    afterSeq,
    snapshotSeq,
    events,
    nextAfterSeq,
    hasMore: nextAfterSeq < snapshotSeq,
  }
}

function subscriptionPage(
  phase: 'replay' | 'live',
  replayThrough: number,
  events: readonly SessionEvent[],
): SessionSubscriptionPage {
  return {
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-subscription-page.v1.schema.json',
    contract: 'cordisx.session-subscription-page/v1',
    schemaVersion: 1,
    sessionId: 'session-a',
    sessionGeneration: 4,
    subscriptionGeneration: 9,
    replayThrough,
    phase,
    events,
  }
}

function subscriptionClosed(code: SessionSubscriptionCloseCode): SessionSubscriptionClosed {
  return {
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-subscription-close.v1.schema.json',
    contract: 'cordisx.session-subscription-close/v1',
    schemaVersion: 1,
    sessionId: 'session-a',
    sessionGeneration: 4,
    subscriptionGeneration: 9,
    status: 'closed',
    code,
  }
}

function sessionHarness(input: {
  readonly snapshotSeq?: number
  readonly pages?: readonly SessionEventPage[]
  readonly replay?: readonly SessionEvent[]
  readonly subscribeUnavailable?: true
} = {}) {
  const snapshotSeq = input.snapshotSeq ?? -1
  const pages = [...(input.pages ?? [])]
  const replay = input.replay ?? []
  let observer: SessionEventObserver | undefined
  let resolveClosed: (closed: SessionSubscriptionClosed) => void = () => {}
  const closed = new Promise<SessionSubscriptionClosed>(resolve => { resolveClosed = resolve })
  const close = (code: SessionSubscriptionCloseCode) => resolveClosed(subscriptionClosed(code))
  const unsubscribe = vi.fn(async () => {
    close('unsubscribed')
    return closed
  })
  const subscription = {
    sessionId: 'session-a',
    sessionGeneration: 4,
    subscriptionGeneration: 9,
    replayThrough: replay.at(-1)?.seq ?? snapshotSeq,
    closed,
    unsubscribe,
  } as unknown as SessionSubscription
  const read = vi.fn(async () => ({ status: 'available' as const, page: pages.shift()! }))
  const subscribe = vi.fn(async (_request, callback: SessionEventObserver) => {
    observer = callback
    if (input.subscribeUnavailable) return { status: 'unavailable' as const, code: 'host-unavailable' as const }
    if (replay.length !== 0) await callback(subscriptionPage('replay', subscription.replayThrough, replay))
    return { status: 'subscribed' as const, subscription }
  })
  const session = {
    id: 'session-a',
    generation: 4,
    header: { id: 'session-a', formatVersion: 1, createdAt: 1, isSeeded: false },
    snapshot: vi.fn(async () => ({
      status: 'available' as const,
      snapshot: {
        $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-snapshot.v1.schema.json' as const,
        contract: 'cordisx.session-snapshot/v1' as const,
        schemaVersion: 1 as const,
        sessionId: 'session-a',
        sessionGeneration: 4,
        header: { id: 'session-a', formatVersion: 1, createdAt: 1, isSeeded: false },
        snapshotSeq,
      },
    })),
    read,
    subscribe,
  } as unknown as Session
  const sessions = { get: vi.fn(async () => session) } as SessionRegistry
  return { sessions, session, read, subscribe, subscription, unsubscribe, close, observer: () => observer }
}

describe('SessionTraceStore', () => {
  it('pins immutable read pages, accepts atomic replay, then appends contiguous live facts', async () => {
    const initial = [
      event(0, 'turn/start', { turn: 1 }),
      event(1, 'user/message', { id: 'message-user', role: 'user', content: [{ type: 'text', text: 'Inspect this' }], source: { kind: 'user' } }),
      event(2, 'assistant/message', { turn: 1, step: 1, message: { id: 'message-assistant', role: 'assistant', content: [{ type: 'text', text: 'Done' }], source: { kind: 'model', provider: 'openai', model: 'codex' } } }),
    ]
    const harness = sessionHarness({
      snapshotSeq: 2,
      pages: [page(-1, 2, initial.slice(0, 2)), page(1, 2, initial.slice(2))],
      replay: [event(3, 'tool/call', { turn: 1, step: 1, callId: 'call-1', name: 'read_file', arguments: '{}' })],
    })
    const store = new SessionTraceStore(harness.sessions, 'session-a', 50)
    await store.settled()

    expect(harness.read.mock.calls).toEqual([
      [{ afterSeq: -1, limit: 50, snapshotSeq: 2 }],
      [{ afterSeq: 1, limit: 50, snapshotSeq: 2 }],
    ])
    expect(harness.subscribe.mock.calls[0]?.[0]).toEqual({ afterSeq: 2, pageSize: 50 })
    expect(store.getSnapshot().status).toMatchObject({ mode: 'available', contractVersion: 'cordisx.session-event/v1' })
    expect(store.getSnapshot().events.map(item => [item.seq, item.type])).toEqual([
      [0, 'turn/start'],
      [1, 'user/message'],
      [2, 'assistant/message'],
      [3, 'tool/call'],
    ])

    await harness.observer()!(subscriptionPage('live', 3, [
      event(4, 'approval/asked', { id: 'approval-1', toolName: 'read_file' }),
      event(5, 'approval/decided', { id: 'approval-1', outcome: 'allowed-once' }),
    ]))
    expect(store.getSnapshot().events.at(-1)).toMatchObject({ seq: 5, type: 'approval/decided', phase: 'completed' })
    store.dispose()
    expect(harness.unsubscribe).toHaveBeenCalledOnce()
  })

  it('fails closed and clears rows on a sequence or generation fence violation', async () => {
    const harness = sessionHarness({
      snapshotSeq: 1,
      pages: [page(-1, 1, [event(0, 'turn/start', { turn: 1 }), event(2, 'turn/end', { turn: 1, reason: { kind: 'completed' } })])],
    })
    const store = new SessionTraceStore(harness.sessions, 'session-a', 50)
    await store.settled()
    expect(store.getSnapshot()).toMatchObject({
      events: [],
      status: { mode: 'unavailable', diagnostics: ['session-event-sequence-violation'] },
    })
  })

  it.each([
    'route-replaced',
    'session-replaced',
    'plugin-generation-replaced',
    'permission-revoked',
    'connection-replaced',
  ] satisfies readonly SessionSubscriptionCloseCode[])('fails closed when the Host terminates an active subscription with %s', async code => {
    const harness = sessionHarness()
    const store = new SessionTraceStore(harness.sessions, 'session-a', 50)
    await store.settled()
    expect(store.getSnapshot().status.mode).toBe('available')

    harness.close(code)
    await Promise.resolve()

    expect(store.getSnapshot()).toMatchObject({
      events: [],
      status: { mode: 'unavailable', diagnostics: [`session-subscription-closed:${code}`] },
    })
  })

  it('rejects a read page that claims progress without delivering an event', async () => {
    const stalled = { ...page(-1, 0, []), hasMore: true } as SessionEventPage
    const harness = sessionHarness({ snapshotSeq: 0, pages: [stalled] })
    const store = new SessionTraceStore(harness.sessions, 'session-a', 50)
    await store.settled()
    expect(store.getSnapshot()).toMatchObject({
      events: [],
      status: { mode: 'unavailable', diagnostics: ['session-read-no-progress'] },
    })
  })

  it('skips only explicit ignorable extensions and rejects required unknown variants', async () => {
    const ignorable = { ...event(0, 'turn/start', { turn: 1 }), type: 'vendor/hint', data: {}, ignorable: true } as unknown as SessionEvent
    const acceptedHarness = sessionHarness({ snapshotSeq: 0, pages: [page(-1, 0, [ignorable])] })
    const accepted = new SessionTraceStore(acceptedHarness.sessions, 'session-a', 50)
    await accepted.settled()
    expect(accepted.getSnapshot()).toMatchObject({
      events: [],
      status: { mode: 'available' },
      range: { totalAvailable: 1 },
    })

    const required = { ...ignorable, ignorable: undefined } as unknown as SessionEvent
    const rejectedHarness = sessionHarness({ snapshotSeq: 0, pages: [page(-1, 0, [required])] })
    const rejected = new SessionTraceStore(rejectedHarness.sessions, 'session-a', 50)
    await rejected.settled()
    expect(rejected.getSnapshot()).toMatchObject({
      events: [],
      status: { mode: 'unavailable', diagnostics: ['unknown-required-event'] },
    })
  })

  it('keeps missing, unauthorized, and unavailable capabilities as honest empty states', async () => {
    const missing = new SessionTraceStore({ get: vi.fn(async () => undefined) }, 'session-a', 50)
    await missing.settled()
    expect(missing.getSnapshot()).toMatchObject({ events: [], status: { mode: 'unavailable', diagnostics: ['session-missing-or-unauthorized'] } })

    const harness = sessionHarness({ subscribeUnavailable: true })
    const unavailable = new SessionTraceStore(harness.sessions, 'session-a', 50)
    await unavailable.settled()
    expect(unavailable.getSnapshot()).toMatchObject({ events: [], status: { mode: 'unavailable', diagnostics: ['session-subscribe-unavailable:host-unavailable'] } })
  })
})

describe('SessionEvent projection', () => {
  it('projects every durable core variant from the formal v1 vocabulary', () => {
    const variants: readonly [SessionEvent['type'], unknown][] = [
      ['turn/start', { turn: 1 }],
      ['turn/end', { turn: 1, reason: { kind: 'completed' } }],
      ['step/start', { turn: 1, step: 1 }],
      ['step/end', { turn: 1, step: 1 }],
      ['user/message', { id: 'user-1', role: 'user', content: [{ type: 'text', text: 'Hello' }], source: { kind: 'user' } }],
      ['assistant/chunk', { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'Hi' } }],
      ['assistant/message', { turn: 1, step: 1, message: { id: 'assistant-1', role: 'assistant', content: [{ type: 'text', text: 'Hi' }], source: { kind: 'model', provider: 'openai', model: 'codex' } } }],
      ['tool/call', { turn: 1, step: 1, callId: 'call-1', name: 'read_file', arguments: '{}' }],
      ['tool/result', { turn: 1, step: 1, message: { id: 'tool-1', role: 'user', content: [{ type: 'tool-result', toolCallId: 'call-1', content: [{ type: 'text', text: 'ok' }] }], source: { kind: 'tool', callId: 'call-1' } } }],
      ['request/header', { header: { config: { provider: 'openai', model: 'codex' } }, reason: 'initial' }],
      ['request/context', { provider: 'openai', model: 'codex', contextWindow: 128_000 }],
      ['agent/inbox/spliced', { target: 'next-step', start: 0, inserted: [] }],
      ['approval/asked', { id: 'approval-1', toolName: 'read_file', callId: 'call-1' }],
      ['approval/decided', { id: 'approval-1', outcome: 'allowed-once' }],
      ['session/end-seed', {}],
    ]

    expect(variants.map(([type, data], seq) => projectSessionEvent(event(seq, type, data))?.type)).toEqual(
      variants.map(([type]) => type),
    )
  })

  it('uses public SessionEvent data without manufacturing terminal causation', () => {
    expect(projectSessionEvent(event(0, 'agent/inbox/spliced', {
      target: 'next-step', start: 0, inserted: [],
    }))).toMatchObject({
      lane: 'injection',
      semanticType: 'agent/inbox/spliced',
      payload: { target: 'next-step', start: 0, inserted: [] },
    })
  })
})
