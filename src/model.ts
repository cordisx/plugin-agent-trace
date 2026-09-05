import type { TraceEvent, TraceLane, TracePhase } from './types.js'

export interface TraceFilters {
  readonly lane: TraceLane | 'all'
  readonly type: string | 'all'
  readonly phase: TracePhase | 'all'
}

export const EMPTY_FILTERS: TraceFilters = Object.freeze({
  lane: 'all',
  type: 'all',
  phase: 'all',
})

export function filterTraceEvents(events: readonly TraceEvent[], filters: TraceFilters): readonly TraceEvent[] {
  return events.filter(event => (
    (filters.lane === 'all' || event.lane === filters.lane)
    && (filters.type === 'all' || event.type === filters.type)
    && (filters.phase === 'all' || event.phase === filters.phase)
  ))
}

export function orderTraceEvents(events: readonly TraceEvent[], order: 'sequence' | 'time'): readonly TraceEvent[] {
  return [...events].sort(
    order === 'sequence'
      ? (left, right) => left.seq - right.seq
      : (left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt) || left.seq - right.seq,
  )
}

export interface TraceTurnGroup {
  readonly key: string
  readonly label: string
  readonly events: readonly TraceEvent[]
}

export function groupTraceEvents(events: readonly TraceEvent[]): readonly TraceTurnGroup[] {
  const output: Array<{ key: string; label: string; events: TraceEvent[] }> = []
  for (const event of events) {
    const key = event.turnId ?? `between:${event.seq}`
    let group = output.at(-1)
    if (group?.key !== key) {
      group = { key, label: event.turnId === undefined ? 'Between turns' : `Turn ${event.turnId}`, events: [] }
      output.push(group)
    }
    group.events.push(event)
  }
  return output
}
