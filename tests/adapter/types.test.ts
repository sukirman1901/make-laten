import { describe, it, expect } from 'vitest'
import type { AgentAdapter, AdapterConfig, AdapterOutput } from '../../src/adapter/types.js'

describe('Adapter Types', () => {
  it('should define AgentAdapter type', () => {
    const adapter: AgentAdapter = {
      name: 'claude-code',
      version: '1.0.0',
      format: (input) => ({ output: 'formatted', format: 'claude' })
    }
    expect(adapter.name).toBe('claude-code')
  })

  it('should define AdapterConfig type', () => {
    const config: AdapterConfig = {
      maxTokens: 4000,
      supportsStreaming: true
    }
    expect(config.maxTokens).toBe(4000)
  })
})