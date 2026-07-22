import { describe, it, expect } from 'vitest'
import { PluginLoader } from '../../src/plugin/index.js'

describe('Plugin Module Index', () => {
  it('should export PluginLoader', () => {
    expect(PluginLoader).toBeDefined()
  })

  it('should create a loader', () => {
    const loader = new PluginLoader()
    expect(loader.getAll().length).toBe(0)
  })
})
