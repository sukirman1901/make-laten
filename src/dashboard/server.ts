import http from 'http'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { StatsCollector } from '../stats/collector.js'

export interface DashboardConfig {
  port: number
  host?: string
}

export class DashboardServer {
  private config: DashboardConfig
  private server: http.Server | null = null
  private statsPath: string
  private graphPath: string

  constructor(config: DashboardConfig) {
    this.config = { host: 'localhost', ...config }
    this.statsPath = path.join(os.homedir(), '.make-laten', 'stats.json')
    this.graphPath = path.join(process.cwd(), '.make-laten', 'graph.json')
  }

  async start(): Promise<number> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res))
      this.server.listen(this.config.port, this.config.host, () => {
        const addr = this.server!.address()
        const port = typeof addr === 'object' && addr ? addr.port : this.config.port
        resolve(port)
      })
    })
  }

  stop(): void {
    this.server?.close()
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url || '/'

    if (url === '/' || url === '/index.html') {
      await this.serveDashboard(res)
    } else if (url === '/api/stats') {
      await this.serveStats(res)
    } else if (url === '/api/graph') {
      await this.serveGraph(res)
    } else if (url === '/api/patterns') {
      await this.servePatterns(res)
    } else if (url === '/api/failures') {
      await this.serveFailures(res)
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  }

  private async serveDashboard(res: http.ServerResponse): Promise<void> {
    const htmlPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'index.html')
    try {
      const html = await fs.readFile(htmlPath, 'utf-8')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)
    } catch {
      res.writeHead(500)
      res.end('Dashboard HTML not found')
    }
  }

  private async serveStats(res: http.ServerResponse): Promise<void> {
    const data = await StatsCollector.load(this.statsPath)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify(data))
  }

  private async serveGraph(res: http.ServerResponse): Promise<void> {
    try {
      const raw = await fs.readFile(this.graphPath, 'utf-8')
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(raw)
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ nodes: [], edges: [] }))
    }
  }

  private async servePatterns(res: http.ServerResponse): Promise<void> {
    const filePath = path.join(os.homedir(), '.make-laten', 'patterns.json')
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(raw)
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ patterns: [] }))
    }
  }

  private async serveFailures(res: http.ServerResponse): Promise<void> {
    const filePath = path.join(os.homedir(), '.make-laten', 'failures.json')
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(raw)
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ failures: [] }))
    }
  }
}
