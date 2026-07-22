import type { Failure } from './types.js'
import fs from 'fs'
import path from 'path'

interface FailureRecord extends Failure {
  count: number
}

const DATA_FILE = path.join(process.env.HOME || '~', '.make-laten', 'failures.json')

export class FailureLearner {
  private failures: Map<string, FailureRecord> = new Map()
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
        if (Array.isArray(data.failures)) {
          for (const f of data.failures) {
            this.failures.set(`${f.type}:${f.error}`, f)
          }
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
        failures: Array.from(this.failures.values())
      }, null, 2))
    } catch {}
  }

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
    this.persistToDisk()
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
