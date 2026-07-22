import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createDatabase, type Database } from '../../src/graph/database.js'
import fs from 'fs/promises'
import path from 'path'

describe('Database', () => {
  let db: Database
  const testDbPath = path.join(process.cwd(), 'test.db')

  beforeEach(async () => {
    db = await createDatabase(testDbPath)
  })

  afterEach(async () => {
    db.close()
    await fs.unlink(testDbPath).catch(() => {})
  })

  it('should create database with schema', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all() as { name: string }[]
    
    const tableNames = tables.map(t => t.name)
    expect(tableNames).toContain('nodes')
    expect(tableNames).toContain('edges')
  })

  it('should have correct indexes', () => {
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index'"
    ).all() as { name: string }[]
    
    const indexNames = indexes.map(i => i.name)
    expect(indexNames).toContain('idx_nodes_type')
    expect(indexNames).toContain('idx_edges_source')
    expect(indexNames).toContain('idx_edges_target')
  })
})