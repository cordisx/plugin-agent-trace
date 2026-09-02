import type { TraceEvent, TraceProvider, TraceShowcaseStore, TraceSnapshot } from './types.js'

function fixtureEvent(sessionId: string, input: Omit<TraceEvent, 'sessionId' | 'origin' | 'source'>): TraceEvent {
  return Object.freeze({
    ...input,
    sessionId,
    origin: 'fixture',
    source: Object.freeze({ kind: 'fixture', id: 'agent-trace-demo', label: 'Agent Trace deterministic demo' }),
  })
}

function fixtureEvents(sessionId: string): readonly TraceEvent[] {
  const at = (offset: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, offset)).toISOString()
  return Object.freeze([
    fixtureEvent(sessionId, { id: 'fixture-session-opened', seq: 0, recordedAt: at(0), lane: 'model', type: 'session.lifecycle', semanticType: 'session.lifecycle', truth: 'observed', phase: 'opened', summary: 'Demo session opened.', payload: { demo: true } }),
    fixtureEvent(sessionId, { id: 'fixture-turn-started', seq: 1, recordedAt: at(1), lane: 'model', type: 'turn.lifecycle', semanticType: 'turn.lifecycle', truth: 'observed', phase: 'started', summary: 'Demo turn started.', turnId: 'fixture-turn-1', payload: { demo: true } }),
    fixtureEvent(sessionId, { id: 'fixture-user', seq: 2, recordedAt: at(2), lane: 'input', type: 'message.observed', semanticType: 'user.message', truth: 'observed', summary: 'Fixture user message; not Desktop data.', turnId: 'fixture-turn-1', messageId: 'fixture-user-1', payload: { demo: true } }),
    fixtureEvent(sessionId, { id: 'fixture-reasoning', seq: 3, recordedAt: at(3), lane: 'model', type: 'item.lifecycle', semanticType: 'item.reasoning', truth: 'observed', phase: 'completed', summary: 'Demo reasoning item completed.', turnId: 'fixture-turn-1', itemId: 'fixture-reasoning-1', payload: { demo: true } }),
    fixtureEvent(sessionId, { id: 'fixture-tool', seq: 4, recordedAt: at(4), lane: 'tools', type: 'item.lifecycle', semanticType: 'item.tool-call', truth: 'observed', phase: 'completed', summary: 'Demo tool call completed.', turnId: 'fixture-turn-1', itemId: 'fixture-tool-1', toolCallId: 'fixture-tool-call-1', payload: { demo: true } }),
    fixtureEvent(sessionId, { id: 'fixture-projection', seq: 5, recordedAt: at(5), lane: 'injection', type: 'diagnostic', semanticType: 'diagnostic.fixture', truth: 'cordisx', summary: 'Fixture-only projection marker.', turnId: 'fixture-turn-1', payload: { demo: true, live: false } }),
    fixtureEvent(sessionId, { id: 'fixture-assistant', seq: 6, recordedAt: at(6), lane: 'model', type: 'content.chunk', semanticType: 'content.assistant', truth: 'observed', summary: 'Demo assistant output; not model evidence.', turnId: 'fixture-turn-1', itemId: 'fixture-assistant-1', payload: { demo: true } }),
    fixtureEvent(sessionId, { id: 'fixture-turn-completed', seq: 7, recordedAt: at(7), lane: 'model', type: 'turn.lifecycle', semanticType: 'turn.lifecycle', truth: 'observed', phase: 'completed', summary: 'Demo turn completed.', turnId: 'fixture-turn-1', payload: { demo: true } }),
  ])
}

export class FixtureTraceStore implements TraceShowcaseStore {
  private readonly snapshot: TraceSnapshot

  constructor(sessionId: string, windowSize: number) {
    const events = fixtureEvents(sessionId).slice(-windowSize)
    this.snapshot = Object.freeze({
      sessionId,
      events,
      status: Object.freeze({
        mode: 'fixture', completeness: 'complete', contractVersion: 'fixture/agent-trace-demo/v1',
        diagnostics: Object.freeze(['DEMO ONLY: no Desktop, AgentLoop, Codex, or historical data was read.']),
        origins: Object.freeze(['fixture' as const]), readOnly: true,
      }),
      range: Object.freeze({ loaded: events.length, totalAvailable: events.length, renderedLimit: windowSize }),
    })
  }

  getSnapshot(): TraceSnapshot { return this.snapshot }
  subscribe(): () => void { return () => {} }
  dispose(): void {}
}

export class UnavailableTraceStore implements TraceShowcaseStore {
  private readonly snapshot: TraceSnapshot

  constructor(sessionId: string | undefined, windowSize: number, diagnostic: string) {
    this.snapshot = Object.freeze({
      ...(sessionId === undefined ? {} : { sessionId }),
      events: Object.freeze([]),
      status: Object.freeze({
        mode: 'unavailable', completeness: 'unavailable', diagnostics: Object.freeze([diagnostic]),
        origins: Object.freeze([]), readOnly: true,
      }),
      range: Object.freeze({ loaded: 0, renderedLimit: windowSize }),
    })
  }

  getSnapshot(): TraceSnapshot { return this.snapshot }
  subscribe(): () => void { return () => {} }
  dispose(): void {}
}

export class FixtureTraceProvider implements TraceProvider {
  readonly mode = 'fixture' as const

  constructor(private readonly windowSize: number) {}

  open(sessionId: string): TraceShowcaseStore {
    return new FixtureTraceStore(sessionId, this.windowSize)
  }
}

export class UnavailableTraceProvider implements TraceProvider {
  readonly mode = 'unavailable' as const

  constructor(
    private readonly windowSize: number,
    private readonly diagnostic: string,
  ) {}

  open(sessionId: string): TraceShowcaseStore {
    return new UnavailableTraceStore(sessionId, this.windowSize, this.diagnostic)
  }
}
