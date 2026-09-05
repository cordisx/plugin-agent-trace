import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, filterTraceEvents, groupTraceEvents, orderTraceEvents } from '../src/model.js'
import type { TraceEvent } from '../src/types.js'

describe('Timeline model', () => {
  const source = Object.freeze({ kind: 'session', id: 'session-a', label: 'Session authority' } as const)
  const events: readonly TraceEvent[] = Object.freeze([
    Object.freeze({
      id: 'session:session-a:0',
      sessionId: 'session-a',
      seq: 0,
      recordedAt: '2026-01-01T00:00:00.000Z',
      lane: 'model',
      type: 'turn/start',
      semanticType: 'turn/start',
      phase: 'started',
      summary: 'Turn 1 started.',
      source,
    }),
    Object.freeze({
      id: 'session:session-a:1',
      sessionId: 'session-a',
      seq: 1,
      recordedAt: '2026-01-01T00:00:01.000Z',
      lane: 'tools',
      type: 'tool/call',
      semanticType: 'tool/call',
      summary: 'Tool call committed.',
      source,
      turnId: '1',
    }),
    Object.freeze({
      id: 'session:session-a:2',
      sessionId: 'session-a',
      seq: 2,
      recordedAt: '2026-01-01T00:00:02.000Z',
      lane: 'model',
      type: 'turn/end',
      semanticType: 'turn/end',
      phase: 'completed',
      summary: 'Turn 1 ended.',
      source,
      turnId: '1',
    }),
  ])

  it('filters and orders immutable projected rows without changing evidence', () => {
    const tools = filterTraceEvents(events, { ...EMPTY_FILTERS, lane: 'tools' })
    expect(tools).toHaveLength(1)
    expect(tools[0]?.semanticType).toBe('tool/call')
    expect(orderTraceEvents(events, 'time').map(event => event.seq)).toEqual(events.map(event => event.seq))
    expect(events.every(Object.isFrozen)).toBe(true)
  })

  it('groups turn-scoped and between-turn events in sequence', () => {
    expect(groupTraceEvents(events).map(group => [group.label, group.events.length])).toEqual([
      ['Between turns', 1],
      ['Turn 1', 2],
    ])
  })
})
