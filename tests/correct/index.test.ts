import { describe, it, expect } from 'vitest'
import { createCorrector } from '../../src/correct/index.js'

describe('Correct Module Index', () => {
  it('should create a corrector with default rules', () => {
    const corrector = createCorrector()
    expect(corrector.engine).toBeDefined()
    expect(corrector.rules).toBeDefined()
  })

  it('should apply corrections via correct function', () => {
    const corrector = createCorrector()
    
    const result = corrector.correct('teh test')
    expect(result).toBeDefined()
  })
})
