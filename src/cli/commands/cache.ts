import { createDatabase } from '../../graph/database.js'
import { makeLatenCache } from '../../cache/index.js'

export async function cacheStatsCommand(): Promise<void> {
  try {
    const dbPath = process.env.MAKE_LATEN_DB || '.make-laten.db'
    const db = await createDatabase(dbPath)
    const cache = makeLatenCache(db)

    const stats = cache.stats()

    console.log(JSON.stringify({
      l1: {
        hits: stats.l1.hits,
        misses: stats.l1.misses,
        size: stats.l1.size,
        hitRate: `${(stats.l1.hitRate * 100).toFixed(1)}%`
      },
      l2: {
        size: stats.l2.size
      }
    }, null, 2))

    db.close()
  } catch (error: any) {
    console.error(`Error cache stats:`, error.message)
    process.exit(1)
  }
}

export async function cacheClearCommand(): Promise<void> {
  try {
    const dbPath = process.env.MAKE_LATEN_DB || '.make-laten.db'
    const db = await createDatabase(dbPath)
    const cache = makeLatenCache(db)

    await cache.invalidate('*')

    console.log(JSON.stringify({ cleared: true }))
    db.close()
  } catch (error: any) {
    console.error(`Error cache clear:`, error.message)
    process.exit(1)
  }
}
