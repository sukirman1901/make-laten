import { describe, it, expect } from 'vitest'
import { createCacheManager, SessionCache, CrossSessionCache, SemanticCache } from '../../src/cache/index.js'

describe('Cache Module Index', () => {
  it('should create a cache manager with all caches', () => {
    const manager = createCacheManager()
    expect(manager.session).toBeDefined()
    expect(manager.crossSession).toBeDefined()
    expect(manager.semantic).toBeDefined()
  })

  it('should expose cache classes', () => {
    expect(SessionCache).toBeDefined()
    expect(CrossSessionCache).toBeDefined()
    expect(SemanticCache).toBeDefined()
  })
})