import { describe, it, expect } from 'vitest'
import { ClaudeCodeAdapter } from '../../src/adapter/claude-code.js'
import { CodexAdapter } from '../../src/adapter/codex.js'
import { GeminiCliAdapter } from '../../src/adapter/gemini-cli.js'

describe('ClaudeCodeAdapter', () => {
  const adapter = new ClaudeCodeAdapter()

  it('should have correct name', () => {
    expect(adapter.name).toBe('claude-code')
  })

  it('should format content with file path', () => {
    const result = adapter.format({
      content: 'const x = 1',
      context: { filePath: 'src/main.ts' }
    })
    expect(result.output).toContain('src/main.ts')
    expect(result.output).toContain('const x = 1')
    expect(result.format).toBe('claude')
  })

  it('should format without context', () => {
    const result = adapter.format({ content: 'hello' })
    expect(result.output).toContain('hello')
  })

  it('should parse output', () => {
    const result = adapter.parse('some output')
    expect(result.content).toBe('some output')
    expect(result.parsed).toBe(true)
  })
})

describe('CodexAdapter', () => {
  const adapter = new CodexAdapter()

  it('should have correct name', () => {
    expect(adapter.name).toBe('codex')
  })

  it('should format as JSON when expectJson', () => {
    const result = adapter.format({
      content: 'data',
      context: { expectJson: true }
    })
    expect(() => JSON.parse(result.output)).not.toThrow()
  })

  it('should format as text by default', () => {
    const result = adapter.format({ content: 'hello' })
    expect(result.output).toBe('hello')
  })

  it('should parse JSON', () => {
    const result = adapter.parse('{"key":"value"}')
    expect(result.key).toBe('value')
  })

  it('should parse plain text', () => {
    const result = adapter.parse('plain text')
    expect(result.content).toBe('plain text')
  })
})

describe('GeminiCliAdapter', () => {
  const adapter = new GeminiCliAdapter()

  it('should have correct name', () => {
    expect(adapter.name).toBe('gemini-cli')
  })

  it('should format content', () => {
    const result = adapter.format({ content: 'hello' })
    expect(result.output).toBe('hello')
    expect(result.format).toBe('gemini')
  })

  it('should include image reference', () => {
    const result = adapter.format({
      content: 'describe this',
      context: { includeImage: true, imagePath: '/tmp/screenshot.png' }
    })
    expect(result.output).toContain('/tmp/screenshot.png')
    expect(result.metadata.multimodal).toBe(true)
  })
})
