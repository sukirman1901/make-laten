import { describe, it, expect } from 'vitest'
import { CodexAdapter } from '../../src/adapter/codex.js'

describe('CodexAdapter', () => {
  const adapter = new CodexAdapter()

  it('should have correct name', () => {
    expect(adapter.name).toBe('codex')
  })

  it('should format output for Codex', () => {
    const result = adapter.format({
      content: 'test content',
      context: {}
    })
    expect(result.format).toBe('codex')
    expect(result.output).toContain('test content')
  })

  it('should handle JSON format', () => {
    const result = adapter.format({
      content: '{"key": "value"}',
      context: { expectJson: true }
    })
    expect(result.output).toBeDefined()
  })
})
