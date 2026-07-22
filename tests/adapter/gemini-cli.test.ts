import { describe, it, expect } from 'vitest'
import { GeminiCliAdapter } from '../../src/adapter/gemini-cli.js'

describe('GeminiCliAdapter', () => {
  const adapter = new GeminiCliAdapter()

  it('should have correct name', () => {
    expect(adapter.name).toBe('gemini-cli')
  })

  it('should format output for Gemini', () => {
    const result = adapter.format({
      content: 'test content',
      context: {}
    })
    expect(result.format).toBe('gemini')
    expect(result.output).toContain('test content')
  })

  it('should support multimodal', () => {
    const result = adapter.format({
      content: 'test',
      context: { includeImage: true, imagePath: '/path/to/image.png' }
    })
    expect(result.metadata?.multimodal).toBe(true)
  })
})
