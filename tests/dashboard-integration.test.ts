import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { StatsCollector } from '../src/stats/collector.js'
import { DashboardServer } from '../src/dashboard/server.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import http from 'http'

function fetch(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve({ status: res.statusCode || 0, body }))
    }).on('error', reject)
  })
}

describe('Dashboard Integration', () => {
  let server: DashboardServer
  let port: number
  let statsPath: string

  beforeAll(async () => {
    statsPath = path.join(os.homedir(), '.make-laten', 'stats.json')

    const collector = new StatsCollector({ filePath: statsPath })
    await collector.log({ tool: 'read', inputTokens: 5000, outputTokens: 400, cachedTokens: 0, compressionRatio: 0.92, savings: 4600, model: 'mimo-v2.5', success: true })
    await collector.log({ tool: 'grep', inputTokens: 1000, outputTokens: 150, cachedTokens: 0, compressionRatio: 0.85, savings: 850, model: 'mimo-v2.5', success: true })

    server = new DashboardServer({ port: 0 })
    port = await server.start()
  })

  afterAll(() => { server?.stop() })

  it('should serve dashboard HTML', async () => {
    const res = await fetch(`http://localhost:${port}`)
    expect(res.status).toBe(200)
    expect(res.body).toContain('make-laten')
  })

  it('should serve stats API with data', async () => {
    const res = await fetch(`http://localhost:${port}/api/stats`)
    expect(res.status).toBe(200)
    const data = JSON.parse(res.body)
    expect(data.summary.totalRequests).toBeGreaterThanOrEqual(2)
    expect(data.requests.length).toBeGreaterThanOrEqual(2)
  })

  it('should serve graph API', async () => {
    const res = await fetch(`http://localhost:${port}/api/graph`)
    expect(res.status).toBe(200)
    const data = JSON.parse(res.body)
    expect(data).toHaveProperty('nodes')
    expect(data).toHaveProperty('edges')
  })
})
