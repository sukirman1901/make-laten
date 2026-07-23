import type { ToolCallLog, StatsData, StatsCollectorConfig } from './types.js'
import { estimateCost } from './types.js'
import fs from 'fs/promises'
import path from 'path'

export class StatsCollector {
  private config: StatsCollectorConfig
  private data: StatsData

  constructor(config: StatsCollectorConfig) {
    this.config = { maxRequests: 1000, ...config }
    this.data = {
      requests: [],
      summary: {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCachedTokens: 0,
        estimatedCost: 0,
        avgCompression: 0,
        toolUsage: {}
      }
    }
  }

  async log(entry: Omit<ToolCallLog, 'id' | 'timestamp'>): Promise<void> {
    const log: ToolCallLog = {
      ...entry,
      id: `req_${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    }

    this.data.requests.push(log)
    if (this.data.requests.length > this.config.maxRequests!) {
      this.data.requests.shift()
    }

    this.updateSummary(log)
    await this.persist()
  }

  getStats(): StatsData {
    return { ...this.data, requests: [...this.data.requests] }
  }

  private updateSummary(log: ToolCallLog): void {
    const s = this.data.summary
    s.totalRequests++
    s.totalInputTokens += log.inputTokens
    s.totalOutputTokens += log.outputTokens
    s.totalCachedTokens += log.cachedTokens
    s.estimatedCost += estimateCost(log.model, log.inputTokens, log.outputTokens)
    s.avgCompression = (s.avgCompression * (s.totalRequests - 1) + log.compressionRatio) / s.totalRequests
    s.toolUsage[log.tool] = (s.toolUsage[log.tool] || 0) + 1
  }

  private async persist(): Promise<void> {
    try {
      const dir = path.dirname(this.config.filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(this.config.filePath, JSON.stringify(this.data, null, 2))
    } catch {}
  }

  static async load(filePath: string): Promise<StatsData> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return {
        requests: [],
        summary: {
          totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0,
          totalCachedTokens: 0, estimatedCost: 0, avgCompression: 0, toolUsage: {}
        }
      }
    }
  }
}
