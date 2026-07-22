import { PatternMiner } from './pattern-miner.js'
import { FailureLearner } from './failure-learner.js'

export function createLearner() {
  const patterns = new PatternMiner()
  const failures = new FailureLearner()

  return {
    patterns,
    failures,
    record: (op: any) => {
      patterns.record(op)
      if (!op.success) {
        failures.record({
          type: op.type,
          error: op.error || 'Unknown error',
          context: op.input
        })
      }
    }
  }
}

export { PatternMiner } from './pattern-miner.js'
export { FailureLearner } from './failure-learner.js'
