import { describe, it, expect } from 'vitest'
import { OutputCompressor } from '../../src/compress/index.js'

describe('Compress Module Index', () => {
  it('should export OutputCompressor', () => {
    expect(OutputCompressor).toBeDefined()
  })

  it('should compress output', () => {
    const result = OutputCompressor.compress('test')
    expect(result).toBe('test')
  })
})
