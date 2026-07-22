import { describe, it, expect } from 'vitest'
import type { Plugin, PluginContext, PluginResult } from '../../src/plugin/types.js'

describe('Plugin Types', () => {
  it('should define Plugin type', () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      initialize: async () => {},
      execute: async (input) => ({ success: true })
    }
    expect(plugin.name).toBe('test-plugin')
  })

  it('should define PluginContext type', () => {
    const ctx: PluginContext = {
      config: { key: 'value' },
      logger: console
    }
    expect(ctx.config).toBeDefined()
  })

  it('should define PluginResult type', () => {
    const result: PluginResult = {
      success: true,
      data: { result: 'ok' }
    }
    expect(result.success).toBe(true)
  })
})
