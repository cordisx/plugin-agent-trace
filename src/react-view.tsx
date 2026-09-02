import { Fragment, useEffect, useMemo, useState } from 'cordisx/react'
import { Button, EmptyState, Select, Stack, Text } from 'cordisx/ui'
import type { CordisXReactPageProps } from 'cordisx/contracts'
import { EMPTY_FILTERS, filterTraceEvents, groupTraceEvents, orderTraceEvents, type TraceFilters } from './model.js'
import type { TraceEvent, TraceShowcaseStore } from './types.js'

const LANES = ['input', 'model', 'tools', 'injection'] as const
const TRUTHS = ['observed', 'cordisx', 'inferred'] as const

const STYLES = `
.cat-root{display:flex;min-height:0;height:100%;flex-direction:column;color:var(--cx-text);font-size:12px}
.cat-status{padding:8px 10px;border-block-end:1px solid var(--cx-border);background:var(--cx-surface-raised)}
.cat-status[data-mode=fixture]{border-inline-start:4px solid var(--cx-warning,#c99a3d)}
.cat-toolbar{padding:8px 10px;border-block-end:1px solid var(--cx-border);overflow:auto}
.cat-table-scroll{flex:1;min-height:0;overflow:auto}.cat-table{width:100%;border-spacing:0;table-layout:fixed}
.cat-table th,.cat-table td{height:32px;padding:0 8px;border-block-end:1px solid var(--cx-border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:start}
.cat-table th{position:sticky;top:0;background:var(--cx-surface-raised);z-index:1}.cat-group td{height:26px;color:var(--cx-muted);background:var(--cx-surface-raised)}
.cat-row{cursor:pointer}.cat-row[data-selected=true]{background:var(--cx-hover)}.cat-lane{font-weight:600}.cat-truth{color:var(--cx-muted)}
.cat-detail{padding:10px;border-block-start:1px solid var(--cx-border);max-height:34%;overflow:auto}.cat-detail dl{display:grid;grid-template-columns:100px minmax(0,1fr);margin:0}
.cat-detail dt,.cat-detail dd{margin:0;padding:4px 0;border-block-end:1px solid var(--cx-border)}.cat-detail dt{color:var(--cx-muted)}.cat-detail dd{overflow-wrap:anywhere}.cat-payload{white-space:pre-wrap}
`

function options(values: readonly string[], all: string) {
  return [{ value: 'all', label: all }, ...values.map(value => ({ value, label: value }))]
}

function Detail({ event }: { readonly event: TraceEvent | undefined }) {
  if (event === undefined) return <Text tone="muted">Select an event to inspect its public projection.</Text>
  const fields: readonly [string, unknown][] = [
    ['Event', event.id], ['Sequence', event.seq], ['Recorded', event.recordedAt], ['Origin', event.origin],
    ['Truth', event.truth], ['Type', event.type], ['Semantic', event.semanticType], ['Phase', event.phase],
    ['Session', event.sessionId], ['Turn', event.turnId], ['Step', event.stepId], ['Item', event.itemId],
    ['Message', event.messageId], ['Tool call', event.toolCallId], ['Context', event.contextId],
    ['Source', `${event.source.kind}:${event.source.id}`],
  ]
  return <><Text as="p"><strong>{event.summary}</strong></Text><dl>{fields.filter(([, value]) => value !== undefined).map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{String(value)}</dd></Fragment>)}</dl>{event.payload === undefined ? null : <pre className="cat-payload">{JSON.stringify(event.payload, null, 2)}</pre>}</>
}

export function createTraceReactPage(createStore: (sessionId: string) => TraceShowcaseStore) {
  return function AgentTracePage(props: CordisXReactPageProps) {
    const sessionId = props.params.sessionId
    if (typeof sessionId !== 'string' || sessionId.length === 0) throw new Error('Agent Trace route requires a Host-issued session id')
    const store = useMemo(() => createStore(sessionId), [sessionId])
    useEffect(() => () => store.dispose(), [store])
    const [, refresh] = useState(0)
    useEffect(() => {
      const dispose = store.subscribe(() => refresh(value => value + 1))
      refresh(value => value + 1)
      return dispose
    }, [store])
    const snapshot = store.getSnapshot()
    const [order, setOrder] = useState<'sequence' | 'time'>('sequence')
    const [filters, setFilters] = useState<TraceFilters>(EMPTY_FILTERS)
    const [selectedId, setSelectedId] = useState<string>()
    const types = [...new Set(snapshot.events.map(event => event.type))].sort()
    const phases = [...new Set(snapshot.events.flatMap(event => event.phase === undefined ? [] : [event.phase]))].sort()
    const events = orderTraceEvents(filterTraceEvents(snapshot.events, filters), order).slice(-snapshot.range.renderedLimit)
    const selected = snapshot.events.find(event => event.id === selectedId)
    const update = <Key extends keyof TraceFilters>(key: Key, value: TraceFilters[Key]) => setFilters(current => ({ ...current, [key]: value }))
    return <div className="cat-root" data-agent-trace-showcase="true" data-read-only="true"><style>{STYLES}</style>
      <div className="cat-status" data-mode={snapshot.status.mode} title={snapshot.status.diagnostics.join('\n')}>
        <strong>{snapshot.status.mode === 'fixture' ? 'DEMO · fixture' : snapshot.status.mode}</strong>
        {' · '}{snapshot.status.completeness}{' · '}read-only{' · '}{snapshot.range.loaded}/{snapshot.range.totalAvailable ?? snapshot.range.loaded} events
      </div>
      <Stack className="cat-toolbar" direction="row" gap="small" align="center" wrap>
        <Button aria-pressed={order === 'sequence'} onClick={() => setOrder('sequence')}>Sequence</Button>
        <Button aria-pressed={order === 'time'} onClick={() => setOrder('time')}>Time</Button>
        <Select aria-label="Filter by lane" value={filters.lane} options={options(LANES, 'All lanes')} onChange={value => update('lane', value as TraceFilters['lane'])} />
        <Select aria-label="Filter by truth" value={filters.truth} options={options(TRUTHS, 'All truth')} onChange={value => update('truth', value as TraceFilters['truth'])} />
        <Select aria-label="Filter by event type" value={filters.type} options={options(types, 'All types')} onChange={value => update('type', value)} />
        <Select aria-label="Filter by lifecycle phase" value={filters.phase} options={options(phases, 'All phases')} onChange={value => update('phase', value as TraceFilters['phase'])} />
      </Stack>
      {snapshot.status.mode === 'unavailable'
        ? <EmptyState title="Agent events unavailable" description={snapshot.status.diagnostics.join(' · ')} />
        : events.length === 0
          ? <EmptyState title="No projected events" description="No events in the loaded read-only session window match these filters." />
          : <div className="cat-table-scroll"><table className="cat-table"><thead><tr><th>Seq</th><th>Lane</th><th>Event</th><th>Phase</th><th>Summary</th></tr></thead><tbody>{groupTraceEvents(events).map(group => <Fragment key={group.key}><tr className="cat-group"><td colSpan={5}>{group.label}</td></tr>{group.events.map(event => <tr key={event.id} className="cat-row" tabIndex={0} aria-selected={event.id === selectedId} data-selected={event.id === selectedId} onClick={() => setSelectedId(event.id)} onKeyDown={input => { if (input.key === 'Enter' || input.key === ' ') setSelectedId(event.id) }}><td>{event.seq}</td><td className="cat-lane">{event.lane}</td><td>{event.semanticType}</td><td>{event.phase ?? '—'}</td><td>{event.summary} <span className="cat-truth">{event.origin}/{event.truth}</span></td></tr>)}</Fragment>)}</tbody></table></div>}
      <aside className="cat-detail" aria-label="Event detail"><Detail event={selected} /></aside>
    </div>
  }
}
