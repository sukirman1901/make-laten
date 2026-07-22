import type { Database } from '../graph/database.js'
import { SessionCache, type CacheEntry, type CacheStats } from './l1-session.js'
import { CrossSessionCache } from './l2-cross.js'
import { SemanticCache } from './semantic.js'

export interface UnifiedCacheStats {
  l1: CacheStats
  l2: { size: number }
}

export function createCacheManager(db?: Database) {
  const session = new SessionCache()
  const crossSession = db ? new CrossSessionCache(db) : (null as any)
  const semantic = new SemanticCache()

  return {
    session,
    crossSession,
    semantic
  }
}

export function makeLatenCache(db: Database) {
  const l1 = new SessionCache()
  const l2 = new CrossSessionCache(db)

  return {
    l1,
    l2,

    async get(key: string): Promise<CacheEntry | null> {
      const l1Result = l1.get(key)
      if (l1Result) return l1Result

      const l2Result = await l2.get(key)
      if (l2Result) {
        l1.set(key, l2Result)
        return l2Result
      }

      return null
    },

    async set(key: string, value: CacheEntry, options?: { ttl?: number }): Promise<void> {
      l1.set(key, value)
      await l2.set(key, value, options)
    },

    async invalidate(pattern: string): Promise<void> {
      l1.clear()
      await l2.clear()
    },

    stats(): UnifiedCacheStats {
      return {
        l1: l1.stats(),
        l2: { size: 0 }
      }
    }
  }
}

export { SessionCache, CrossSessionCache, SemanticCache }
export type { CacheEntry, CacheStats }
