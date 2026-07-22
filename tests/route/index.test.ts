import { describe, it, expect } from 'vitest'
import { createRouter } from '../../src/route/index.js'

describe('Router Index', () => {
  it('should create a router with tool and strategy', () => {
    const router = createRouter()
    expect(router.tool).toBeDefined()
    expect(router.strategy).toBeDefined()
  })

  it('should route and select strategy', () => {
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
  })
})
