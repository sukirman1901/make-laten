import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StatsCollector } from '../src/stats/collector.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('StatsCollector', () => {
  let collector: StatsCollector
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stats-test-'))
    collector = new StatsCollector({ filePath: path.join(tempDir, 'stats.json') })
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('should log a tool call', async () => {
    await collector.log({
      tool: 'read',
      inputTokens: 4500,
      outputTokens: 320,
      cachedTokens: 0,
      compressionRatio: 0.91,
      savings: 4180,
      model: 'mimo-v2.5',
      success: true
    })

    const stats = collector.getStats()
    expect(stats.summary.totalRequests).toBe(1)
    expect(stats.summary.totalInputTokens).toBe(4500)
    expect(stats.summary.totalOutputTokens).toBe(320)
  })

  it('should persist to disk', async () => {
    await collector.log({
      tool: 'grep',
      inputTokens: 1000,
      outputTokens: 100,
      cachedTokens: 0,
      compressionRatio: 0.85,
      savings: 850,
      model: 'mimo-v2.5',
      success: true
    })

    const loaded = await StatsCollector.load(path.join(tempDir, 'stats.json'))
    expect(loaded.summary.totalRequests).toBe(1)
  })

  it('should calculate estimated cost', async () => {
    await collector.log({
      tool: 'read',
      inputTokens: 1000000,
      outputTokens: 100000,
      cachedTokens: 0,
      compressionRatio: 0.91,
      savings: 910000,
      model: 'mimo-v2.5',
      success: true
    })

    const stats = collector.getStats()
    expect(stats.summary.estimatedCost).toBeGreaterThan(0)
  })

  it('should track tool usage counts', async () => {
    await collector.log({ tool: 'read', inputTokens: 100, outputTokens: 10, cachedTokens: 0, compressionRatio: 0.9, savings: 90, model: 'mimo-v2.5', success: true })
    await collector.log({ tool: 'read', inputTokens: 200, outputTokens: 20, cachedTokens: 0, compressionRatio: 0.9, savings: 180, model: 'mimo-v2.5', success: true })
    await collector.log({ tool: 'grep', inputTokens: 300, outputTokens: 30, cachedTokens: 0, compressionRatio: 0.85, savings: 255, model: 'mimo-v2.5', success: true })

    const stats = collector.getStats()
    expect(stats.summary.toolUsage['read']).toBe(2)
    expect(stats.summary.toolUsage['grep']).toBe(1)
  })
})
