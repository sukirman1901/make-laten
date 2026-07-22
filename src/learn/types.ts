export type PatternType = 'file-read' | 'grep' | 'git-diff' | 'cache' | 'route'

export interface Pattern {
  id: string
  type: PatternType
  pattern: string
  confidence: number
  count: number
  metadata?: Record<string, any>
}

export interface Failure {
  id: string
  type: string
  error: string
  context?: Record<string, any>
  timestamp: number
}

export interface LearnContext {
  patterns: Pattern[]
  failures: Failure[]
  lastUpdated: number
}
