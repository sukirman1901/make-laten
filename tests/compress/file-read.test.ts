import { describe, it, expect } from 'vitest'
import { FileReadCompressor } from '../../src/compress/file-read.js'

describe('FileReadCompressor', () => {
  it('achieves 65%+ savings on typical TypeScript file', async () => {
    const content = `
import fs from 'fs'
import path from 'path'
import { foo } from './foo'

// This is a comment
/**
 * Multi-line comment
 */
export function processData(data: string[]): Result[] {
  // Process each item
  const results: Result[] = []
  for (const item of data) {
    // Validate input
    if (!item) continue

    // Transform data
    const transformed = item.trim().toLowerCase()
    results.push({ value: transformed, valid: true })
  }
  return results
}

export class DataProcessor {
  private cache: Map<string, any> = new Map()

  async process(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }
    const result = await fetchData(key)
    this.cache.set(key, result)
    return result
  }
}

interface Result {
  value: string
  valid: boolean
}
`
    // pad to ensure >200 tokens so hybrid-ir path runs
    const padded = content + '\n' + Array.from({ length: 40 }, (_, i) => `// pad line ${i} extra commentary for token budget`).join('\n')
    const compressor = new FileReadCompressor()
    const result = await compressor.compress({ content: padded, filePath: 'test.ts', language: 'typescript' })

    const savings = 1 - (result.content.length / padded.length)
    expect(savings).toBeGreaterThan(0.65)
  })

  it('preserves exports', async () => {
    const content = `export function foo() { return 1 }\nexport const bar = 2`
    const compressor = new FileReadCompressor()
    const result = await compressor.compress({ content, filePath: 'test.ts', language: 'typescript' })

    // small file passthrough keeps original exports
    expect(result.metadata.strategy).toBe('passthrough')
    expect(result.content).toContain('export function foo')
    expect(result.content).toContain('export const bar')
  })

  it('includes irId and symbol summary for large files', async () => {
    const lines = []
    lines.push('export class Big {')
    for (let i = 0; i < 80; i++) {
      lines.push(`  m${i}() { return ${i} }`)
    }
    lines.push('}')
    const content = lines.join('\n')
    expect(content.length).toBeGreaterThan(800)

    const compressor = new FileReadCompressor()
    const result = await compressor.compress({
      content,
      filePath: 'src/big.ts',
      language: 'typescript'
    })

    expect(result.metadata.strategy).not.toBe('passthrough')
    expect(result.metadata.irId).toBeTruthy()
    expect(result.metadata.mtimeMs).toBeTypeOf('number')
    expect(Array.isArray(result.metadata.symbols)).toBe(true)
    expect(result.content).toContain('Big')
    expect(result.content).toMatch(/L\d+-\d+/)
    expect(result.content).toContain('make-laten-read-detail')
  })
})
