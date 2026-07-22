export type ToolType = 'compress' | 'cache' | 'graph' | 'search'
export type CompressorType = 'file-read' | 'grep' | 'git-diff'
export type StrategyType = 'aggressive' | 'balanced' | 'conservative'

export interface ToolRoute {
  tool: ToolType
  compressor?: CompressorType
  confidence: number
  reason?: string
}

export interface StrategyRoute {
  strategy: StrategyType
  reason: string
  savings: number
}

export interface RouteInput {
  type: 'file' | 'grep' | 'git-diff' | 'unknown'
  content: string
  metadata?: Record<string, any>
}

export interface RouteContext {
  fileSize?: number
  tokenBudget?: number
  previousRoutes?: ToolRoute[]
  userPreference?: StrategyType
}
