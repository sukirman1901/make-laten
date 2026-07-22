import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createDatabase, type Database } from '../../src/graph/database.js'
import { makeLatenCache } from '../../src/cache/index.js'
import fs from 'fs/promises'
import path from 'path'

describe('makeLatenCache', () => {
  let db: Database
  let cache: ReturnType<typeof makeLatenCache>
  const testDbPath = path.join(process.cwd(), 'test.db')

  beforeEach(async () => {
    db = await createDatabase(testDbPath)
    cache = makeLatenCache(db)
  })

  afterEach(async () => {
    db.close()
    await fs.unlink(testDbPath).catch(() => {})
  })

  it('should check L1 first, then L2', async () => {
    await cache.l2.set('key1', { content: 'from-l2', metadata: {} })
    const result = await cache.get('key1')
    expect(result).not.toBeNull()
    expect(result!.content).toBe('from-l2')
  })

  it('should store in both L1 and L2', async () => {
    await cache.set('key1', { content: 'test', metadata: {} })
    const l1 = cache.l1.get('key1')
    expect(l1).not.toBeNull()
    const l2 = await cache.l2.get('key1')
    expect(l2).not.toBeNull()
  })

  it('should return combined stats', async () => {
    cache.l1.get('missing')
    await cache.set('key1', { content: 'v1', metadata: {} })
    cache.l1.get('key1')
    const stats = cache.stats()
    expect(stats.l1).toBeDefined()
    expect(stats.l2).toBeDefined()
  })
})
