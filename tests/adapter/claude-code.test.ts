import { describe, it, expect } from 'vitest'
import { ClaudeCodeAdapter } from '../../src/adapter/claude-code.js'

describe('ClaudeCodeAdapter', () => {
  const adapter = new ClaudeCodeAdapter()

  it('should have correct name and version', () => {
    expect(adapter.name).toBe('claude-code')
    expect(adapter.version).toBeDefined()
  })

  it('should format output for Claude', () => {
    const result = adapter.format({
      content: 'test content',
      context: { filePath: 'src/main.ts' }
    })
    expect(result.format).toBe('claude')
    expect(result.output).toContain('test content')
  })

  it('should include metadata', () => {
    const result = adapter.format({
      content: 'test',
      context: { filePath: 'test.ts' }
    })
    expect(result.metadata).toBeDefined()
    expect(result.metadata?.filePath).toBe('test.ts')
  })
})