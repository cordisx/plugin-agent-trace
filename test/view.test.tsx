import { JSDOM } from 'jsdom'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { CordisXReactPageProps } from 'cordisx/contracts'
import { UnavailableTraceStore } from '../src/unavailable-store.js'
import { createTraceReactPage } from '../src/react-view.js'
import type { TraceEvent, TraceShowcaseStore } from '../src/types.js'

vi.mock('cordisx/ui', async () => {
  const React = await import('react')
  return {
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.createElement('button', props, children),
    EmptyState: ({ title, description }: { title: string; description: string }) => React.createElement('section', { 'data-empty-state': title }, description),
    Select: ({ options, onChange, ...props }: {
      options: ReadonlyArray<{ value: string; label: string }>
      onChange(value: string): void
      value: string
      'aria-label': string
    }) => React.createElement('select', { ...props, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value) },
      options.map(option => React.createElement('option', { key: option.value, value: option.value }, option.label))),
    Stack: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { direction?: string; gap?: string; align?: string; wrap?: boolean }) => {
      const { direction: _direction, gap: _gap, align: _align, wrap: _wrap, ...divProps } = props
      return React.createElement('div', divProps, children)
    },
    Text: ({ as = 'span', children, ...props }: React.HTMLAttributes<HTMLElement> & { as?: string; tone?: string }) => {
      const { tone: _tone, ...elementProps } = props
      return React.createElement(as, elementProps, children)
    },
  }
})

function propsFor(sessionId = 'session-a'): CordisXReactPageProps {
  return {
    routeId: 'agent-trace-showcase:session.timeline',
    outlet: 'session.content',
    params: { sessionId },
    navigation: { navigate: async () => {}, back: async () => {}, close: async () => {} },
    localeNamespace: 'agent-trace-showcase',
    t: key => key,
  } as CordisXReactPageProps
}

async function mount(dom: JSDOM, store: TraceShowcaseStore): Promise<Root> {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document })
  const Page = createTraceReactPage(() => store)
  const root = createRoot(dom.window.document.getElementById('root')!)
  root.render(createElement(Page, propsFor()))
  await new Promise(resolve => setTimeout(resolve, 20))
  return root
}

function availableStore(): TraceShowcaseStore {
  const snapshot = Object.freeze({
    sessionId: 'session-a',
    events: Object.freeze([
      Object.freeze({
        id: 'session:session-a:0', sessionId: 'session-a', seq: 0,
        recordedAt: '2026-01-01T00:00:00.000Z', lane: 'model' as const,
        type: 'turn/start', semanticType: 'turn/start', phase: 'started' as const,
        summary: 'Turn 1 started.', turnId: '1',
        source: Object.freeze({ kind: 'session' as const, id: 'session-a', label: 'Session authority' }),
      }),
      Object.freeze({
        id: 'session:session-a:1', sessionId: 'session-a', seq: 1,
        recordedAt: '2026-01-01T00:00:01.000Z', lane: 'model' as const,
        type: 'turn/end', semanticType: 'turn/end', phase: 'completed' as const,
        summary: 'Turn 1 ended.', turnId: '1',
        source: Object.freeze({ kind: 'session' as const, id: 'session-a', label: 'Session authority' }),
      }),
    ]),
    status: Object.freeze({
      mode: 'available' as const,
      completeness: 'partial' as const,
      contractVersion: 'cordisx.session-event/v1',
      diagnostics: Object.freeze(['Permission-filtered durable Session facts.']),
      readOnly: true as const,
    }),
    range: Object.freeze({ loaded: 2, totalAvailable: 2, renderedLimit: 100 }),
  })
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    dispose: () => {},
  }
}

function eventStore(event: TraceEvent): TraceShowcaseStore {
  const baseline = availableStore().getSnapshot()
  const snapshot = Object.freeze({
    ...baseline,
    events: Object.freeze([event]),
    range: Object.freeze({ loaded: 1, totalAvailable: 1, renderedLimit: 100 }),
  })
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    dispose: () => {},
  }
}

describe('Host-owned Agent Trace body', () => {
  it('renders SessionEvent rows, detail, and no Host chrome', async () => {
    const dom = new JSDOM('<body><div id="root"></div></body>')
    const store = availableStore()
    const dispose = vi.spyOn(store, 'dispose')
    const root = await mount(dom, store)
    const document = dom.window.document

    expect(document.querySelector('[data-agent-trace-showcase="true"]')?.getAttribute('data-read-only')).toBe('true')
    expect(document.querySelector('.cat-status')?.textContent).toContain('available')
    expect(document.querySelectorAll('.cat-row')).toHaveLength(2)
    expect(document.querySelector('header,nav,[role="tablist"]')).toBeNull()
    document.querySelector<HTMLTableRowElement>('.cat-row')!.click()
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(document.querySelector('.cat-detail')?.textContent).toContain('Turn 1 started')

    root.unmount()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('renders truthful unavailable state without fabricated rows', async () => {
    const dom = new JSDOM('<body><div id="root"></div></body>')
    const store = new UnavailableTraceStore('session-a', 100, 'session-service-unavailable')
    const root = await mount(dom, store)

    expect(dom.window.document.querySelector('[data-empty-state="Session events unavailable"]')?.textContent).toContain('session-service-unavailable')
    expect(dom.window.document.querySelectorAll('.cat-row')).toHaveLength(0)
    root.unmount()
  })

  it('shows the Session-persisted entity identity, digest, and definition', async () => {
    const dom = new JSDOM('<body><div id="root"></div></body>')
    const digest = `sha256:${'a'.repeat(64)}` as const
    const identity = { agentId: 'chatroom.generalist', revision: digest }
    const store = eventStore(Object.freeze({
      id: 'session:session-a:0', sessionId: 'session-a', seq: 0,
      recordedAt: '2026-01-01T00:00:00.000Z', lane: 'injection',
      type: 'entity/definition-bound', semanticType: 'entity/definition-bound',
      summary: 'Session definition bound to Persisted Generalist.',
      source: Object.freeze({ kind: 'session', id: 'session-a', label: 'Host Session authority' }),
      definitionResolution: {
        identity,
        digest,
        definition: {
          $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-definition.v1.schema.json',
          contract: 'cordisx.agent-definition/v1', schemaVersion: 1,
          identity, name: 'Persisted Generalist',
          inherit: {
            promptSections: 'none', rules: 'none', skills: 'none',
            tools: 'none', mcpServers: 'none', runtimeDefaults: 'none',
          },
        },
      },
    }))
    const root = await mount(dom, store)

    dom.window.document.querySelector<HTMLTableRowElement>('.cat-row')!.click()
    await new Promise(resolve => setTimeout(resolve, 20))
    const detail = dom.window.document.querySelector('.cat-detail')?.textContent
    expect(detail).toContain('chatroom.generalist')
    expect(detail).toContain(digest)
    expect(detail).toContain('Persisted Generalist')
    root.unmount()
  })

  it('disposes the prior Session store when the Host route replaces sessionId', async () => {
    const dom = new JSDOM('<body><div id="root"></div></body>')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document })
    const first = availableStore()
    const second = availableStore()
    const disposeFirst = vi.spyOn(first, 'dispose')
    const disposeSecond = vi.spyOn(second, 'dispose')
    const createStore = vi.fn((sessionId: string) => sessionId === 'session-a' ? first : second)
    const Page = createTraceReactPage(createStore)
    const root = createRoot(dom.window.document.getElementById('root')!)

    root.render(createElement(Page, propsFor('session-a')))
    await new Promise(resolve => setTimeout(resolve, 20))
    root.render(createElement(Page, propsFor('session-b')))
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(createStore.mock.calls.map(([sessionId]) => sessionId)).toEqual(['session-a', 'session-b'])
    expect(disposeFirst).toHaveBeenCalledOnce()
    expect(disposeSecond).not.toHaveBeenCalled()
    root.unmount()
    expect(disposeSecond).toHaveBeenCalledOnce()
  })
})
