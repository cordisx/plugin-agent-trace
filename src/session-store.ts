import type {
  ContentBlock,
  SessionEvent,
  SessionEventPage,
  SessionId,
  SessionRegistry,
  SessionSeqCursor,
  SessionSubscription,
  SessionSubscriptionClosed,
  SessionSubscriptionPage,
  UserMessage,
} from '@cordisx/protocol/sessions/v1'
import type {
  TraceEvent,
  TraceLane,
  TracePhase,
  TraceShowcaseStore,
  TraceSnapshot,
  TraceSource,
} from './types.js'

const SESSION_CONTRACT = 'cordisx.session-event/v1'
const FIRST_CURSOR: SessionSeqCursor = -1

class SessionProjectionError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

function textContent(content: readonly ContentBlock[]): string | undefined {
  const value = content
    .flatMap(block => block.type === 'text' || block.type === 'reasoning' ? [block.text] : [])
    .join(' ')
    .trim()
  if (value === '') return undefined
  return value.length <= 160 ? value : `${value.slice(0, 157)}…`
}

function messageSource(sessionId: SessionId, message: UserMessage): TraceSource {
  if (message.source.kind === 'plugin') {
    return Object.freeze({ kind: 'plugin', id: message.source.pluginId, label: `Plugin ${message.source.pluginId}` })
  }
  return Object.freeze({ kind: 'session', id: sessionId, label: 'Session user input' })
}

function sessionSource(sessionId: SessionId): TraceSource {
  return Object.freeze({ kind: 'session', id: sessionId, label: 'Host Session authority' })
}

function modelSource(provider: string, model: string): TraceSource {
  return Object.freeze({ kind: 'model', id: `${provider}:${model}`, label: `${provider} / ${model}` })
}

function toolSource(name: string): TraceSource {
  return Object.freeze({ kind: 'tool', id: name, label: name })
}

function lifecyclePhase(event: SessionEvent): TracePhase | undefined {
  switch (event.type) {
    case 'turn/start':
    case 'step/start': return 'started'
    case 'turn/end':
    case 'step/end': return 'completed'
    case 'approval/asked': return 'requested'
    case 'approval/decided': return event.data.outcome === 'unavailable' ? 'failed' : 'completed'
    case 'session/end-seed': return 'closed'
    default: return undefined
  }
}

function lane(event: SessionEvent): TraceLane {
  switch (event.type) {
    case 'user/message': return 'input'
    case 'agent/inbox/spliced': return 'injection'
    case 'tool/call':
    case 'tool/result':
    case 'approval/asked':
    case 'approval/decided': return 'tools'
    default: return 'model'
  }
}

function source(event: SessionEvent): TraceSource {
  switch (event.type) {
    case 'user/message': return messageSource(event.sessionId, event.data)
    case 'assistant/message': return modelSource(event.data.message.source.provider, event.data.message.source.model)
    case 'request/header': return modelSource(event.data.header.config.provider, event.data.header.config.model)
    case 'request/context': return modelSource(event.data.provider, event.data.model)
    case 'tool/call': return toolSource(event.data.name)
    case 'tool/result': return toolSource(event.data.message.source.callId)
    default: return sessionSource(event.sessionId)
  }
}

function summary(event: SessionEvent): string {
  switch (event.type) {
    case 'turn/start': return `Turn ${event.data.turn} started.`
    case 'turn/end': return `Turn ${event.data.turn} ended: ${event.data.reason.kind}.`
    case 'step/start': return `Step ${event.data.step} started in turn ${event.data.turn}.`
    case 'step/end': return `Step ${event.data.step} ended in turn ${event.data.turn}.`
    case 'user/message': return textContent(event.data.content) ?? 'User message committed.'
    case 'assistant/chunk': return `Assistant ${event.data.chunk.type} committed.`
    case 'assistant/message': return textContent(event.data.message.content) ?? 'Assistant message committed.'
    case 'tool/call': return `Tool call committed: ${event.data.name}.`
    case 'tool/result': return `Tool result committed: ${event.data.message.source.callId}.`
    case 'request/header': return `Request header committed for ${event.data.header.config.provider}/${event.data.header.config.model}.`
    case 'request/context': return `Request context committed for ${event.data.provider}/${event.data.model}.`
    case 'agent/inbox/spliced': return `Agent ${event.data.target} inbox changed.`
    case 'approval/asked': return `Approval requested for ${event.data.toolName}.`
    case 'approval/decided': return `Approval ${event.data.outcome}.`
    case 'session/end-seed': return 'Persisted Session seed ended.'
    default: return unknownEvent(event)
  }
}

function unknownEvent(event: unknown): never {
  if (typeof event === 'object' && event !== null && 'ignorable' in event && event.ignorable === true) {
    throw new SessionProjectionError('ignorable-extension')
  }
  throw new SessionProjectionError('unknown-required-event')
}

function turnId(event: SessionEvent): string | undefined {
  switch (event.type) {
    case 'turn/start':
    case 'turn/end':
    case 'step/start':
    case 'step/end':
    case 'assistant/chunk':
    case 'assistant/message':
    case 'tool/call':
    case 'tool/result': return String(event.data.turn)
    default: return undefined
  }
}

function stepId(event: SessionEvent): string | undefined {
  switch (event.type) {
    case 'step/start':
    case 'step/end':
    case 'assistant/chunk':
    case 'assistant/message':
    case 'tool/call':
    case 'tool/result': return String(event.data.step)
    default: return undefined
  }
}

/** Project one durable public SessionEvent. Unknown ignorable extensions return undefined. */
export function projectSessionEvent(event: SessionEvent): TraceEvent | undefined {
  let eventSummary: string
  try {
    eventSummary = summary(event)
  } catch (error: unknown) {
    if (error instanceof SessionProjectionError && error.code === 'ignorable-extension') return undefined
    throw error
  }
  const phase = lifecyclePhase(event)
  const turn = turnId(event)
  const step = stepId(event)
  const messageId = event.type === 'user/message'
    ? event.data.id
    : event.type === 'assistant/message'
      ? event.data.message.id
      : event.type === 'tool/result'
        ? event.data.message.id
        : undefined
  const toolCallId = event.type === 'tool/call'
    ? event.data.callId
    : event.type === 'tool/result'
      ? event.data.message.source.callId
      : undefined
  return Object.freeze({
    id: `session:${event.sessionId}:${event.seq}`,
    sessionId: event.sessionId,
    seq: event.seq,
    recordedAt: new Date(event.time).toISOString(),
    lane: lane(event),
    type: event.type,
    semanticType: event.type,
    ...(phase === undefined ? {} : { phase }),
    summary: eventSummary,
    source: source(event),
    ...(turn === undefined ? {} : { turnId: turn }),
    ...(step === undefined ? {} : { stepId: step }),
    ...(messageId === undefined ? {} : { messageId }),
    ...(toolCallId === undefined ? {} : { toolCallId }),
    payload: event.data,
  })
}

function unavailable(sessionId: string, windowSize: number, diagnostic: string): TraceSnapshot {
  return Object.freeze({
    sessionId,
    events: Object.freeze([]),
    status: Object.freeze({
      mode: 'unavailable',
      completeness: 'unavailable',
      diagnostics: Object.freeze([diagnostic]),
      readOnly: true,
    }),
    range: Object.freeze({ loaded: 0, renderedLimit: windowSize }),
  })
}

export class SessionTraceStore implements TraceShowcaseStore {
  private readonly listeners = new Set<() => void>()
  private readonly startPromise: Promise<void>
  private snapshot: TraceSnapshot
  private events: readonly TraceEvent[] = Object.freeze([])
  private cursor: SessionSeqCursor = FIRST_CURSOR
  private subscription: SessionSubscription | undefined
  private sessionGeneration?: number
  private subscriptionGeneration?: number
  private replayThrough?: SessionSeqCursor
  private phase: 'replay' | 'live' = 'replay'
  private disposed = false

  constructor(
    private readonly sessions: SessionRegistry,
    private readonly sessionId: string,
    private readonly windowSize: number,
  ) {
    this.snapshot = unavailable(sessionId, windowSize, 'session-store-initializing')
    this.startPromise = this.start()
  }

  getSnapshot(): TraceSnapshot { return this.snapshot }

  subscribe(listener: () => void): () => void {
    if (this.disposed) return () => {}
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    const subscription = this.subscription
    this.subscription = undefined
    this.listeners.clear()
    if (subscription !== undefined) void subscription.unsubscribe()
  }

  async settled(): Promise<void> {
    await this.startPromise
  }

  private notify(): void {
    if (!this.disposed) for (const listener of this.listeners) listener()
  }

  private fail(diagnostic: string): void {
    if (this.disposed) return
    this.events = Object.freeze([])
    this.snapshot = unavailable(this.sessionId, this.windowSize, diagnostic)
    this.notify()
  }

  private publish(): void {
    if (this.disposed) return
    this.snapshot = Object.freeze({
      sessionId: this.sessionId,
      events: this.events,
      status: Object.freeze({
        mode: 'available',
        completeness: 'partial',
        contractVersion: SESSION_CONTRACT,
        diagnostics: Object.freeze([`Showing the latest ${this.windowSize} permission-filtered durable Session facts.`]),
        readOnly: true,
      }),
      range: Object.freeze({
        loaded: this.events.length,
        totalAvailable: this.cursor + 1,
        renderedLimit: this.windowSize,
      }),
    })
    this.notify()
  }

  private acceptEvents(events: readonly SessionEvent[]): void {
    const additions: TraceEvent[] = []
    for (const event of events) {
      if (event.sessionId !== this.sessionId || event.seq !== this.cursor + 1) {
        throw new SessionProjectionError('session-event-sequence-violation')
      }
      this.cursor = event.seq
      const projected = projectSessionEvent(event)
      if (projected !== undefined) additions.push(projected)
    }
    if (additions.length !== 0) {
      this.events = Object.freeze([...this.events, ...additions].slice(-this.windowSize))
    }
  }

  private acceptReadPage(page: SessionEventPage, snapshotSeq: SessionSeqCursor): void {
    if (page.sessionId !== this.sessionId
      || page.sessionGeneration !== this.sessionGeneration
      || page.afterSeq !== this.cursor
      || page.snapshotSeq !== snapshotSeq) {
      throw new SessionProjectionError('session-read-fence-violation')
    }
    this.acceptEvents(page.events)
    if (page.hasMore && page.events.length === 0) {
      throw new SessionProjectionError('session-read-no-progress')
    }
    if (page.nextAfterSeq !== this.cursor || page.hasMore !== (this.cursor < snapshotSeq)) {
      throw new SessionProjectionError('session-read-page-violation')
    }
  }

  private acceptSubscriptionClosed(
    subscription: SessionSubscription,
    closed: SessionSubscriptionClosed,
  ): void {
    if (this.disposed || this.subscription !== subscription) return
    this.subscription = undefined
    if (closed.sessionId !== this.sessionId
      || closed.sessionGeneration !== this.sessionGeneration
      || closed.subscriptionGeneration !== this.subscriptionGeneration) {
      this.fail('session-subscription-close-fence-violation')
      return
    }
    this.fail(`session-subscription-closed:${closed.code}`)
  }

  private watchSubscription(subscription: SessionSubscription): void {
    void subscription.closed.then(
      closed => this.acceptSubscriptionClosed(subscription, closed),
      () => {
        if (!this.disposed && this.subscription === subscription) {
          this.subscription = undefined
          this.fail('session-subscription-close-contract-violation')
        }
      },
    )
  }

  private acceptSubscriptionPage(page: SessionSubscriptionPage): void {
    if (this.disposed) return
    const replayThrough = this.replayThrough ?? page.replayThrough
    if (page.sessionId !== this.sessionId
      || page.sessionGeneration !== this.sessionGeneration
      || (this.subscriptionGeneration !== undefined && page.subscriptionGeneration !== this.subscriptionGeneration)
      || (this.replayThrough !== undefined && page.replayThrough !== this.replayThrough)
      || (this.phase === 'live' && page.phase !== 'live')
      || (page.phase === 'replay' && page.events.some(event => event.seq > replayThrough))
      || (page.phase === 'live' && this.phase === 'replay' && this.cursor !== replayThrough)
      || (page.phase === 'live' && page.events.some(event => event.seq <= replayThrough))) {
      this.fail('session-subscription-fence-violation')
      throw new SessionProjectionError('session-subscription-fence-violation')
    }
    this.subscriptionGeneration ??= page.subscriptionGeneration
    this.replayThrough ??= page.replayThrough
    this.phase = page.phase
    try {
      this.acceptEvents(page.events)
      this.publish()
    } catch (error: unknown) {
      const diagnostic = error instanceof SessionProjectionError ? error.code : 'session-event-projection-failed'
      this.fail(diagnostic)
      throw error
    }
  }

  private async start(): Promise<void> {
    try {
      const session = await this.sessions.get(this.sessionId)
      if (this.disposed) return
      if (session === undefined) {
        this.fail('session-missing-or-unauthorized')
        return
      }
      this.sessionGeneration = session.generation
      const snapshotResult = await session.snapshot()
      if (this.disposed) return
      if (snapshotResult.status === 'unavailable') {
        this.fail(`session-snapshot-unavailable:${snapshotResult.code}`)
        return
      }
      const snapshot = snapshotResult.snapshot
      if (snapshot.sessionId !== this.sessionId
        || snapshot.sessionGeneration !== session.generation
        || snapshot.header.id !== this.sessionId) {
        throw new SessionProjectionError('session-snapshot-fence-violation')
      }
      while (this.cursor < snapshot.snapshotSeq) {
        const result = await session.read({
          afterSeq: this.cursor,
          limit: Math.min(this.windowSize, 1000),
          snapshotSeq: snapshot.snapshotSeq,
        })
        if (this.disposed) return
        if (result.status === 'unavailable') {
          this.fail(`session-read-unavailable:${result.code}`)
          return
        }
        this.acceptReadPage(result.page, snapshot.snapshotSeq)
      }
      const subscribeResult = await session.subscribe({
        afterSeq: this.cursor,
        pageSize: Math.min(this.windowSize, 1000),
      }, page => this.acceptSubscriptionPage(page))
      if (subscribeResult.status === 'unavailable') {
        this.fail(`session-subscribe-unavailable:${subscribeResult.code}`)
        return
      }
      const subscription = subscribeResult.subscription
      if (subscription.sessionId !== this.sessionId
        || subscription.sessionGeneration !== this.sessionGeneration
        || (this.subscriptionGeneration !== undefined && subscription.subscriptionGeneration !== this.subscriptionGeneration)
        || (this.replayThrough !== undefined && subscription.replayThrough !== this.replayThrough)
        || this.cursor < subscription.replayThrough) {
        await subscription.unsubscribe()
        throw new SessionProjectionError('session-subscription-handle-fence-violation')
      }
      if (this.disposed) {
        await subscription.unsubscribe()
        return
      }
      this.subscription = subscription
      this.subscriptionGeneration = subscription.subscriptionGeneration
      this.replayThrough = subscription.replayThrough
      this.watchSubscription(subscription)
      this.publish()
    } catch (error: unknown) {
      const diagnostic = error instanceof SessionProjectionError ? error.code : 'session-store-failed'
      this.fail(diagnostic)
    }
  }
}
