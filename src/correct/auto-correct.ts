import type { Correction, CorrectionRule } from './types.js'
import fs from 'fs'
import path from 'path'

const DEFAULT_RULES: CorrectionRule[] = [
  // Common typos
  { name: 'typo-teh', description: 'Common typo', pattern: 'teh', replacement: 'the' },
  { name: 'typo-adn', description: 'Common typo', pattern: 'adn', replacement: 'and' },
  { name: 'typo-fo', description: 'Common typo', pattern: ' fo ', replacement: ' of ' },
  { name: 'typo-ot', description: 'Common typo', pattern: ' ot ', replacement: ' to ' },
  { name: 'typo-isnt', description: 'Common typo', pattern: 'isnt', replacement: "isn't" },
  { name: 'typo-dont', description: 'Common typo', pattern: 'dont', replacement: "don't" },
  { name: 'typo-cant', description: 'Common typo', pattern: 'cant', replacement: "can't" },
  { name: 'typo-wont', description: 'Common typo', pattern: 'wont', replacement: "won't" },
  { name: 'typo-youre', description: 'Common typo', pattern: 'youre', replacement: "you're" },
  { name: 'typo-its', description: 'Common typo', pattern: 'its a', replacement: "it's a" },
  // Code patterns
  { name: 'code-console-log', description: 'Remove console.log', pattern: /console\.log\([^)]*\);?\n?/g, replacement: '' },
  { name: 'code-debugger', description: 'Remove debugger', pattern: /debugger;?\n?/g, replacement: '' },
  { name: 'code-var-let', description: 'var to let', pattern: /\bvar\b/g, replacement: 'let' },
  // Markdown
  { name: 'md-double-space', description: 'Double space to single', pattern: '  ', replacement: ' ' },
]

const DATA_FILE = path.join(process.env.HOME || '~', '.make-laten', 'corrections.json')

export class AutoCorrect {
  private rules: CorrectionRule[]
  private corrections: Correction[] = []
  private appliedCount = 0
  private persistencePath: string

  constructor(options?: { persistencePath?: string }) {
    this.persistencePath = options?.persistencePath || DATA_FILE
    this.rules = [...DEFAULT_RULES]
    this.loadPersistedRules()
  }

  private loadPersistedRules(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const data = JSON.parse(fs.readFileSync(this.persistencePath, 'utf-8'))
        if (Array.isArray(data.customRules)) {
          this.rules.push(...data.customRules)
        }
      }
    } catch {}
  }

  private persistRules(): void {
    try {
      const dir = path.dirname(this.persistencePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const existing = this.loadExistingData()
      existing.customRules = this.rules.filter(r => !DEFAULT_RULES.includes(r))
      fs.writeFileSync(this.persistencePath, JSON.stringify(existing, null, 2))
    } catch {}
  }

  private loadExistingData(): any {
    try {
      if (fs.existsSync(this.persistencePath)) {
        return JSON.parse(fs.readFileSync(this.persistencePath, 'utf-8'))
      }
    } catch {}
    return { customRules: [] }
  }

  addRule(rule: CorrectionRule): void {
    this.rules.push(rule)
    this.persistRules()
  }

  getRules(): CorrectionRule[] {
    return this.rules
  }

  correct(input: string): string {
    let output = input
    let changed = false

    for (const rule of this.rules) {
      if (typeof rule.pattern === 'string') {
        if (output.includes(rule.pattern)) {
          output = output.split(rule.pattern).join(rule.replacement)
          changed = true
        }
      } else {
        const matches = output.match(rule.pattern)
        if (matches) {
          output = output.replace(rule.pattern, rule.replacement)
          changed = true
        }
      }
    }

    if (changed) {
      this.recordCorrection(input, output, 'auto')
    }

    return output
  }

  getStats(): { applied: number; corrections: Correction[] } {
    return {
      applied: this.appliedCount,
      corrections: this.corrections
    }
  }

  private recordCorrection(original: string, corrected: string, ruleName: string): void {
    this.appliedCount++
    this.corrections.push({
      id: `c${this.corrections.length + 1}`,
      original,
      corrected,
      rule: ruleName,
      confidence: 0.9
    })
  }
}
