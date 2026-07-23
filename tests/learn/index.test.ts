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
    const uniqueType = `test-op-${Date.now()}`
    const before = learner.patterns.getPatterns().length
    
    learner.record({
      type: uniqueType,
      input: { filePath: 'test.ts' },
      output: { compressed: true },
      success: true
    })
    
    const after = learner.patterns.getPatterns().length
    expect(after).toBe(before + 1)
    
    const pattern = learner.patterns.getPatterns().find(p => p.type === uniqueType)
    expect(pattern).toBeDefined()
    expect(pattern?.count).toBe(1)
  })
})
