import { describe, it, expect } from 'vitest'
import { createRouter } from '../src/route/index.js'
import { createToolRegistry, getSemanticTools } from '../src/tool/index.js'
import { getAdapter, getAdapters } from '../src/adapter/index.js'

describe('Phase 2 Integration', () => {
  it('should route, select tool, and format output', async () => {
    const router = createRouter()
    
    const route = router.route({
      type: 'file',
      content: 'const x = 1',
      metadata: { filePath: 'src/main.ts' }
    })
    
    expect(route.compressor).toBe('file-read')
    
    const strategy = router.selectStrategy({
      fileSize: 10000
    })
    
    expect(strategy.strategy).toBe('aggressive')
    
    const registry = createToolRegistry()
    const tool = registry.get('compress')
    expect(tool).toBeDefined()
    
    const adapter = getAdapter('claude-code')
    expect(adapter).toBeDefined()
    
    const output = adapter!.format({
      content: 'compressed content',
      context: { filePath: 'src/main.ts' }
    })
    
    expect(output.format).toBe('claude')
    expect(output.output).toContain('compressed content')
  })

  it('should support all adapters', () => {
    const adapters = getAdapters()
    expect(adapters.length).toBe(3)
    
    const names = adapters.map(a => a.name)
    expect(names).toContain('claude-code')
    expect(names).toContain('codex')
    expect(names).toContain('gemini-cli')
  })

  it('should have semantic tools', () => {
    const tools = getSemanticTools()
    expect(tools.length).toBe(3)
    
    const compressTool = tools.find(t => t.name === 'compress')
    expect(compressTool).toBeDefined()
    expect(compressTool!.supportsInput('file')).toBe(true)
    expect(compressTool!.supportsInput('unknown')).toBe(false)
  })
})
