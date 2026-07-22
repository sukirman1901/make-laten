import { describe, it, expect, beforeEach } from 'vitest'
import { PatternMiner } from '../../src/learn/pattern-miner.js'

describe('PatternMiner', () => {
  let miner: PatternMiner

  beforeEach(() => {
    miner = new PatternMiner()
  })

  it('should record operations', () => {
    miner.record({
      type: 'file-read',
      input: { filePath: 'src/main.ts' },
      output: { compressed: true, savings: 0.5 },
      success: true
    })

    const patterns = miner.getPatterns()
    expect(patterns.length).toBe(1)
    expect(patterns[0].type).toBe('file-read')
  })

  it('should mine patterns from repeated operations', () => {
    for (let i = 0; i < 5; i++) {
      miner.record({
        type: 'file-read',
        input: { filePath: `src/file${i}.ts` },
        output: { compressed: true, savings: 0.5 },
        success: true
      })
    }

    const patterns = miner.getPatterns()
    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].count).toBe(5)
  })

  it('should not record failed operations', () => {
    miner.record({
      type: 'file-read',
      input: { filePath: 'missing.ts' },
      error: 'File not found',
      success: false
    })

    const patterns = miner.getPatterns()
    expect(patterns.length).toBe(0)
  })
})
