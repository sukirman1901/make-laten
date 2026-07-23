import { describe, it, expect } from 'vitest'
import { buildSymbolIR, findSymbolsByName } from '../../src/compress/symbol-ir.js'

const FIXTURE = `
export interface FileReadInput {
  content: string
}

export class FileReadCompressor {
  async compress(input: unknown): Promise<string> {
    const x = 1
    return String(x)
  }

  async decompress(c: string): Promise<string> {
    return c
  }
}

export function helper(a: number): number {
  return a + 1
}

export type CompressedResult = { content: string }
`

describe('buildSymbolIR', () => {
  it('extracts classes, methods, functions, types with line ranges', () => {
    const ir = buildSymbolIR(FIXTURE, '/tmp/sample.ts', 1000)
    expect(ir.filePath).toBe('/tmp/sample.ts')
    expect(ir.mtimeMs).toBe(1000)
    expect(ir.id).toBeTruthy()

    const classes = ir.symbols.filter(s => s.kind === 'class')
    expect(classes.some(s => s.name === 'FileReadCompressor')).toBe(true)

    const methods = ir.symbols.filter(s => s.kind === 'method')
    const compress = methods.find(s => s.name === 'compress' && s.parent === 'FileReadCompressor')
    expect(compress).toBeTruthy()
    expect(compress!.startLine).toBeGreaterThan(0)
    expect(compress!.endLine).toBeGreaterThanOrEqual(compress!.startLine)

    const fn = ir.symbols.find(s => s.kind === 'function' && s.name === 'helper')
    expect(fn).toBeTruthy()

    const types = ir.symbols.filter(s => s.kind === 'type' || s.kind === 'export')
    expect(types.length).toBeGreaterThan(0)
  })

  it('findSymbolsByName returns all matches', () => {
    const ir = buildSymbolIR(FIXTURE, '/tmp/sample.ts', 1)
    const hits = findSymbolsByName(ir, 'compress')
    expect(hits.length).toBe(1)
    expect(hits[0].parent).toBe('FileReadCompressor')
  })

  it('supports Qualified parent.name lookup', () => {
    const ir = buildSymbolIR(FIXTURE, '/tmp/sample.ts', 1)
    const hits = findSymbolsByName(ir, 'FileReadCompressor.compress')
    expect(hits.length).toBe(1)
  })
})
