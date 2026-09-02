import { describe, expect, it, vi } from 'vitest'
import { UnavailableTraceStore } from '../src/unavailable-store.js'

describe('Trace stores', () => {
  it('does not synthesize events when the Session service is unavailable', () => {
    const listener = vi.fn()
    const store = new UnavailableTraceStore('session-a', 100, 'session-service-unavailable')
    const dispose = store.subscribe(listener)

    expect(store.getSnapshot()).toMatchObject({
      sessionId: 'session-a',
      events: [],
      status: { mode: 'unavailable', completeness: 'unavailable', readOnly: true },
    })
    expect(store.getSnapshot().status.diagnostics).toEqual(['session-service-unavailable'])
    dispose()
    store.dispose()
    expect(listener).not.toHaveBeenCalled()
  })
})
