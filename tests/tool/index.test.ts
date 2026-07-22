import { describe, it, expect } from 'vitest'
import { createToolRegistry, getSemanticTools } from '../../src/tool/index.js'

describe('Tool Module Index', () => {
  it('should create a pre-populated registry', () => {
    const registry = createToolRegistry()
    expect(registry.has('compress')).toBe(true)
    expect(registry.has('cache')).toBe(true)
    expect(registry.has('graph')).toBe(true)
  })

  it('should include semantic tools', () => {
    const tools = getSemanticTools()
    expect(tools.length).toBe(3)
    expect(tools[0].name).toBe('compress')
  })
})
