import type { Pattern, PatternType } from './types.js'
import fs from 'fs'
import path from 'path'

interface Operation {
  type: string
  input: any
  output?: any
  error?: string
  success: boolean
}

const DATA_FILE = path.join(process.env.HOME || '~', '.make-laten', 'patterns.json')

export class PatternMiner {
  private operations: Operation[] = []
  private patterns: Map<string, Pattern> = new Map()
  private persistencePath: string
  private lastPersist = 0

  constructor(options?: { persistencePath?: string }) {
    this.persistencePath = options?.persistencePath || DATA_FILE
    this.loadFromDisk()
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const data = JSON.parse(fs.readFileSync(this.persistencePath, 'utf-8'))
        if (Array.isArray(data.patterns)) {
          for (const p of data.patterns) {
            this.patterns.set(p.type, p)
          }
        }
        if (Array.isArray(data.operations)) {
          this.operations = data.operations.slice(-100) // keep last 100
        }
      }
    } catch {}
  }

  private persistToDisk(): void {
    const now = Date.now()
    if (now - this.lastPersist < 5000) return // debounce 5s
    this.lastPersist = now

    try {
      const dir = path.dirname(this.persistencePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(this.persistencePath, JSON.stringify({
        patterns: Array.from(this.patterns.values()),
        operations: this.operations.slice(-100)
      }, null, 2))
    } catch {}
  }

  record(operation: Operation): void {
    this.operations.push(operation)
    if (this.operations.length > 100) this.operations.shift()
    
    if (operation.success) {
      this.updatePatterns(operation)
    }
    this.persistToDisk()
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
