export interface Correction {
  id: string
  original: string
  corrected: string
  rule: string
  confidence: number
  metadata?: Record<string, any>
}

export interface CorrectionRule {
  name: string
  description: string
  pattern: RegExp | string
  replacement: string
  validate?: (input: string) => boolean
}
