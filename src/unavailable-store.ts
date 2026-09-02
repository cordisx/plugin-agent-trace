import type { TraceShowcaseStore, TraceSnapshot } from './types.js'

export class UnavailableTraceStore implements TraceShowcaseStore {
  private readonly snapshot: TraceSnapshot

  constructor(sessionId: string | undefined, windowSize: number, diagnostic: string) {
    this.snapshot = Object.freeze({
      ...(sessionId === undefined ? {} : { sessionId }),
      events: Object.freeze([]),
      status: Object.freeze({
        mode: 'unavailable', completeness: 'unavailable', diagnostics: Object.freeze([diagnostic]),
        readOnly: true,
      }),
      range: Object.freeze({ loaded: 0, renderedLimit: windowSize }),
    })
  }

  getSnapshot(): TraceSnapshot { return this.snapshot }
  subscribe(): () => void { return () => {} }
  dispose(): void {}
}
