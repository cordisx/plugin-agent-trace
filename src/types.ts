import type { EntityDefinitionResolution } from '@cordisx/protocol/entities/v1'

export type TraceLane = 'input' | 'model' | 'tools' | 'injection'
export type TracePhase =
  | 'opened'
  | 'resumed'
  | 'started'
  | 'updated'
  | 'completed'
  | 'requested'
  | 'permission'
  | 'queued'
  | 'claimed'
  | 'projected'
  | 'forwarded'
  | 'registered'
  | 'evaluated'
  | 'released'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'closed'

export interface TraceSource {
  readonly kind: 'session' | 'plugin' | 'model' | 'tool'
  readonly id: string
  readonly label: string
}

export interface TraceEvent {
  readonly id: string
  readonly sessionId: string
  readonly seq: number
  readonly recordedAt: string
  readonly lane: TraceLane
  readonly type: string
  readonly semanticType: string
  readonly phase?: TracePhase
  readonly summary: string
  readonly source: TraceSource
  readonly turnId?: string
  readonly stepId?: string
  readonly itemId?: string
  readonly messageId?: string
  readonly toolCallId?: string
  readonly contextId?: string
  readonly definitionResolution?: EntityDefinitionResolution
  readonly payload?: unknown
}

export interface TraceStatus {
  readonly mode: 'available' | 'unavailable'
  readonly completeness: 'partial' | 'complete' | 'unavailable'
  readonly contractVersion?: string
  readonly diagnostics: readonly string[]
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
