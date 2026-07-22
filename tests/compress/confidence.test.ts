import { describe, it, expect } from 'vitest'
import { calculateConfidence } from '../../src/compress/confidence.js'

describe('calculateConfidence', () => {
  it('should return high confidence for good compression', () => {
    const original = 'a'.repeat(1000)
    const compressed = 'a'.repeat(100)
    const confidence = calculateConfidence(original, compressed)
    expect(confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('should return low confidence for too aggressive compression', () => {
    const original = 'a'.repeat(1000)
    const compressed = 'a'
    const confidence = calculateConfidence(original, compressed)
    expect(confidence).toBeLessThanOrEqual(0.5)
  })

  it('should penalize if code blocks modified', () => {
    const original = '```typescript\nconst x = 1\n```'
    const compressed = '```typescript\nconst y = 2\n```'
    const confidence = calculateConfidence(original, compressed)
    expect(confidence).toBeLessThan(0.8)
  })
})
