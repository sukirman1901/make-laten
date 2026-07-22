import { describe, it, expect, beforeEach } from 'vitest'
import { FailureLearner } from '../../src/learn/failure-learner.js'

describe('FailureLearner', () => {
  let learner: FailureLearner

  beforeEach(() => {
    learner = new FailureLearner()
  })

  it('should record failures', () => {
    learner.record({
      type: 'compress',
      error: 'File not found',
      context: { filePath: '/missing.ts' }
    })

    const failures = learner.getFailures()
    expect(failures.length).toBe(1)
    expect(failures[0].error).toBe('File not found')
  })

  it('should detect repeated failures', () => {
    for (let i = 0; i < 3; i++) {
      learner.record({
        type: 'compress',
        error: 'File not found',
        context: { filePath: `/missing${i}.ts` }
      })
    }

    const suggestions = learner.getSuggestions('compress')
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('should provide recovery suggestions', () => {
    learner.record({
      type: 'compress',
      error: 'File not found',
      context: { filePath: '/missing.ts' }
    })

    const suggestions = learner.getSuggestions('compress')
    expect(suggestions.some(s => s.includes('check'))).toBe(true)
  })
})
