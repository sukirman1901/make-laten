import { describe, it, expect } from 'vitest'
import { ToolRegistry } from '../../src/tool/registry.js'

describe('ToolRegistry', () => {
  const registry = new ToolRegistry()

  it('should register and get tools', () => {
    registry.register('compress', {
      name: 'compress',
      description: 'Compress content',
      execute: async (input) => ({ content: 'compressed', confidence: 0.9 })
    })

    const tool = registry.get('compress')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('compress')
  })

  it('should list all tools', () => {
    registry.register('cache', {
      name: 'cache',
      description: 'Cache content',
      execute: async (input) => ({ content: 'cached', confidence: 1.0 })
    })

    const tools = registry.list()
    expect(tools.length).toBeGreaterThanOrEqual(2)
  })

  it('should return undefined for unknown tools', () => {
    const tool = registry.get('unknown')
    expect(tool).toBeUndefined()
  })
})