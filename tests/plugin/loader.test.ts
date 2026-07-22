import { describe, it, expect, beforeEach } from 'vitest'
import { PluginLoader } from '../../src/plugin/loader.js'
import type { Plugin } from '../../src/plugin/types.js'

describe('PluginLoader', () => {
  let loader: PluginLoader

  beforeEach(() => {
    loader = new PluginLoader()
  })

  it('should register plugins', () => {
    const plugin: Plugin = {
      name: 'test',
      version: '1.0.0',
      initialize: async () => {},
      execute: async (input) => ({ success: true })
    }

    loader.register(plugin)
    expect(loader.has('test')).toBe(true)
  })

  it('should initialize plugins', async () => {
    let initialized = false
    const plugin: Plugin = {
      name: 'test',
      version: '1.0.0',
      initialize: async () => { initialized = true },
      execute: async (input) => ({ success: true })
    }

    loader.register(plugin)
    await loader.initializeAll({ config: {}, logger: console })
    expect(initialized).toBe(true)
  })

  it('should get plugins by name', () => {
    const plugin: Plugin = {
      name: 'test',
      version: '1.0.0',
      initialize: async () => {},
      execute: async (input) => ({ success: true })
    }

    loader.register(plugin)
    expect(loader.get('test')).toBe(plugin)
  })
})
