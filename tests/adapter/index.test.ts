import { describe, it, expect } from 'vitest'
import { AgentDetector } from '../../src/adapter/detector.js'
import { getAdapter, getAdapters, registerAdapter } from '../../src/adapter/index.js'
import { AGENT_CONFIGS } from '../../src/adapter/types.js'

describe('Adapter Index', () => {
  it('should get adapter by name', () => {
    expect(getAdapter('claude-code')).toBeDefined()
    expect(getAdapter('codex')).toBeDefined()
    expect(getAdapter('gemini-cli')).toBeDefined()
  })

  it('should return undefined for unknown adapter', () => {
    expect(getAdapter('unknown')).toBeUndefined()
  })

  it('should get all adapters', () => {
    const adapters = getAdapters()
    expect(adapters.length).toBeGreaterThanOrEqual(3)
  })

  it('should register custom adapter', () => {
    registerAdapter('custom', { name: 'custom', version: '1.0.0', type: 'hook', format: (i) => ({ output: i.content, format: 'custom' }) })
    expect(getAdapter('custom')).toBeDefined()
  })

  it('should have agent configs', () => {
    expect(AGENT_CONFIGS['claude-code']).toBeDefined()
    expect(AGENT_CONFIGS['cursor']).toBeDefined()
    expect(AGENT_CONFIGS['cursor'].type).toBe('rules')
  })
})
