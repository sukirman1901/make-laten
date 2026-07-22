import type { Failure } from './types.js'

interface FailureRecord extends Failure {
  count: number
}

export class FailureLearner {
  private failures: Map<string, FailureRecord> = new Map()

  record(failure: Omit<Failure, 'id' | 'timestamp'>): void {
    const key = `${failure.type}:${failure.error}`
    const existing = this.failures.get(key)
    
    if (existing) {
      existing.count++
    } else {
      this.failures.set(key, {
        id: `f${this.failures.size + 1}`,
        ...failure,
        timestamp: Date.now(),
        count: 1
      })
    }
  }

  getFailures(): Failure[] {
    return Array.from(this.failures.values())
  }

  getFailuresByType(type: string): Failure[] {
    return this.getFailures().filter(f => f.type === type)
  }

  getSuggestions(type: string): string[] {
    const failures = Array.from(this.failures.values()).filter(f => f.type === type)
    const suggestions: string[] = []
    
    for (const failure of failures) {
      if (failure.error.includes('not found')) {
        suggestions.push('check if file exists before processing')
      }
      if (failure.error.includes('permission')) {
        suggestions.push('verify file permissions')
      }
      if (failure.count > 2) {
        suggestions.push(`recurring issue: ${failure.error}`)
      }
    }
    
    return [...new Set(suggestions)]
  }
}
