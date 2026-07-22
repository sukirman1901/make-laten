import { describe, it, expect } from 'vitest'
import { HookAdapter } from '../../src/adapter/hook.js'

describe('HookAdapter', () => {
  it('should create adapter with name', () => {
    const adapter = new HookAdapter('test-agent')
    expect(adapter.name).toBe('test-agent')
    expect(adapter.type).toBe('hook')
  })

  it('should format content', () => {
    const adapter = new HookAdapter('test')
    const result = adapter.format({ content: 'test content' })
    expect(result.output).toContain('test content')
    expect(result.format).toBe('test')
  })

  it('should intercept tool calls', async () => {
    const adapter = new HookAdapter('test')
    adapter.setHooks({
      preToolUse: async (toolCall) => ({
        ...toolCall,
        params: { ...toolCall.params, intercepted: true }
      })
    })

    const result = await adapter.intercept({ name: 'Read', params: { file: 'test.ts' } })
    expect(result?.params.intercepted).toBe(true)
  })

  it('should pass through when no hooks', async () => {
    const adapter = new HookAdapter('test')
    const toolCall = { name: 'Read', params: { file: 'test.ts' } }
    const result = await adapter.intercept(toolCall)
    expect(result).toEqual(toolCall)
  })

  it('should post-process results', async () => {
    const adapter = new HookAdapter('test')
    adapter.setHooks({
      postToolUse: async (result) => ({
        ...result,
        output: result.output.toUpperCase()
      })
    })

    const result = await adapter.postProcess({
      name: 'Read',
      output: 'hello',
      success: true
    })
    expect(result.output).toBe('HELLO')
  })
})
