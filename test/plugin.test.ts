import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  configFrom,
  createTraceShowcaseStore,
  inject,
  installAgentTraceShowcase,
  manifest,
  TRACE_SESSION_PAGE_METADATA,
  TRACE_SESSION_ROUTE_DEFINITION,
} from '../src/index.js'

describe('plugin boundary', () => {
  it('declares no legacy observation or concrete driver dependency', () => {
    expect(inject).toEqual(['i18n', 'pages', 'routes', 'slots', 'sessions'])
    expect(manifest.schemaVersion).toBe(5)
    expect(manifest.services).toEqual([])
    expect(manifest.capabilities.map(capability => capability.name)).toEqual([
      'sessions.get',
      'sessions.read',
      'sessions.subscribe',
    ])
    for (const capability of manifest.capabilities) {
      expect(capability).toMatchObject({
        required: false,
        scope: {
          sessionIds: {
            kind: 'host-route-param',
            routeId: 'session.timeline',
            param: 'sessionId',
          },
        },
        security: { dataUse: 'ephemeral', retention: 'runtime', externalTransfer: false },
      })
    }
    expect(TRACE_SESSION_PAGE_METADATA.chrome).toBe('body-only')
    expect(TRACE_SESSION_ROUTE_DEFINITION).toMatchObject({
      id: 'session.timeline',
      path: '/sessions/:sessionId/agent-trace',
      outlet: 'session.content',
      page: 'session.timeline',
    })
  })

  it('uses only the Session service and has no runtime-selection configuration', () => {
    expect(configFrom({ timelineWindowSize: 100 })).toEqual({ timelineWindowSize: 100 })
    const snapshot = createTraceShowcaseStore(configFrom({ timelineWindowSize: 100 }), 'session-a').getSnapshot()
    expect(snapshot.status.mode).toBe('unavailable')
    expect(snapshot.status.diagnostics).toEqual(['session-service-unavailable'])
    expect(snapshot.events).toEqual([])
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
      effect: vi.fn((effect: () => () => void) => {
        disposers.push(effect())
      }),
    }

    installAgentTraceShowcase(ctx as never, { timelineWindowSize: 100 }, { register: entryRegister })

    expect(pageRegister).toHaveBeenCalledOnce()
    expect(pageRegister.mock.calls[0]?.[0]).toEqual(TRACE_SESSION_PAGE_METADATA)
    expect(routeRegister).toHaveBeenCalledWith(TRACE_SESSION_ROUTE_DEFINITION)
    expect(entryRegister).toHaveBeenCalledOnce()
    expect(disposers).toHaveLength(1)
  })
})

describe('package manifest', () => {
  it('pins the exact v5 runtime manifest', async () => {
    const packageManifest = JSON.parse(await readFile(new URL('../cordisx.plugin.json', import.meta.url), 'utf8'))
    const runtimeManifestText = await readFile(new URL('../runtime-manifest.json', import.meta.url), 'utf8')
    const runtimeManifest = JSON.parse(runtimeManifestText)
    expect(packageManifest.id).toBe('agent-trace-showcase')
    expect(packageManifest.entry).toBe('./dist/index.js')
    expect(packageManifest.schemaVersion).toBe(4)
    expect(packageManifest.runtimeManifest).toMatchObject({
      path: './runtime-manifest.json',
      schema: manifest.$schema,
      digest: `sha256:${createHash('sha256').update(runtimeManifestText).digest('hex')}`,
    })
    expect(runtimeManifest).toEqual(manifest)
    expect(packageManifest.canonicalSource).toBe('https://github.com/CordisX/plugin-agent-trace')
  })
})
