import type { Database } from './database.js'

export interface GraphNode {
  id: string
  type: string
  content: string
  original?: string
  embedding?: Buffer
  metadata: Record<string, any>
  createdAt: number
  accessedAt: number
  accessCount: number
}

interface NodeRow {
  id: string
  type: string
  content: string
  original: string | null
  embedding: Buffer | null
  metadata: string
  created_at: number
  accessed_at: number
  access_count: number
}

export class NodeStore {
  constructor(private db: Database) {}

  async upsert(node: Partial<GraphNode> & { id: string; type: string; content: string }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO nodes (id, type, content, original, metadata, created_at, accessed_at, access_count)
      VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch(), 1)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        original = excluded.original,
        metadata = excluded.metadata,
        accessed_at = unixepoch(),
        access_count = access_count + 1
    `)

    stmt.run(
      node.id,
      node.type,
      node.content,
      node.original || null,
      JSON.stringify(node.metadata || {})
    )
  }

  async get(id: string): Promise<GraphNode | null> {
    // Update access count and timestamp
    this.db.prepare(`
      UPDATE nodes SET accessed_at = unixepoch(), access_count = access_count + 1
      WHERE id = ?
    `).run(id)

    // Get node
    const row = this.db.prepare('SELECT * FROM nodes WHERE id = ?').get(id) as NodeRow | undefined
    if (!row) return null

    return this.hydrate(row)
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM edges WHERE source = ? OR target = ?').run(id, id)
    this.db.prepare('DELETE FROM nodes WHERE id = ?').run(id)
  }

  async listByType(type: string): Promise<GraphNode[]> {
    const rows = this.db.prepare('SELECT * FROM nodes WHERE type = ?').all(type) as NodeRow[]
    return rows.map(row => this.hydrate(row))
  }

  private hydrate(row: NodeRow): GraphNode {
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      original: row.original || undefined,
      embedding: row.embedding || undefined,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      accessedAt: row.accessed_at,
      accessCount: row.access_count
    }
  }
}
