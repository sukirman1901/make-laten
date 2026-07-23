import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PatternMiner } from '../../src/learn/pattern-miner.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('PatternMiner', () => {
  let miner: PatternMiner
  let tmpFile: string

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `make-laten-patterns-${process.pid}-${Date.now()}.json`)
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    miner = new PatternMiner({ persistencePath: tmpFile })
  })

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
  })

  it('should record operations', () => {
    miner.record({
      type: 'file-read',
      input: { filePath: 'src/main.ts' },
      output: { compressed: true, savings: 0.5 },
      success: true
    })

    const patterns = miner.getPatterns()
    expect(patterns.length).toBeGreaterThanOrEqual(1)
    expect(patterns.some(p => p.type === 'file-read')).toBe(true)
  })

  it('should mine patterns from repeated operations', () => {
    const type = `file-read-${Date.now()}`
    for (let i = 0; i < 5; i++) {
      miner.record({
        type,
        input: { filePath: `src/file${i}.ts` },
        output: { compressed: true, savings: 0.5 },
        success: true
      })
    }

    const patterns = miner.getPatterns().filter(p => p.type === type)
    expect(patterns.length).toBe(1)
    expect(patterns[0].count).toBe(5)
  })

  it('should not record failed operations in patterns', () => {
    const type = `test-fail-${Date.now()}`
    miner.record({
      type,
      input: { filePath: 'missing.ts' },
      error: 'File not found',
      success: false
    })

    const patterns = miner.getPatterns().filter(p => p.type === type)
    expect(patterns.length).toBe(0)
  })
})
