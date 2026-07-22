import { describe, it, expect } from 'vitest'
import { getAdapter, getAdapters, createAdapter } from '../../src/adapter/index.js'

describe('Adapter Module Index', () => {
  it('should get adapter by name', () => {
    const adapter = getAdapter('claude-code')
    expect(adapter).toBeDefined()
    expect(adapter.name).toBe('claude-code')
  })

  it('should list all adapters', () => {
    const adapters = getAdapters()
    expect(adapters.length).toBe(3)
  })

  it('should create adapter from config', () => {
    const adapter = createAdapter({
      name: 'custom',
      version: '1.0.0',
      format: (input) => ({ output: 'custom', format: 'custom' })
    })
    expect(adapter.name).toBe('custom')
  })
})
