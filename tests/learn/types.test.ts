import { describe, it, expect } from 'vitest'
import type { Pattern, Failure, LearnContext } from '../../src/learn/types.js'

describe('Learn Types', () => {
  it('should define Pattern type', () => {
    const pattern: Pattern = {
      id: 'p1',
      type: 'file-read',
      pattern: 'large files compress better',
      confidence: 0.8,
      count: 10
    }
    expect(pattern.type).toBe('file-read')
  })

  it('should define Failure type', () => {
    const failure: Failure = {
      id: 'f1',
      type: 'compress',
      error: 'File not found',
      context: { filePath: '/missing.ts' },
      timestamp: Date.now()
    }
    expect(failure.type).toBe('compress')
  })
})
