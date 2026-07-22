#!/usr/bin/env node

import { FileReadCompressor } from '../compress/file-read.js'
import { GrepCompressor } from '../compress/grep.js'
import { GitDiffCompressor } from '../compress/git-diff.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'

const execAsync = promisify(exec)

const TOOLS = [
  {
    name: 'make-laten-read',
    description: 'Read and compress a file (60-90% token savings)',
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
  {
    name: 'make-laten-cache-stats',
    description: 'Show cache performance stats',
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

async function handleRead(params: { file_path: string }) {
  const content = await fs.readFile(params.file_path, 'utf-8')
  const compressor = new FileReadCompressor()
  const result = await compressor.compress({
    content,
    filePath: params.file_path,
    language: detectLanguage(params.file_path)
  })
  return {
    content: [{ type: 'text', text: JSON.stringify({ compressed: result.content, savings: result.metadata.savings, confidence: result.confidence }) }]
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

  return { content: [{ type: 'text', text: JSON.stringify({ compressed: result.content, savings: result.metadata.savings }) }] }
}

async function handleGitStatus() {
  const { stdout } = await execAsync('git status --porcelain')
  const lines = stdout.split('\n').filter(Boolean)
  const files = lines.map(l => ({ status: l[0], path: l.slice(3) }))
  return { content: [{ type: 'text', text: JSON.stringify({ total: files.length, files }) }] }
}

async function handleCacheStats() {
  return { content: [{ type: 'text', text: JSON.stringify({ message: 'Cache stats — use CLI: make-laten cache stats' }) }] }
}

const handlers: Record<string, (params: any) => Promise<any>> = {
  'make-laten-read': handleRead,
  'make-laten-grep': handleGrep,
  'make-laten-git-diff': handleGitDiff,
  'make-laten-git-status': handleGitStatus,
  'make-laten-cache-stats': handleCacheStats
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
        serverInfo: { name: 'make-laten', version: '1.0.0' }
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

process.stderr.write('make-laten MCP server started\n')
