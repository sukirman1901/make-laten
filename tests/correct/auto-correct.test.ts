import { describe, it, expect, beforeEach } from 'vitest'
import { AutoCorrect } from '../../src/correct/auto-correct.js'

describe('AutoCorrect', () => {
  let engine: AutoCorrect

  beforeEach(() => {
    engine = new AutoCorrect()
  })

  it('should add correction rules', () => {
    engine.addRule({
      name: 'fix-typo',
      description: 'Fix common typos',
      pattern: 'teh',
      replacement: 'the'
    })

    expect(engine.getRules().length).toBe(1)
  })

  it('should apply corrections', () => {
    engine.addRule({
      name: 'fix-typo',
      description: 'Fix common typos',
      pattern: 'teh',
      replacement: 'the'
    })

    const result = engine.correct('teh quick brown fox')
    expect(result).toBe('the quick brown fox')
  })

  it('should handle regex patterns', () => {
    engine.addRule({
      name: 'fix-imports',
      description: 'Fix import statements',
      pattern: /import\s+\w+\s+from/g,
      replacement: 'import { x } from'
    })

    const result = engine.correct('import foo from')
    expect(result).toBe('import { x } from')
  })

  it('should track corrections', () => {
    engine.addRule({
      name: 'fix-typo',
      description: 'Fix common typos',
      pattern: 'teh',
      replacement: 'the'
    })

    engine.correct('teh test')
    engine.correct('teh again')

    const stats = engine.getStats()
    expect(stats.applied).toBe(2)
  })
})
