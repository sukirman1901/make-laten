import { describe, it, expect } from 'vitest'
import { GrepCompressor } from '../../src/compress/grep.js'

describe('GrepCompressor', () => {
  const compressor = new GrepCompressor()

  it('should group grep results by file', async () => {
    const input = {
      results: [
        { file: 'src/a.ts', line: 1, content: 'TODO: fix this' },
        { file: 'src/a.ts', line: 5, content: 'TODO: add tests' },
        { file: 'src/b.ts', line: 10, content: 'TODO: refactor' }
      ],
      pattern: 'TODO',
      directory: 'src'
    }

    const result = await compressor.compress(input)
    
    expect(result.content).toContain('src/a.ts')
    expect(result.content).toContain('src/b.ts')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('should deduplicate similar matches', async () => {
    const input = {
      results: [
        { file: 'src/a.ts', line: 1, content: 'console.log("test")' },
        { file: 'src/a.ts', line: 2, content: 'console.log("test")' },
        { file: 'src/a.ts', line: 3, content: 'console.log("test")' }
      ],
      pattern: 'console.log',
      directory: 'src'
    }

    const result = await compressor.compress(input)
    expect(result.content.length).toBeLessThan(
      input.results.map(r => r.content).join('\n').length
    )
  })
})
