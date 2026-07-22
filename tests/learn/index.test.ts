import { describe, it, expect } from 'vitest'
import { createLearner } from '../../src/learn/index.js'

describe('Learn Module Index', () => {
  it('should create a learner with miner and failure tracker', () => {
    const learner = createLearner()
    expect(learner.patterns).toBeDefined()
    expect(learner.failures).toBeDefined()
  })

  it('should record and learn from operations', () => {
    const learner = createLearner()
    
    learner.record({
      type: 'file-read',
      input: { filePath: 'test.ts' },
      output: { compressed: true },
      success: true
    })
    
    expect(learner.patterns.getPatterns().length).toBe(1)
  })
})
