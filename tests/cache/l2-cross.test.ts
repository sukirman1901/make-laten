import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createDatabase, type Database } from '../../src/graph/database.js'
import { CrossSessionCache } from '../../src/cache/l2-cross.js'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

describe('CrossSessionCache', () => {
  let db: Database
  let cache: CrossSessionCache
  let testDbPath: string

  beforeEach(async () => {
    testDbPath = path.join(process.cwd(), `test-${crypto.randomUUID()}.db`)
    db = await createDatabase(testDbPath)
    cache = new CrossSessionCache(db)
  })

  afterEach(async () => {
    db.close()
    await fs.unlink(testDbPath).catch(() => {})
  })

  it('should store and retrieve across sessions', async () => {
    await cache.set('file:src/main.ts', { content: 'compressed', metadata: {} })
    const result = await cache.get('file:src/main.ts')
    expect(result).not.toBeNull()
    expect(result!.content).toBe('compressed')
  })

  it('should return null for missing keys', async () => {
    const result = await cache.get('file:nonexistent.ts')
    expect(result).toBeNull()
  })

  it('should respect TTL', async () => {
    await cache.set('key1', { content: 'v1', metadata: {} }, { ttl: 1 })
    const result1 = await cache.get('key1')
    expect(result1).not.toBeNull()
    await new Promise(resolve => setTimeout(resolve, 1100))
    const result2 = await cache.get('key1')
    expect(result2).toBeNull()
  })
})
