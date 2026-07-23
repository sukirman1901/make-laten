#!/usr/bin/env node

import { FileReadCompressor } from '../compress/file-read.js'
import { GrepCompressor } from '../compress/grep.js'
import { GitDiffCompressor } from '../compress/git-diff.js'
import { GitStatusCompressor } from '../compress/git-status.js'
import { DetailExpander } from '../compress/detail-expander.js'
import { SessionIRStore } from '../compress/session-ir-store.js'
import { ToolRouter } from '../route/tool-router.js'
import { StrategyRouter } from '../route/strategy-router.js'
import { PatternMiner } from '../learn/pattern-miner.js'
import { FailureLearner } from '../learn/failure-learner.js'
import { AutoCorrect } from '../correct/auto-correct.js'
import { SessionCache } from '../cache/l1-session.js'
import { WebRouter } from '../web/router.js'
import { SemanticTool } from '../tool/semantic-tool.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import { statSync } from 'fs'

const execAsync = promisify(exec)

// Singletons
const sessionCache = new SessionCache()
const irStore = new SessionIRStore()
const detailExpander = new DetailExpander({ store: irStore })
const toolRouter = new ToolRouter()
const strategyRouter = new StrategyRouter()
const patternMiner = new PatternMiner()
const failureLearner = new FailureLearner()
const autoCorrect = new AutoCorrect()
const webRouter = new WebRouter()

const TOOLS = [
  // Compress Layer
  {
    name: 'read',
    description: 'Read files with 85% token savings — use INSTEAD of Read tool',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to file' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'read-detail',
    description: 'Expand zero-loss detail from overview — use AFTER read tool',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to file' },
        symbol: { type: 'string', description: 'Symbol name or Parent.method' },
        start: { type: 'number', description: 'Start line (1-based, with end)' },
        end: { type: 'number', description: 'End line (1-based inclusive)' },
        export: { type: 'string', description: 'Export/type name' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'grep',
    description: 'Search code grouped by file — use INSTEAD of grep/rg command',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern' },
        path: { type: 'string', description: 'Directory to search', default: '.' }
      },
      required: ['pattern']
    }
  },
  {
    name: 'git-diff',
    description: 'Show git changes with 85% savings — use INSTEAD of git diff',
    inputSchema: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'Show staged changes', default: false }
      }
    }
  },
  {
    name: 'git-status',
    description: 'Show git status grouped by type — use INSTEAD of git status',
    inputSchema: { type: 'object', properties: {} }
  },

  // Route Layer
  {
    name: 'route',
    description: 'Route input to best compressor — use when unsure which tool',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['file', 'grep', 'git-diff', 'unknown'], description: 'Input type' },
        content: { type: 'string', description: 'Input content' }
      },
      required: ['type', 'content']
    }
  },
  {
    name: 'strategy',
    description: 'Pick compression level — conservative/balanced/aggressive',
    inputSchema: {
      type: 'object',
      properties: {
        file_size: { type: 'number', description: 'File size in bytes' },
        preference: { type: 'string', enum: ['aggressive', 'balanced', 'conservative'], description: 'Strategy preference' }
      }
    }
  },

  // Cache Layer
  {
    name: 'cache-stats',
    description: 'Show cache hit rate — check if caching helps',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'cache-get',
    description: 'Get cached value — faster than re-computing',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Cache key' }
      },
      required: ['key']
    }
  },
  {
    name: 'cache-set',
    description: 'Cache result for session — save tokens on repeat',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Cache key' },
        value: { type: 'string', description: 'Value to cache' }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'cache-clear',
    description: 'Clear session cache — fresh start',
    inputSchema: { type: 'object', properties: {} }
  },

  // Learn Layer
  {
    name: 'patterns',
    description: 'Show learned patterns — check what works',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'failures',
    description: 'Show failure records — learn from mistakes',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'suggestions',
    description: 'Get smart suggestions — based on patterns',
    inputSchema: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Context for suggestions' }
      }
    }
  },

  // Correct Layer
  {
    name: 'correct',
    description: 'Fix typos in text — use before sending',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to correct' }
      },
      required: ['text']
    }
  },

  // Web Layer
  {
    name: 'search',
    description: 'Web search with compression — use INSTEAD of websearch',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        backend: { type: 'string', description: 'Search backend (duckduckgo, exa, tavily)' }
      },
      required: ['query']
    }
  },
  {
    name: 'fetch',
    description: 'Fetch URL with 75% savings — use INSTEAD of webfetch',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        extract: { type: 'boolean', description: 'Extract semantic content', default: true }
      },
      required: ['url']
    }
  },

  // Tool Layer
  {
    name: 'tools',
    description: 'List all make-laten tools — check what\'s available',
    inputSchema: { type: 'object', properties: {} }
  },

  // Code Intel Layer
  {
    name: 'query',
    description: 'Query the code graph — find, explain, path, impact',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['explain', 'path', 'search', 'impact'], description: 'Query type' },
        symbol: { type: 'string', description: 'Symbol name (for explain/impact)' },
        source: { type: 'string', description: 'Source symbol (for path)' },
        target: { type: 'string', description: 'Target symbol (for path)' },
        query: { type: 'string', description: 'Search query (for search)' }
      },
      required: ['type']
    }
  },
  {
    name: 'explain',
    description: 'Explain a symbol — its purpose, connections, location',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Symbol name to explain' }
      },
      required: ['symbol']
    }
  },
  {
    name: 'path',
    description: 'Find shortest path between two symbols',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source symbol' },
        target: { type: 'string', description: 'Target symbol' }
      },
      required: ['source', 'target']
    }
  },
  {
    name: 'impact',
    description: 'Analyze impact — what breaks if symbol changes',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Symbol to analyze' }
      },
      required: ['symbol']
    }
  },
  {
    name: 'code-search',
    description: 'Search symbols in code graph',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'build-graph',
    description: 'Build or update code graph for directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path', default: '.' },
        update: { type: 'boolean', description: 'Update existing graph', default: false }
      }
    }
  }
]

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown'
  }
  return map[ext] || 'text'
}

// Compress handlers
async function handleRead(params: { file_path: string }) {
  const content = await fs.readFile(params.file_path, 'utf-8')
  const mtimeMs = statSync(params.file_path).mtimeMs
  const compressor = new FileReadCompressor()
  const result = await compressor.compress({
    content,
    filePath: params.file_path,
    language: detectLanguage(params.file_path),
    mtimeMs
  } as any)

  if (result.metadata.ir) {
    irStore.set(result.metadata.ir)
  }

  patternMiner.record({
    type: 'overview_read',
    input: { file: params.file_path, irId: result.metadata.irId },
    output: { savings: result.metadata.savings },
    success: true
  })
  sessionCache.set(`file:${params.file_path}`, { content: result.content, metadata: result.metadata })
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        compressed: result.content,
        savings: result.metadata.savings,
        confidence: result.confidence,
        irId: result.metadata.irId,
        symbols: result.metadata.symbols
      })
    }]
  }
}

async function handleReadDetail(params: {
  file_path: string
  symbol?: string
  start?: number
  end?: number
  export?: string
}) {
  const content = await fs.readFile(params.file_path, 'utf-8')
  const mtimeMs = statSync(params.file_path).mtimeMs

  let focus: import('../compress/detail-expander.js').DetailFocus | null = null
  if (params.symbol) focus = { type: 'symbol', name: params.symbol }
  else if (params.export) focus = { type: 'export', name: params.export }
  else if (params.start != null && params.end != null) {
    focus = { type: 'range', start: params.start, end: params.end }
  }

  if (!focus) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: false,
          code: 'invalid_focus',
          message: 'Provide symbol, export, or start+end'
        })
      }],
      isError: true
    }
  }

  const result = await detailExpander.expand({
    content,
    filePath: params.file_path,
    mtimeMs,
    focus
  })

  patternMiner.record({
    type: 'detail_expand',
    input: { file: params.file_path, focus },
    output: result.ok ? { range: result.range } : { code: result.code },
    success: result.ok
  })

  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    isError: !result.ok
  }
}

async function handleGrep(params: { pattern: string; path?: string }) {
  const dir = params.path || '.'
  const { stdout } = await execAsync(`grep -rn "${params.pattern}" ${dir} 2>/dev/null || true`, { maxBuffer: 10 * 1024 * 1024 })

  if (!stdout.trim()) {
    return { content: [{ type: 'text', text: JSON.stringify({ matches: [], total: 0 }) }] }
  }

  const matches = stdout.split('\n').filter(Boolean).map(line => {
    const parts = line.split(':')
    return { file: parts[0], line: parseInt(parts[1], 10) || 0, content: parts.slice(2).join(':').trim() }
  })

  const compressor = new GrepCompressor()
  const result = await compressor.compress({ results: matches, pattern: params.pattern, directory: dir })
  patternMiner.record({ type: 'grep', input: { pattern: params.pattern, dir }, success: true })
  return { content: [{ type: 'text', text: JSON.stringify({ compressed: result.content, total: matches.length, savings: result.metadata.savings }) }] }
}

async function handleGitDiff(params: { staged?: boolean }) {
  const flag = params.staged ? '--staged' : ''
  const { stdout } = await execAsync(`git diff ${flag}`, { maxBuffer: 10 * 1024 * 1024 })

  if (!stdout.trim()) {
    return { content: [{ type: 'text', text: JSON.stringify({ diff: '', changes: 0 }) }] }
  }

  const compressor = new GitDiffCompressor()
  const result = await compressor.compress({ diff: stdout })
  patternMiner.record({ type: 'git-diff', input: { staged: params.staged }, success: true })
  return { content: [{ type: 'text', text: JSON.stringify({ compressed: result.content, savings: result.metadata.savings }) }] }
}

async function handleGitStatus() {
  const { stdout } = await execAsync('git status --porcelain')
  const compressor = new GitStatusCompressor()
  const result = await compressor.compress({ status: stdout })
  return { content: [{ type: 'text', text: JSON.stringify({ compressed: result.content, savings: result.metadata.savings }) }] }
}

// Route handlers
async function handleRoute(params: { type: string; content: string }) {
  const route = toolRouter.route({ type: params.type as any, content: params.content })
  return { content: [{ type: 'text', text: JSON.stringify(route) }] }
}

async function handleStrategy(params: { file_size?: number; preference?: string }) {
  const strategy = strategyRouter.select({
    fileSize: params.file_size,
    userPreference: params.preference as any
  })
  return { content: [{ type: 'text', text: JSON.stringify(strategy) }] }
}

// Cache handlers
async function handleCacheStats() {
  const stats = sessionCache.stats()
  return { content: [{ type: 'text', text: JSON.stringify(stats) }] }
}

async function handleCacheGet(params: { key: string }) {
  const entry = sessionCache.get(params.key)
  return { content: [{ type: 'text', text: JSON.stringify({ found: !!entry, entry }) }] }
}

async function handleCacheSet(params: { key: string; value: string }) {
  sessionCache.set(params.key, { content: params.value, metadata: { setAt: Date.now() } })
  return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
}

async function handleCacheClear() {
  sessionCache.clear()
  return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
}

// Learn handlers
async function handlePatterns() {
  const patterns = patternMiner.getPatterns()
  return { content: [{ type: 'text', text: JSON.stringify({ patterns, total: patterns.length }) }] }
}

async function handleFailures() {
  const failures = failureLearner.getFailures()
  return { content: [{ type: 'text', text: JSON.stringify({ failures, total: failures.length }) }] }
}

async function handleSuggestions(params: { context?: string }) {
  const patterns = patternMiner.getPatterns()
  const failures = failureLearner.getFailures()
  const suggestions: string[] = []

  for (const pattern of patterns.slice(0, 5)) {
    suggestions.push(`Pattern: ${pattern.type} (confidence: ${pattern.confidence})`)
  }

  for (const failure of failures.slice(0, 5)) {
    const failureSuggestions = failureLearner.getSuggestions(failure.type)
    suggestions.push(...failureSuggestions)
  }

  return { content: [{ type: 'text', text: JSON.stringify({ suggestions: [...new Set(suggestions)] }) }] }
}

// Correct handler
async function handleCorrect(params: { text: string }) {
  const corrected = autoCorrect.correct(params.text)
  const stats = autoCorrect.getStats()
  return { content: [{ type: 'text', text: JSON.stringify({ original: params.text, corrected, corrections: stats.applied }) }] }
}

// Web handlers
async function handleSearch(params: { query: string; backend?: string }) {
  const results = await webRouter.search(params.query, { backend: params.backend as any })
  return { content: [{ type: 'text', text: JSON.stringify({ results, total: results.length }) }] }
}

async function handleFetch(params: { url: string; extract?: boolean }) {
  const result = await webRouter.fetch(params.url, { extract: params.extract !== false })
  return { content: [{ type: 'text', text: JSON.stringify({ url: result.url, title: result.title, content: result.content, savings: result.metadata.savings }) }] }
}

// Tool handler
async function handleTools() {
  const tools = TOOLS.map(t => ({ name: t.name, description: t.description }))
  return { content: [{ type: 'text', text: JSON.stringify({ tools, total: tools.length }) }] }
}

// Code Intel handlers (placeholder — wired in Task 9)
async function handleQuery(params: { type: string; symbol?: string; source?: string; target?: string; query?: string }) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: 'Query engine not yet connected' }) }] }
}

async function handleExplain(params: { symbol: string }) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: 'Explain not yet connected' }) }] }
}

async function handlePath(params: { source: string; target: string }) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: 'Path not yet connected' }) }] }
}

async function handleImpact(params: { symbol: string }) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: 'Impact not yet connected' }) }] }
}

async function handleCodeSearch(params: { query: string }) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: 'Search not yet connected' }) }] }
}

async function handleBuildGraph(params: { path?: string; update?: boolean }) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: 'Build graph not yet connected' }) }] }
}

const handlers: Record<string, (params: any) => Promise<any>> = {
  'read': handleRead,
  'read-detail': handleReadDetail,
  'grep': handleGrep,
  'git-diff': handleGitDiff,
  'git-status': handleGitStatus,
  'route': handleRoute,
  'strategy': handleStrategy,
  'cache-stats': handleCacheStats,
  'cache-get': handleCacheGet,
  'cache-set': handleCacheSet,
  'cache-clear': handleCacheClear,
  'patterns': handlePatterns,
  'failures': handleFailures,
  'suggestions': handleSuggestions,
  'correct': handleCorrect,
  'search': handleSearch,
  'fetch': handleFetch,
  'tools': handleTools,
  // Code Intel handlers
  'query': handleQuery,
  'explain': handleExplain,
  'path': handlePath,
  'impact': handleImpact,
  'code-search': handleCodeSearch,
  'build-graph': handleBuildGraph
}

let requestId = 0

function sendResponse(id: number, result: any) {
  const response = { jsonrpc: '2.0', id, result }
  process.stdout.write(JSON.stringify(response) + '\n')
}

function sendError(id: number, code: number, message: string) {
  const response = { jsonrpc: '2.0', id, error: { code, message } }
  process.stdout.write(JSON.stringify(response) + '\n')
}

async function handleLine(line: string) {
  try {
    const request = JSON.parse(line)

    if (request.method === 'initialize') {
      sendResponse(request.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'make-laten', version: '1.3.0' }
      })
    } else if (request.method === 'notifications/initialized') {
      // no response needed
    } else if (request.method === 'tools/list') {
      sendResponse(request.id, { tools: TOOLS })
    } else if (request.method === 'tools/call') {
      const { name, arguments: params } = request.params
      const handler = handlers[name]

      if (!handler) {
        sendError(request.id, -32601, `Unknown tool: ${name}`)
        return
      }

      try {
        const result = await handler(params || {})
        sendResponse(request.id, result)
      } catch (error: any) {
        failureLearner.record({ type: name, error: error.message, context: { tool: name } })
        sendError(request.id, -32000, error.message)
      }
    } else {
      sendError(request.id, -32601, `Method not found: ${request.method}`)
    }
  } catch (error: any) {
    process.stderr.write(`Error: ${error.message}\n`)
  }
}

let buffer = ''

process.stdin.setEncoding('utf-8')
process.stdin.on('data', async (chunk: string) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    if (line.trim()) {
      await handleLine(line.trim())
    }
  }
})

process.stderr.write('make-laten MCP server started (24 tools)\n')
