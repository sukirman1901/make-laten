import type { Pattern, PatternType } from './types.js'

interface Operation {
  type: string
  input: any
  output?: any
  error?: string
  success: boolean
}

export class PatternMiner {
  private operations: Operation[] = []
  private patterns: Map<string, Pattern> = new Map()

  record(operation: Operation): void {
    this.operations.push(operation)
    
    if (operation.success) {
      this.updatePatterns(operation)
    }
  }

  getPatterns(): Pattern[] {
    return Array.from(this.patterns.values())
  }

  getPatternsByType(type: PatternType): Pattern[] {
    return this.getPatterns().filter(p => p.type === type)
  }

  private updatePatterns(operation: Operation): void {
    const key = operation.type
    const existing = this.patterns.get(key)
    
    if (existing) {
      existing.count++
      existing.confidence = Math.min(0.99, existing.confidence + 0.05)
    } else {
      this.patterns.set(key, {
        id: `p${this.patterns.size + 1}`,
        type: operation.type as PatternType,
        pattern: JSON.stringify(operation.input),
        confidence: 0.5,
        count: 1
      })
    }
  }
}
