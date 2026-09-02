import { JSDOM } from 'jsdom'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { CordisXReactPageProps } from 'cordisx/contracts'
import { FixtureTraceStore, UnavailableTraceStore } from '../src/providers.js'
import { createTraceReactPage } from '../src/react-view.js'
import type { TraceShowcaseStore } from '../src/types.js'

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

describe('Host-owned Agent Trace body', () => {
  it('renders an explicit fixture banner, read-only rows, detail, and no Host chrome', async () => {
    const dom = new JSDOM('<body><div id="root"></div></body>')
    const store = new FixtureTraceStore('session-a', 50)
    const dispose = vi.spyOn(store, 'dispose')
    const root = await mount(dom, store)
    const document = dom.window.document

    expect(document.querySelector('[data-agent-trace-showcase="true"]')?.getAttribute('data-read-only')).toBe('true')
    expect(document.querySelector('.cat-status')?.textContent).toContain('DEMO · fixture')
    expect(document.querySelectorAll('.cat-row')).toHaveLength(8)
    expect(document.querySelector('header,nav,[role="tablist"]')).toBeNull()
    document.querySelector<HTMLTableRowElement>('.cat-row')!.click()
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(document.querySelector('.cat-detail')?.textContent).toContain('fixture')

    root.unmount()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('renders truthful unavailable live mode without fabricated rows', async () => {
    const dom = new JSDOM('<body><div id="root"></div></body>')
    const store = new UnavailableTraceStore('session-a', 100, 'NEED_API: ctx.sessions')
    const root = await mount(dom, store)

    expect(dom.window.document.querySelector('[data-empty-state="Agent events unavailable"]')?.textContent).toContain('NEED_API')
    expect(dom.window.document.querySelectorAll('.cat-row')).toHaveLength(0)
    root.unmount()
  })
})
