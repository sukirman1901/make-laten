import { describe, it, expect } from 'vitest'
import type { Correction, CorrectionRule } from '../../src/correct/types.js'

describe('Correction Types', () => {
  it('should define Correction type', () => {
    const correction: Correction = {
      id: 'c1',
      original: 'old content',
      corrected: 'new content',
      rule: 'fix-import',
      confidence: 0.9
    }
    expect(correction.rule).toBe('fix-import')
  })

  it('should define CorrectionRule type', () => {
    const rule: CorrectionRule = {
      name: 'fix-import',
      description: 'Fix missing imports',
      pattern: /import.*from/g,
      replacement: 'import { x } from'
    }
    expect(rule.name).toBe('fix-import')
  })
})
