import fs from 'fs/promises'
import { statSync } from 'fs'
import { FileReadCompressor } from '../../compress/file-read.js'
import { DetailExpander } from '../../compress/detail-expander.js'
import type { DetailFocus } from '../../compress/detail-expander.js'
import type { FileReadInput } from '../../compress/types.js'

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown'
  }
  return langMap[ext] || 'text'
}

export interface ReadCommandOptions {
  symbol?: string
  range?: string
  exportName?: string
}

function parseFocus(opts: ReadCommandOptions): DetailFocus | null {
  if (opts.symbol) return { type: 'symbol', name: opts.symbol }
  if (opts.exportName) return { type: 'export', name: opts.exportName }
  if (opts.range) {
    const m = opts.range.match(/^(\d+)-(\d+)$/)
    if (!m) throw new Error(`Invalid --range, expected start-end, got ${opts.range}`)
    return { type: 'range', start: parseInt(m[1], 10), end: parseInt(m[2], 10) }
  }
  return null
}

export async function readCommand(filePath: string, opts: ReadCommandOptions = {}): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const mtimeMs = statSync(filePath).mtimeMs
    const focus = parseFocus(opts)

    if (focus) {
      const expander = new DetailExpander()
      const result = await expander.expand({ content, filePath, mtimeMs, focus })
      console.log(JSON.stringify(result, null, 2))
      if (!result.ok) process.exit(1)
      return
    }

    const compressor = new FileReadCompressor()
    const result = await compressor.compress({
      content,
      filePath,
      language: detectLanguage(filePath),
      mtimeMs
    } as FileReadInput & { mtimeMs: number })

    console.log(JSON.stringify({
      file: filePath,
      compressed: result.content,
      confidence: result.confidence,
      metadata: {
        ...result.metadata,
        ir: undefined,
        symbols: result.metadata.symbols
      }
    }, null, 2))
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    process.exit(1)
  }
}
