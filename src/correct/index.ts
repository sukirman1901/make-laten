import { AutoCorrect } from './auto-correct.js'
import type { CorrectionRule } from './types.js'

const defaultRules: CorrectionRule[] = [
  {
    name: 'fix-typo-teh',
    description: 'Fix "teh" typo',
    pattern: 'teh',
    replacement: 'the'
  },
  {
    name: 'fix-typo-recieve',
    description: 'Fix "recieve" typo',
    pattern: 'recieve',
    replacement: 'receive'
  }
]

export function createCorrector(rules: CorrectionRule[] = defaultRules) {
  const engine = new AutoCorrect()
  
  for (const rule of rules) {
    engine.addRule(rule)
  }

  return {
    engine,
    rules: engine.getRules(),
    correct: (input: string) => engine.correct(input)
  }
}

export { AutoCorrect } from './auto-correct.js'
export type { Correction, CorrectionRule } from './types.js'
