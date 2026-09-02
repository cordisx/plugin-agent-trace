import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, filterTraceEvents, groupTraceEvents, orderTraceEvents } from '../src/model.js'
import { FixtureTraceStore } from '../src/providers.js'

describe('Timeline model', () => {
  const events = new FixtureTraceStore('demo', 50).getSnapshot().events

  it('filters and orders immutable projected rows without changing evidence', () => {
    const tools = filterTraceEvents(events, { ...EMPTY_FILTERS, lane: 'tools' })
    expect(tools).toHaveLength(1)
    expect(tools[0]?.semanticType).toBe('item.tool-call')
    expect(orderTraceEvents(events, 'time').map(event => event.seq)).toEqual(events.map(event => event.seq))
    expect(events.every(Object.isFrozen)).toBe(true)
  })

  it('groups turn-scoped and between-turn events in sequence', () => {
    expect(groupTraceEvents(events).map(group => [group.label, group.events.length])).toEqual([
      ['Between turns', 1],
      ['Turn fixture-turn-1', 7],
    ])
  })
})
