import { describe, it, expect, beforeEach } from 'vitest'
import { SessionCache } from '../../src/cache/l1-session.js'

describe('SessionCache', () => {
  let cache: SessionCache

  beforeEach(() => {
    cache = new SessionCache()
  })

  it('should store and retrieve values', () => {
    cache.set('key1', { content: 'value1', metadata: {} })
    const result = cache.get('key1')
    expect(result).not.toBeNull()
    expect(result!.content).toBe('value1')
  })

  it('should return null for missing keys', () => {
    const result = cache.get('nonexistent')
    expect(result).toBeNull()
  })

  it('should track hit/miss stats', () => {
    cache.get('missing')
    cache.set('key1', { content: 'v1', metadata: {} })
    cache.get('key1')
    cache.get('key1')

    const stats = cache.stats()
    expect(stats.hits).toBe(2)
    expect(stats.misses).toBe(1)
  })

  it('should clear all entries', () => {
    cache.set('key1', { content: 'v1', metadata: {} })
    cache.set('key2', { content: 'v2', metadata: {} })
    cache.clear()

    expect(cache.get('key1')).toBeNull()
    expect(cache.get('key2')).toBeNull()
  })
})
