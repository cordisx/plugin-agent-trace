export type TraceLane = 'input' | 'model' | 'tools' | 'injection'
export type TraceTruth = 'observed' | 'cordisx' | 'inferred'
export type TraceOrigin = 'live' | 'fixture'
export type TracePhase =
  | 'opened' | 'resumed' | 'started' | 'updated' | 'completed'
  | 'requested' | 'permission' | 'queued' | 'claimed' | 'projected'
  | 'forwarded' | 'registered' | 'evaluated' | 'released'
  | 'failed' | 'expired' | 'cancelled' | 'closed'

export interface TraceSource {
  readonly kind: 'host' | 'plugin' | 'fixture'
  readonly id: string
  readonly label: string
}

export interface TraceEvent {
  readonly id: string
  readonly sessionId: string
  readonly seq: number
  readonly recordedAt: string
  readonly origin: TraceOrigin
  readonly lane: TraceLane
  readonly type: string
  readonly semanticType: string
  readonly truth: TraceTruth
  readonly phase?: TracePhase
  readonly summary: string
  readonly source: TraceSource
  readonly turnId?: string
  readonly stepId?: string
  readonly itemId?: string
  readonly messageId?: string
  readonly toolCallId?: string
  readonly contextId?: string
  readonly payload?: Readonly<Record<string, unknown>>
}

export interface TraceStatus {
  readonly mode: 'live' | 'fixture' | 'unavailable'
  readonly completeness: 'partial' | 'complete' | 'unavailable'
  readonly contractVersion?: string
  readonly diagnostics: readonly string[]
  readonly origins: readonly TraceOrigin[]
  readonly readOnly: true
}

export interface TraceSnapshot {
  readonly sessionId?: string
  readonly events: readonly TraceEvent[]
  readonly status: TraceStatus
  readonly range: {
    readonly loaded: number
    readonly totalAvailable?: number
    readonly renderedLimit: number
  }
}

export interface TraceShowcaseStore {
  getSnapshot(): TraceSnapshot
  subscribe(listener: () => void): () => void
  dispose(): void
}

/** Contract-neutral plugin boundary; a future public Host adapter opens stores through this seam. */
export interface TraceProvider {
  readonly mode: 'live' | 'fixture' | 'unavailable'
  open(sessionId: string): TraceShowcaseStore
}
