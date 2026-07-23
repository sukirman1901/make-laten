# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual dashboard to make-laten — token usage, compression stats, code graph, activity feed. Access via `make-laten dashboard` → opens localhost in browser.

**Architecture:** MCP server auto-logs stats to `~/.make-laten/stats.json`. Dashboard is standalone HTTP server reading stats + patterns + graph. Single HTML file with Chart.js + d3-force.

**Tech Stack:** TypeScript, Node.js http module, Chart.js (CDN), d3-force (CDN), CSS Grid, CSS variables, tiktoken

---

## File Structure

```
src/
├── stats/
│   ├── types.ts              # Stats interfaces
│   └── collector.ts          # StatsCollector — log to stats.json
├── dashboard/
│   ├── server.ts             # HTTP server + API endpoints
│   └── index.html            # Single-page dashboard UI
├── cli/commands/
│   ├── dashboard.ts          # CLI: make-laten dashboard
│   └── stats.ts              # CLI: make-laten stats
└── mcp/server.ts             # Modify: add stats logging
```

---

## Task 1: Stats Types & Collector

**Files:**
- Create: `src/stats/types.ts`
- Create: `src/stats/collector.ts`
- Create: `tests/stats.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/stats.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/stats.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement StatsCollector**

```typescript
// src/stats/types.ts
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

// Model pricing per 1M tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'mimo-v2.5': { input: 0.07, output: 0.28 },
  'glm-5.1': { input: 0.14, output: 0.56 },
  'default': { input: 0.10, output: 0.40 }
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default']
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
}
```

```typescript
// src/stats/collector.ts
import type { ToolCallLog, StatsData, StatsSummary, StatsCollectorConfig } from './types.js'
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/stats.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stats/ tests/stats.test.ts
git commit -m "feat: add StatsCollector for tool call logging"
```

---

## Task 2: MCP Server Stats Logging

**Files:**
- Modify: `src/mcp/server.ts`

- [ ] **Step 1: Add StatsCollector import and instance**

Add after existing imports (around line 15):
```typescript
import { StatsCollector } from '../stats/collector.js'
import path from 'path'
import os from 'os'
```

Add after existing singletons (around line 34):
```typescript
const statsCollector = new StatsCollector({
  filePath: path.join(os.homedir(), '.make-laten', 'stats.json')
})
```

- [ ] **Step 2: Create logging wrapper**

Add before the handlers object:
```typescript
async function logToolCall(tool: string, params: any, result: any, startMs: number) {
  const duration = Date.now() - startMs
  const outputText = result?.content?.[0]?.text || ''
  const inputText = JSON.stringify(params)

  // Estimate tokens (rough: 1 token ≈ 4 chars)
  const inputTokens = Math.ceil(inputText.length / 4)
  const outputTokens = Math.ceil(outputText.length / 4)

  // Check if result was cached
  const cachedTokens = result?.metadata?.cached ? inputTokens : 0

  // Calculate compression if available
  const savings = result?.savings || 0
  const compressionRatio = savings > 0 ? savings / (inputTokens + outputTokens + savings) : 0

  await statsCollector.log({
    tool,
    inputTokens,
    outputTokens,
    cachedTokens,
    compressionRatio,
    savings,
    model: 'mimo-v2.5', // default, will be overridden by agent
    success: !result?.isError
  })
}
```

- [ ] **Step 3: Wrap handler calls**

In `handleLine` function, replace the handler call block:
```typescript
// Before:
try {
  const result = await handler(params || {})
  sendResponse(request.id, result)
} catch (error: any) {

// After:
try {
  const startMs = Date.now()
  const result = await handler(params || {})
  await logToolCall(name, params, result, startMs)
  sendResponse(request.id, result)
} catch (error: any) {
```

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/mcp/server.ts
git commit -m "feat: add auto stats logging to MCP server"
```

---

## Task 3: Dashboard HTTP Server

**Files:**
- Create: `src/dashboard/server.ts`
- Create: `tests/dashboard-server.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/dashboard-server.test.ts
import { describe, it, expect } from 'vitest'
import { DashboardServer } from '../src/dashboard/server.js'
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

describe('DashboardServer', () => {
  it('should serve dashboard HTML', async () => {
    const server = new DashboardServer({ port: 0 })
    const port = await server.start()
    
    try {
      const res = await fetch(`http://localhost:${port}`)
      expect(res.status).toBe(200)
      expect(res.body).toContain('make-laten')
      expect(res.body).toContain('<html')
    } finally {
      server.stop()
    }
  })

  it('should serve stats API', async () => {
    const server = new DashboardServer({ port: 0 })
    const port = await server.start()
    
    try {
      const res = await fetch(`http://localhost:${port}/api/stats`)
      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('requests')
    } finally {
      server.stop()
    }
  })

  it('should serve graph API', async () => {
    const server = new DashboardServer({ port: 0 })
    const port = await server.start()
    
    try {
      const res = await fetch(`http://localhost:${port}/api/graph`)
      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data).toHaveProperty('nodes')
      expect(data).toHaveProperty('edges')
    } finally {
      server.stop()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dashboard-server.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement DashboardServer**

```typescript
// src/dashboard/server.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dashboard-server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/server.ts tests/dashboard-server.test.ts
git commit -m "feat: add DashboardServer with API endpoints"
```

---

## Task 4: Dashboard HTML — Layout & CSS

**Files:**
- Create: `src/dashboard/index.html`

This is the main dashboard UI. Single HTML file with inline CSS and JS.

- [ ] **Step 1: Create the HTML structure with CSS**

Create `src/dashboard/index.html` with:
- Dark mode theme (CSS variables)
- Sidebar navigation
- Main content area
- Responsive grid layout
- Chart.js and d3-force loaded from CDN

**Frontend Expert guidelines applied:**
- CSS custom properties for theme tokens
- Glassmorphism: subtle borders, backdrop-filter blur, multi-layered box shadows
- Micro-interactions: cubic-bezier transitions on hover/focus
- Semantic HTML: `<header>`, `<main>`, `<nav>`, `<section>`
- WCAG AA contrast ratios
- Mobile-first responsive design

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>make-laten dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
  <style>
    :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-card: rgba(20, 20, 30, 0.8);
      --bg-card-hover: rgba(25, 25, 40, 0.9);
      --border: rgba(255, 255, 255, 0.06);
      --text-primary: #e4e4e7;
      --text-secondary: #a1a1aa;
      --text-muted: #71717a;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --success: #22c55e;
      --warning: #eab308;
      --danger: #ef4444;
      --radius: 12px;
      --radius-sm: 8px;
      --shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
      --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--font);
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }

    /* Layout */
    .app {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
    }

    /* Sidebar */
    .sidebar {
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sidebar-logo {
      font-size: 18px;
      font-weight: 700;
      padding: 0 12px 24px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sidebar-logo span { color: var(--accent); }

    .nav-item {
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .nav-item:hover {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: rgba(99, 102, 241, 0.15);
      color: var(--accent);
    }

    /* Main */
    .main {
      padding: 32px;
      overflow-y: auto;
    }

    .page { display: none; }
    .page.active { display: block; }

    /* Cards */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      backdrop-filter: blur(10px);
      transition: var(--transition);
    }

    .card:hover {
      background: var(--bg-card-hover);
      box-shadow: var(--shadow);
      transform: translateY(-2px);
    }

    .card-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .card-value {
      font-size: 28px;
      font-weight: 700;
      font-family: var(--font-mono);
    }

    .card-value.accent { color: var(--accent); }
    .card-value.success { color: var(--success); }
    .card-value.warning { color: var(--warning); }

    /* Charts */
    .chart-container {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 24px;
    }

    .chart-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-secondary);
    }

    /* Table */
    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
    }

    td {
      padding: 12px 16px;
      font-size: 14px;
      border-bottom: 1px solid var(--border);
    }

    tr:hover td { background: rgba(99, 102, 241, 0.05); }

    /* Graph */
    #graph-container {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      height: 600px;
      position: relative;
      overflow: hidden;
    }

    #graph-container svg { width: 100%; height: 100%; }

    .graph-node {
      cursor: pointer;
      transition: var(--transition);
    }

    .graph-node:hover { filter: brightness(1.3); }

    .graph-label {
      font-size: 10px;
      fill: var(--text-secondary);
      pointer-events: none;
    }

    .graph-link {
      stroke: var(--border);
      stroke-opacity: 0.6;
    }

    /* Badge */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-success { background: rgba(34, 197, 94, 0.15); color: var(--success); }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
    .badge-warning { background: rgba(234, 179, 8, 0.15); color: var(--warning); }

    /* Responsive */
    @media (max-width: 768px) {
      .app { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .main { padding: 16px; }
      .cards { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="app">
    <nav class="sidebar">
      <div class="sidebar-logo">
        <span>⚡</span> make-laten
      </div>
      <div class="nav-item active" data-page="overview">📊 Overview</div>
      <div class="nav-item" data-page="tokens">📈 Tokens</div>
      <div class="nav-item" data-page="compress">🗜️ Compress</div>
      <div class="nav-item" data-page="learn">🧠 Learn</div>
      <div class="nav-item" data-page="cache">📉 Cache</div>
      <div class="nav-item" data-page="graph">🔗 Graph</div>
      <div class="nav-item" data-page="activity">📋 Activity</div>
    </nav>

    <main class="main">
      <!-- Overview Page -->
      <section id="page-overview" class="page active">
        <div class="cards" id="summary-cards"></div>
        <div class="chart-container">
          <div class="chart-title">Token Usage Over Time</div>
          <canvas id="token-chart"></canvas>
        </div>
        <div class="chart-container">
          <div class="chart-title">Tool Usage</div>
          <canvas id="tool-chart"></canvas>
        </div>
      </section>

      <!-- Tokens Page -->
      <section id="page-tokens" class="page">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Model</th>
                <th>Input</th>
                <th>Output</th>
                <th>Cached</th>
                <th>Savings</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody id="tokens-table"></tbody>
          </table>
        </div>
      </section>

      <!-- Compress Page -->
      <section id="page-compress" class="page">
        <div class="cards" id="compress-cards"></div>
        <div class="chart-container">
          <div class="chart-title">Compression Ratio by Tool</div>
          <canvas id="compress-chart"></canvas>
        </div>
      </section>

      <!-- Learn Page -->
      <section id="page-learn" class="page">
        <div class="cards" id="learn-cards"></div>
        <div class="chart-container">
          <div class="chart-title">Patterns</div>
          <div id="patterns-list"></div>
        </div>
        <div class="chart-container">
          <div class="chart-title">Failures</div>
          <div id="failures-list"></div>
        </div>
      </section>

      <!-- Cache Page -->
      <section id="page-cache" class="page">
        <div class="cards" id="cache-cards"></div>
      </section>

      <!-- Graph Page -->
      <section id="page-graph" class="page">
        <div id="graph-container"></div>
      </section>

      <!-- Activity Page -->
      <section id="page-activity" class="page">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Tool</th>
                <th>Status</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody id="activity-table"></tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

  <script>
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
        item.classList.add('active')
        document.getElementById(`page-${item.dataset.page}`).classList.add('active')
      })
    })

    // Data loading
    async function loadStats() {
      const res = await fetch('/api/stats')
      return res.json()
    }

    async function loadGraph() {
      const res = await fetch('/api/graph')
      return res.json()
    }

    async function loadPatterns() {
      const res = await fetch('/api/patterns')
      return res.json()
    }

    async function loadFailures() {
      const res = await fetch('/api/failures')
      return res.json()
    }

    // Format helpers
    function formatTokens(n) {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
      if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
      return n.toString()
    }

    function formatCost(n) {
      return '~$' + n.toFixed(2)
    }

    function formatTime(ts) {
      return new Date(ts).toLocaleString()
    }

    // Overview page
    async function renderOverview() {
      const data = await loadStats()
      const s = data.summary

      document.getElementById('summary-cards').innerHTML = `
        <div class="card">
          <div class="card-label">Total Requests</div>
          <div class="card-value accent">${s.totalRequests}</div>
        </div>
        <div class="card">
          <div class="card-label">Input Tokens</div>
          <div class="card-value">${formatTokens(s.totalInputTokens)}</div>
        </div>
        <div class="card">
          <div class="card-label">Cached Tokens</div>
          <div class="card-value success">${formatTokens(s.totalCachedTokens)}</div>
        </div>
        <div class="card">
          <div class="card-label">Output Tokens</div>
          <div class="card-value">${formatTokens(s.totalOutputTokens)}</div>
        </div>
        <div class="card">
          <div class="card-label">Estimated Cost</div>
          <div class="card-value warning">${formatCost(s.estimatedCost)}</div>
        </div>
        <div class="card">
          <div class="card-label">Avg Compression</div>
          <div class="card-value success">${(s.avgCompression * 100).toFixed(0)}%</div>
        </div>
      `

      // Token usage chart
      const recent = data.requests.slice(-50)
      new Chart(document.getElementById('token-chart'), {
        type: 'line',
        data: {
          labels: recent.map((r, i) => i),
          datasets: [
            { label: 'Input', data: recent.map(r => r.inputTokens), borderColor: '#6366f1', fill: true, backgroundColor: 'rgba(99,102,241,0.1)' },
            { label: 'Output', data: recent.map(r => r.outputTokens), borderColor: '#22c55e', fill: true, backgroundColor: 'rgba(34,197,94,0.1)' },
            { label: 'Cached', data: recent.map(r => r.cachedTokens), borderColor: '#eab308', fill: true, backgroundColor: 'rgba(234,179,8,0.1)' }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#a1a1aa' } } },
          scales: {
            x: { display: false },
            y: { ticks: { color: '#71717a' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      })

      // Tool usage chart
      const toolLabels = Object.keys(s.toolUsage)
      const toolValues = Object.values(s.toolUsage)
      new Chart(document.getElementById('tool-chart'), {
        type: 'bar',
        data: {
          labels: toolLabels,
          datasets: [{ label: 'Calls', data: toolValues, backgroundColor: '#6366f1' }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#71717a' }, grid: { display: false } },
            y: { ticks: { color: '#71717a' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      })
    }

    // Tokens page
    async function renderTokens() {
      const data = await loadStats()
      const rows = data.requests.slice().reverse().map(r => `
        <tr>
          <td><span class="badge badge-success">${r.tool}</span></td>
          <td>${r.model}</td>
          <td>${formatTokens(r.inputTokens)}</td>
          <td>${formatTokens(r.outputTokens)}</td>
          <td>${formatTokens(r.cachedTokens)}</td>
          <td>${(r.compressionRatio * 100).toFixed(0)}%</td>
          <td>${formatTime(r.timestamp)}</td>
        </tr>
      `).join('')
      document.getElementById('tokens-table').innerHTML = rows
    }

    // Graph page
    async function renderGraph() {
      const graph = await loadGraph()
      const container = document.getElementById('graph-container')
      const width = container.clientWidth
      const height = container.clientHeight

      const svg = d3.select('#graph-container').append('svg')
        .attr('width', width).attr('height', height)

      const simulation = d3.forceSimulation(graph.nodes)
        .force('link', d3.forceLink(graph.edges).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))

      const link = svg.append('g').selectAll('line')
        .data(graph.edges).enter().append('line')
        .attr('class', 'graph-link')

      const node = svg.append('g').selectAll('circle')
        .data(graph.nodes).enter().append('circle')
        .attr('class', 'graph-node')
        .attr('r', d => d.type === 'file' ? 8 : 5)
        .attr('fill', d => {
          const colors = { file: '#6366f1', function: '#22c55e', class: '#eab308', method: '#ef4444', import: '#71717a' }
          return colors[d.type] || '#71717a'
        })
        .call(d3.drag()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
        )

      const label = svg.append('g').selectAll('text')
        .data(graph.nodes).enter().append('text')
        .attr('class', 'graph-label')
        .attr('dx', 12).attr('dy', 4)
        .text(d => d.name.split('/').pop())

      simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        node.attr('cx', d => d.x).attr('cy', d => d.y)
        label.attr('x', d => d.x).attr('y', d => d.y)
      })
    }

    // Init
    renderOverview()
    renderTokens()
    renderGraph()
  </script>
</body>
</html>
```

- [ ] **Step 4: Test by starting server manually**

Run: `npx tsx src/dashboard/server.ts`
Open: `http://localhost:3456`
Expected: Dashboard loads with charts and data

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/index.html
git commit -m "feat: add dashboard HTML with charts and graph visualization"
```

---

## Task 5: CLI Dashboard Command

**Files:**
- Create: `src/cli/commands/dashboard.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Create dashboard command**

```typescript
// src/cli/commands/dashboard.ts
import { Command } from 'commander'
import { DashboardServer } from '../../dashboard/server.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dashboardCommand = new Command('dashboard')
  .description('Start dashboard in browser')
  .option('-p, --port <port>', 'Port number', '3456')
  .option('--no-open', 'Don\'t auto-open browser')
  .action(async (options) => {
    const port = parseInt(options.port, 10)
    const server = new DashboardServer({ port })

    const actualPort = await server.start()
    console.log(`⚡ Dashboard running at http://localhost:${actualPort}`)

    if (options.open) {
      const url = `http://localhost:${actualPort}`
      try {
        await execAsync(`open ${url}`)
      } catch {
        // macOS open failed, try xdg-open
        try {
          await execAsync(`xdg-open ${url}`)
        } catch {
          console.log(`Open ${url} in your browser`)
        }
      }
    }

    console.log('Press Ctrl+C to stop')
    process.on('SIGINT', () => {
      server.stop()
      process.exit(0)
    })
  })
```

- [ ] **Step 2: Register in CLI**

In `src/cli/index.ts`, add import and register:
```typescript
import { dashboardCommand } from './commands/dashboard.js'

// After existing commands
program.addCommand(dashboardCommand)
```

- [ ] **Step 3: Test CLI command**

Run: `npx tsx src/cli/index.ts dashboard --port 3457`
Expected: Server starts, prints URL

- [ ] **Step 4: Commit**

```bash
git add src/cli/commands/dashboard.ts src/cli/index.ts
git commit -m "feat: add make-laten dashboard CLI command"
```

---

## Task 6: CLI Stats Command

**Files:**
- Create: `src/cli/commands/stats.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Create stats command**

```typescript
// src/cli/commands/stats.ts
import { Command } from 'commander'
import { StatsCollector } from '../../stats/collector.js'
import path from 'path'
import os from 'os'

export const statsCommand = new Command('stats')
  .description('Show usage statistics')
  .action(async () => {
    const statsPath = path.join(os.homedir(), '.make-laten', 'stats.json')
    const data = await StatsCollector.load(statsPath)
    const s = data.summary

    console.log('\n⚡ make-laten Stats\n')
    console.log(`  Total Requests:    ${s.totalRequests}`)
    console.log(`  Input Tokens:      ${formatTokens(s.totalInputTokens)}`)
    console.log(`  Output Tokens:     ${formatTokens(s.totalOutputTokens)}`)
    console.log(`  Cached Tokens:     ${formatTokens(s.totalCachedTokens)}`)
    console.log(`  Estimated Cost:    ~$${s.estimatedCost.toFixed(2)}`)
    console.log(`  Avg Compression:   ${(s.avgCompression * 100).toFixed(0)}%`)
    console.log('\n  Tool Usage:')
    for (const [tool, count] of Object.entries(s.toolUsage)) {
      console.log(`    ${tool}: ${count}`)
    }
    console.log('')
  })

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}
```

- [ ] **Step 2: Register in CLI**

In `src/cli/index.ts`, add import and register:
```typescript
import { statsCommand } from './commands/stats.js'

program.addCommand(statsCommand)
```

- [ ] **Step 3: Test CLI command**

Run: `npx tsx src/cli/index.ts stats`
Expected: Prints formatted stats

- [ ] **Step 4: Commit**

```bash
git add src/cli/commands/stats.ts src/cli/index.ts
git commit -m "feat: add make-laten stats CLI command"
```

---

## Task 7: Integration Test

**Files:**
- Create: `tests/dashboard-integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// tests/dashboard-integration.test.ts
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
  let tempDir: string
  let server: DashboardServer
  let port: number

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dashboard-int-'))

    // Create stats
    const collector = new StatsCollector({ filePath: path.join(tempDir, 'stats.json') })
    await collector.log({ tool: 'read', inputTokens: 5000, outputTokens: 400, cachedTokens: 0, compressionRatio: 0.92, savings: 4600, model: 'mimo-v2.5', success: true })
    await collector.log({ tool: 'grep', inputTokens: 1000, outputTokens: 150, cachedTokens: 0, compressionRatio: 0.85, savings: 850, model: 'mimo-v2.5', success: true })

    // Start server
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
    expect(data.summary.totalRequests).toBe(2)
    expect(data.requests.length).toBe(2)
  })

  it('should serve graph API', async () => {
    const res = await fetch(`http://localhost:${port}/api/graph`)
    expect(res.status).toBe(200)
    const data = JSON.parse(res.body)
    expect(data).toHaveProperty('nodes')
    expect(data).toHaveProperty('edges')
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/dashboard-integration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add -f tests/dashboard-integration.test.ts
git commit -m "test: add dashboard integration tests"
```

---

## Task 8: Documentation & Release

**Files:**
- Modify: `README.md`
- Modify: `skills/SKILL.md`
- Modify: `package.json`

- [ ] **Step 1: Update README**

Add dashboard section after "Code Intelligence":

```markdown
## Dashboard

Visual dashboard for token usage, compression stats, and code graph.

```bash
make-laten dashboard        # open in browser
make-laten dashboard --port 8080  # custom port
make-laten stats            # quick text stats
```

### Features
- 📊 Overview: total requests, tokens, cost, compression
- 📈 Tokens: per-request table with model, input/output, timestamp
- 🗜️ Compress: per-tool compression ratios
- 🧠 Learn: patterns, failures, corrections
- 📉 Cache: hit rate, cache size
- 🔗 Graph: interactive force-directed code graph
- 📋 Activity: request timeline, error log
```

- [ ] **Step 2: Update SKILL.md trigger rules**

Add to trigger rules:
```markdown
### Dashboard
| User Says | Agent Does |
|-----------|------------|
| "show stats", "dashboard", "open dashboard" | → make-laten dashboard |
| "how many tokens", "token usage" | → make-laten stats |
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Build and publish**

```bash
npm version minor && npm publish
```

- [ ] **Step 5: Commit**

```bash
git add README.md skills/SKILL.md package.json package-lock.json
git commit -m "docs: add dashboard documentation and bump version"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Stats Types & Collector | src/stats/ |
| 2 | MCP Server Logging | src/mcp/server.ts |
| 3 | Dashboard HTTP Server | src/dashboard/server.ts |
| 4 | Dashboard HTML UI | src/dashboard/index.html |
| 5 | CLI Dashboard Command | src/cli/commands/dashboard.ts |
| 6 | CLI Stats Command | src/cli/commands/stats.ts |
| 7 | Integration Test | tests/dashboard-integration.test.ts |
| 8 | Documentation & Release | README.md, SKILL.md |

**Total Files Created:** 7
**Total Files Modified:** 4
**Total Tests:** ~15
