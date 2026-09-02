import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  TRACE_SESSION_PAGE_METADATA,
  TRACE_SESSION_ROUTE_DEFINITION,
  configFrom,
  createTraceProvider,
  inject,
  installAgentTraceShowcase,
  manifest,
} from '../src/index.js'

describe('plugin boundary', () => {
  it('declares no legacy observation or concrete driver dependency', () => {
    expect(inject).toEqual(['i18n', 'pages', 'routes', 'slots'])
    expect(manifest.capabilities).toEqual([])
    expect(TRACE_SESSION_PAGE_METADATA.chrome).toBe('body-only')
    expect(TRACE_SESSION_ROUTE_DEFINITION).toMatchObject({
      id: 'session.timeline',
      path: '/sessions/:sessionId/agent-trace',
      outlet: 'session.content',
      page: 'session.timeline',
    })
  })

  it('keeps live unavailable and fixture explicitly demonstrative', () => {
    const liveProvider = createTraceProvider(configFrom({ mode: 'live' }))
    expect(liveProvider.mode).toBe('unavailable')
    const live = liveProvider.open('session-live').getSnapshot()
    expect(live.status.mode).toBe('unavailable')
    expect(live.status.diagnostics.join(' ')).toContain('public read-only ctx.sessions/SessionEvent')
    expect(live.events).toEqual([])

    const fixtureProvider = createTraceProvider(configFrom({ mode: 'fixture' }))
    expect(fixtureProvider.mode).toBe('fixture')
    const fixture = fixtureProvider.open('session-demo').getSnapshot()
    expect(fixture.status.mode).toBe('fixture')
    expect(fixture.status.origins).toEqual(['fixture'])
  })

  it('does not retain historical configuration compatibility', () => {
    expect(() => configFrom({ mode: 'historical', historyPageSize: 25 })).toThrow(/expected "live" \| "fixture"/)
  })

  it('registers only structured Host seams and owns cleanup through ctx.effect', () => {
    const disposers: Array<() => void> = []
    const pageRegister = vi.fn()
    const routeRegister = vi.fn()
    const entryRegister = vi.fn(() => vi.fn())
    const ctx = {
      i18n: { define: vi.fn() },
      pages: { register: pageRegister },
      routes: { register: routeRegister },
      slots: { register: vi.fn() },
      effect: vi.fn((effect: () => () => void) => { disposers.push(effect()) }),
    }

    installAgentTraceShowcase(ctx as never, { mode: 'fixture' }, { register: entryRegister })

    expect(pageRegister).toHaveBeenCalledOnce()
    expect(pageRegister.mock.calls[0]?.[0]).toEqual(TRACE_SESSION_PAGE_METADATA)
    expect(routeRegister).toHaveBeenCalledWith(TRACE_SESSION_ROUTE_DEFINITION)
    expect(entryRegister).toHaveBeenCalledOnce()
    expect(disposers).toHaveLength(1)
  })
})

describe('package manifest', () => {
  it('matches the runtime manifest and remains capability-free at NEED_API', async () => {
    const packageManifest = JSON.parse(await readFile(new URL('../cordisx.plugin.json', import.meta.url), 'utf8'))
    expect(packageManifest.id).toBe('agent-trace-showcase')
    expect(packageManifest.entry).toBe('./dist/index.js')
    expect(packageManifest.runtimeManifest).toEqual(manifest)
    expect(packageManifest.canonicalSource).toBe('https://github.com/CordisX/plugin-agent-trace')
  })
})
