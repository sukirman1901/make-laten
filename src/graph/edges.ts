import type { Database } from './database.js'

export interface GraphEdge {
  id: number
  source: string
  target: string
  type: string
  weight: number
  metadata?: Record<string, any>
  createdAt: number
}

interface EdgeRow {
  id: number
  source: string
  target: string
  type: string
  weight: number
  metadata: string | null
  created_at: number
}

export class EdgeStore {
  constructor(private db: Database) {}

  async add(edge: Omit<GraphEdge, 'id' | 'createdAt'>): Promise<void> {
    this.db.prepare(`
      INSERT INTO edges (source, target, type, weight, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      edge.source,
      edge.target,
      edge.type,
      edge.weight,
      edge.metadata ? JSON.stringify(edge.metadata) : null
    )
  }

  async getFrom(source: string, type?: string): Promise<GraphEdge[]> {
    let query = 'SELECT * FROM edges WHERE source = ?'
    const params: any[] = [source]

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    const rows = this.db.prepare(query).all(...params) as EdgeRow[]
    return rows.map(row => this.hydrate(row))
  }

  async getTo(target: string, type?: string): Promise<GraphEdge[]> {
    let query = 'SELECT * FROM edges WHERE target = ?'
    const params: any[] = [target]

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    const rows = this.db.prepare(query).all(...params) as EdgeRow[]
    return rows.map(row => this.hydrate(row))
  }

  async delete(source: string, target: string): Promise<void> {
    this.db.prepare('DELETE FROM edges WHERE source = ? AND target = ?').run(source, target)
  }

  private hydrate(row: EdgeRow): GraphEdge {
    return {
      id: row.id,
      source: row.source,
      target: row.target,
      type: row.type,
      weight: row.weight,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at
    }
  }
}