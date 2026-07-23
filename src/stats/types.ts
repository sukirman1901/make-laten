export interface ToolCallLog {
  id: string
  tool: string
  timestamp: number
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  compressionRatio: number
  savings: number
  model: string
  success: boolean
  error?: string
}

export interface StatsSummary {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCachedTokens: number
  estimatedCost: number
  avgCompression: number
  toolUsage: Record<string, number>
}

export interface StatsData {
  requests: ToolCallLog[]
  summary: StatsSummary
}

export interface StatsCollectorConfig {
  filePath: string
  maxRequests?: number
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'mimo-v2.5': { input: 0.07, output: 0.28 },
  'glm-5.1': { input: 0.14, output: 0.56 },
  'default': { input: 0.10, output: 0.40 }
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default']
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
}
