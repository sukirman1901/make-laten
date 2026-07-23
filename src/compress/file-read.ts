import type { Compressor, CompressedResult, FileReadInput } from './types.js'
import { calculateConfidence } from './confidence.js'
import { stripAll } from './strip.js'
import { smartTruncate } from './truncate.js'
import { buildSymbolIR } from './symbol-ir.js'

export class FileReadCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { content, filePath } = input as FileReadInput & { mtimeMs?: number }
    const mtimeMs = (input as FileReadInput & { mtimeMs?: number }).mtimeMs ?? 0

    const lines = content.split('\n').length
    const tokens = Math.ceil(content.length / 4)

    if (tokens < 200) {
      return {
        content,
        original: content,
        confidence: 1.0,
        metadata: {
          strategy: 'passthrough',
          originalLines: lines,
          compressedLines: lines,
          savings: 0,
          irId: null,
          mtimeMs,
          symbols: []
        }
      }
    }

    stripAll(content)
    const ir = buildSymbolIR(content, filePath, mtimeMs)

    const byKind = (kind: string) => ir.symbols.filter(s => s.kind === kind)

    const formatSym = (s: { name: string; parent?: string; startLine: number; endLine: number }) => {
      const label = s.parent ? `${s.parent}.${s.name}` : s.name
      return `//   ${label} L${s.startLine}-${s.endLine}`
    }

    const sections: string[] = [
      `// ${filePath} (${lines} lines) [ir:${ir.id}]`
    ]

    const classes = byKind('class')
    const methods = byKind('method')
    const functions = byKind('function')
    const types = byKind('type')

    if (classes.length) {
      sections.push('// Classes:')
      for (const c of classes) {
        sections.push(`//   ${c.name} L${c.startLine}-${c.endLine}`)
        for (const m of methods.filter(x => x.parent === c.name)) {
          sections.push(formatSym(m))
        }
      }
    }

    if (functions.length) {
      sections.push('// Functions:')
      for (const f of functions) sections.push(formatSym(f))
    }

    if (types.length) {
      sections.push('// Types:')
      for (const t of types) sections.push(formatSym(t))
    }

    sections.push(`// → detail: make-laten-read-detail ${filePath} --symbol <name>`)

    let compressed = sections.join('\n')
    compressed = smartTruncate(compressed, 2000)

    return {
      content: compressed,
      original: content,
      confidence: calculateConfidence(content, compressed),
      metadata: {
        strategy: 'hybrid-ir',
        originalLines: lines,
        compressedLines: compressed.split('\n').length,
        savings: 1 - (compressed.length / content.length),
        irId: ir.id,
        mtimeMs,
        symbols: ir.symbols.map(s => ({
          name: s.name,
          kind: s.kind,
          parent: s.parent,
          startLine: s.startLine,
          endLine: s.endLine
        })),
        ir
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }
}
