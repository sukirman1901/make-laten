import { describe, it, expect } from 'vitest'
import { OutputCompressor } from '../../src/compress/output.js'

describe('OutputCompressor', () => {
  it('should compress JSON output', () => {
    const input = JSON.stringify({ test: "value", nested: { key: "value" } }, null, 2)
    const result = OutputCompressor.compress(input)
    expect(result.length).toBeLessThan(input.length)
  })

  it('should truncate long output', () => {
    const input = 'a'.repeat(2000)
    const result = OutputCompressor.compress(input, { maxLength: 100 })
    expect(result.length).toBeLessThanOrEqual(100)
  })

  it('should remove whitespace', () => {
    const input = "  test   value  "
    const result = OutputCompressor.compress(input, { removeWhitespace: true })
    expect(result).toBe('test value')
  })

  it('should preserve short output', () => {
    const input = "short"
    const result = OutputCompressor.compress(input)
    expect(result).toBe(input)
  })
})