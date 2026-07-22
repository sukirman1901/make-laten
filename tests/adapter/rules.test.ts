import { describe, it, expect } from 'vitest'
import { RulesAdapter } from '../../src/adapter/rules.js'

describe('RulesAdapter', () => {
  it('should create adapter with name', () => {
    const adapter = new RulesAdapter('cursor')
    expect(adapter.name).toBe('cursor')
    expect(adapter.type).toBe('rules')
  })

  it('should format content', () => {
    const adapter = new RulesAdapter('cursor')
    const result = adapter.format({ content: 'test' })
    expect(result.output).toBe('test')
    expect(result.format).toBe('markdown')
  })

  it('should parse output', () => {
    const adapter = new RulesAdapter('cursor')
    const result = adapter.parse('some text')
    expect(result.content).toBe('some text')
  })
})
