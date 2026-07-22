import { describe, it, expect } from 'vitest'
import { 
  createLearner, 
  createCorrector,
  SemanticCache,
  OutputCompressor
} from '../src/index.js'

describe('Phase 3 Integration', () => {
  it('should use learn module', () => {
    const learner = createLearner()
    expect(learner.patterns).toBeDefined()
    expect(learner.failures).toBeDefined()
  })

  it('should use correct module', () => {
    const corrector = createCorrector()
    const result = corrector.correct('teh test')
    expect(result).toBe('the test')
  })

  it('should use semantic cache', () => {
    const cache = new SemanticCache()
    cache.store('test content', [0.1, 0.2])
    expect(cache.getAll().length).toBe(1)
  })

  it('should use output compressor', () => {
    const result = OutputCompressor.compress('short')
    expect(result).toBe('short')
  })
})
