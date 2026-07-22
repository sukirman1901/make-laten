import type { Correction, CorrectionRule } from './types.js'

export class AutoCorrect {
  private rules: CorrectionRule[] = []
  private corrections: Correction[] = []
  private appliedCount = 0

  addRule(rule: CorrectionRule): void {
    this.rules.push(rule)
  }

  getRules(): CorrectionRule[] {
    return this.rules
  }

  correct(input: string): string {
    let output = input

    for (const rule of this.rules) {
      if (typeof rule.pattern === 'string') {
        if (output.includes(rule.pattern)) {
          output = output.split(rule.pattern).join(rule.replacement)
          this.recordCorrection(input, output, rule.name)
        }
      } else {
        const matches = output.match(rule.pattern)
        if (matches) {
          output = output.replace(rule.pattern, rule.replacement)
          this.recordCorrection(input, output, rule.name)
        }
      }
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
