import { describe, expect, it, vi } from 'vitest'
import { FixtureTraceStore, UnavailableTraceStore } from '../src/providers.js'

describe('Trace stores', () => {
  it('labels every deterministic demo event as fixture evidence', () => {
    const store = new FixtureTraceStore('demo-session', 50)
    const snapshot = store.getSnapshot()

    expect(snapshot.status).toMatchObject({
      mode: 'fixture',
      completeness: 'complete',
      readOnly: true,
    })
    expect(snapshot.status.diagnostics.join(' ')).toContain('DEMO ONLY')
    expect(snapshot.events).toHaveLength(8)
    expect(snapshot.events.every(event => (
      event.sessionId === 'demo-session'
      && event.origin === 'fixture'
      && event.source.kind === 'fixture'
      && event.payload?.demo === true
    ))).toBe(true)
  })

  it('does not synthesize events for unavailable live mode', () => {
    const listener = vi.fn()
    const store = new UnavailableTraceStore('live-session', 100, 'NEED_API')
    const dispose = store.subscribe(listener)

    expect(store.getSnapshot()).toMatchObject({
      sessionId: 'live-session',
      events: [],
      status: { mode: 'unavailable', completeness: 'unavailable', readOnly: true },
    })
    expect(store.getSnapshot().status.diagnostics).toEqual(['NEED_API'])
    dispose()
    store.dispose()
    expect(listener).not.toHaveBeenCalled()
  })
})
