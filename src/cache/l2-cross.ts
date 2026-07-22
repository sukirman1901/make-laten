import type { Database } from '../graph/database.js'
import type { CacheEntry } from './l1-session.js'

interface CacheOptions {
  ttl?: number
}

export class CrossSessionCache {
  constructor(private db: Database) {}

  async get(key: string): Promise<CacheEntry | null> {
    const row = this.db.prepare(`
      SELECT content, metadata, created_at 
      FROM nodes 
      WHERE id = ? AND type = 'cache'
    `).get(key) as { content: string; metadata: string; created_at: number } | undefined

    if (!row) return null

    const metadata = JSON.parse(row.metadata)
    if (metadata.ttl) {
      const age = Date.now() / 1000 - row.created_at
      if (age > metadata.ttl) {
        this.db.prepare('DELETE FROM nodes WHERE id = ?').run(key)
        return null
      }
    }

    this.db.prepare(`
      UPDATE nodes SET accessed_at = unixepoch(), access_count = access_count + 1
      WHERE id = ?
    `).run(key)

    return {
      content: row.content,
      metadata: JSON.parse(row.metadata)
    }
  }

  async set(key: string, value: CacheEntry, options?: CacheOptions): Promise<void> {
    this.db.prepare(`
      INSERT INTO nodes (id, type, content, metadata, created_at, accessed_at, access_count)
      VALUES (?, 'cache', ?, ?, unixepoch(), unixepoch(), 1)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        metadata = excluded.metadata,
        accessed_at = unixepoch(),
        access_count = access_count + 1
    `).run(key, value.content, JSON.stringify({ ...value.metadata, ttl: options?.ttl }))
  }

  async delete(key: string): Promise<void> {
    this.db.prepare('DELETE FROM nodes WHERE id = ?').run(key)
  }

  async clear(): Promise<void> {
    this.db.prepare("DELETE FROM nodes WHERE type = 'cache'").run()
  }
}
