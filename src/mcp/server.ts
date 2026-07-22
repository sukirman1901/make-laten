#!/usr/bin/env node

import { FileReadCompressor } from '../compress/file-read.js'
import { GrepCompressor } from '../compress/grep.js'
import { GitDiffCompressor } from '../compress/git-diff.js'
import { GitStatusCompressor } from '../compress/git-status.js'
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

const execAsync = promisify(exec)

// Singletons
const sessionCache = new SessionCache()
const toolRouter = new ToolRouter()
const strategyRouter = new StrategyRouter()
const patternMiner = new PatternMiner()
const failureLearner = new FailureLearner()
const autoCorrect = new AutoCorrect()
const webRouter = new WebRouter()

const TOOLS = [
  // Compress Layer
  {
    name: 'make-laten-read',
    description: 'Read and compress a file (65-92% token savings)',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to file' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'make-laten-grep',
    description: 'Search code and return compressed grouped results',
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
    name: 'make-laten-git-diff',
    description: 'Compressed git diff output',
    inputSchema: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'Show staged changes', default: false }
      }
    }
  },
  {
    name: 'make-laten-git-status',
    description: 'Compressed git status',
    inputSchema: { type: 'object', properties: {} }
  },

  // Route Layer
  {
    name: 'make-laten-route',
    description: 'Route input to correct compressor',
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
    name: 'make-laten-strategy',
    description: 'Select compression strategy based on context',
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
    name: 'make-laten-cache-stats',
    description: 'Show cache performance stats',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'make-laten-cache-get',
    description: 'Get value from session cache',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Cache key' }
      },
      required: ['key']
    }
  },
  {
    name: 'make-laten-cache-set',
    description: 'Set value in session cache',
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
    name: 'make-laten-cache-clear',
    description: 'Clear session cache',
    inputSchema: { type: 'object', properties: {} }
  },

  // Learn Layer
  {
    name: 'make-laten-patterns',
    description: 'Get learned patterns from usage',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'make-laten-failures',
    description: 'Get failure records and suggestions',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'make-laten-suggestions',
    description: 'Get suggestions based on learned patterns',
    inputSchema: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Context for suggestions' }
      }
    }
  },

  // Correct Layer
  {
    name: 'make-laten-correct',
    description: 'Apply auto-corrections to text',
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
    name: 'make-laten-search',
    description: 'Search the web with semantic understanding',
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
    name: 'make-laten-fetch',
    description: 'Fetch and compress web content',
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
    name: 'make-laten-tools',
    description: 'List available make-laten tools',
    inputSchema: { type: 'object', properties: {} }
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
  const compressor = new FileReadCompressor()
  const result = await compressor.compress({
    content,
    filePath: params.file_path,
    language: detectLanguage(params.file_path)
  })
  patternMiner.record({ type: 'file-read', input: { file: params.file_path }, success: true })
  sessionCache.set(`file:${params.file_path}`, { content: result.content, metadata: result.metadata })
  return { content: [{ type: 'text', text: JSON.stringify({ compressed: result.content, savings: result.metadata.savings, confidence: result.confidence }) }] }
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

const handlers: Record<string, (params: any) => Promise<any>> = {
  'make-laten-read': handleRead,
  'make-laten-grep': handleGrep,
  'make-laten-git-diff': handleGitDiff,
  'make-laten-git-status': handleGitStatus,
  'make-laten-route': handleRoute,
  'make-laten-strategy': handleStrategy,
  'make-laten-cache-stats': handleCacheStats,
  'make-laten-cache-get': handleCacheGet,
  'make-laten-cache-set': handleCacheSet,
  'make-laten-cache-clear': handleCacheClear,
  'make-laten-patterns': handlePatterns,
  'make-laten-failures': handleFailures,
  'make-laten-suggestions': handleSuggestions,
  'make-laten-correct': handleCorrect,
  'make-laten-search': handleSearch,
  'make-laten-fetch': handleFetch,
  'make-laten-tools': handleTools
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
        serverInfo: { name: 'make-laten', version: '1.2.0' }
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
        failureLearner.record({ type: name, error: error.message, success: false })
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

process.stderr.write('make-laten MCP server started (17 tools)\n')
