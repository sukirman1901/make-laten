import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createDatabase, type Database } from '../../src/graph/database.js'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

describe('Database', () => {
  let db: Database
  let testDbPath: string

  beforeEach(async () => {
    testDbPath = path.join(process.cwd(), `test-${crypto.randomUUID()}.db`)
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
    expect(indexNames).toContain('idx_edges_type')
    expect(indexNames).toContain('idx_nodes_created')
    expect(indexNames).toContain('idx_nodes_accessed')
  })

  it('should enable WAL mode', () => {
    const result = db.pragma('journal_mode', { simple: true }) as string
    expect(result).toBe('wal')
  })

  it('should enable foreign keys', () => {
    const result = db.pragma('foreign_keys', { simple: true }) as number
    expect(result).toBe(1)
  })

  it('should have correct nodes columns', () => {
    const columns = db.prepare("PRAGMA table_info(nodes)").all() as { name: string }[]
    const colNames = columns.map(c => c.name)
    
    expect(colNames).toContain('id')
    expect(colNames).toContain('type')
    expect(colNames).toContain('content')
    expect(colNames).toContain('original')
    expect(colNames).toContain('embedding')
    expect(colNames).toContain('metadata')
    expect(colNames).toContain('created_at')
    expect(colNames).toContain('accessed_at')
    expect(colNames).toContain('access_count')
  })

  it('should have correct edges columns', () => {
    const columns = db.prepare("PRAGMA table_info(edges)").all() as { name: string }[]
    const colNames = columns.map(c => c.name)
    
    expect(colNames).toContain('id')
    expect(colNames).toContain('source')
    expect(colNames).toContain('target')
    expect(colNames).toContain('type')
    expect(colNames).toContain('weight')
    expect(colNames).toContain('metadata')
    expect(colNames).toContain('created_at')
  })
})
