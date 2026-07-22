import { describe, it, expect, beforeEach } from 'vitest'
import { SemanticCache } from '../../src/cache/semantic.js'

describe('SemanticCache', () => {
  let cache: SemanticCache

  beforeEach(() => {
    cache = new SemanticCache()
  })

  it('should store and retrieve by embedding', () => {
    const entry = cache.store('test content', [0.1, 0.2, 0.3])
    expect(entry.id).toBeDefined()

    const results = cache.search([0.1, 0.2, 0.3])
    expect(results.length).toBe(1)
  })

  it('should find similar entries', () => {
    cache.store('content 1', [0.1, 0.2, 0.3])
    cache.store('content 2', [0.3, 0.2, 0.1])

    const results = cache.search([0.1, 0.2, 0.3], 0.9)
    expect(results.length).toBe(1)
    expect(results[0].entry.content).toBe('content 1')
  })

  it('should return empty for no matches', () => {
    cache.store('content 1', [1, 0, 0])

    const results = cache.search([0, 1, 0], 0.9)
    expect(results.length).toBe(0)
  })

  it('should store with metadata', () => {
    const entry = cache.store('test', [0.1], { type: 'test' })
    expect(entry.metadata.type).toBe('test')
  })
})