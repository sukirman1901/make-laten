import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createDatabase, type Database } from '../../src/graph/database.js'
import { NodeStore } from '../../src/graph/nodes.js'
import { EdgeStore } from '../../src/graph/edges.js'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

describe('EdgeStore', () => {
  let db: Database
  let nodes: NodeStore
  let edges: EdgeStore
  let testDbPath: string

  beforeEach(async () => {
    testDbPath = path.join(process.cwd(), `test-${crypto.randomUUID()}.db`)
    db = await createDatabase(testDbPath)
    nodes = new NodeStore(db)
    edges = new EdgeStore(db)
    
    await nodes.upsert({ id: 'file:a.ts', type: 'file', content: 'a', metadata: {} })
    await nodes.upsert({ id: 'file:b.ts', type: 'file', content: 'b', metadata: {} })
  })

  afterEach(async () => {
    db.close()
    await fs.unlink(testDbPath).catch(() => {})
  })

  it('should add and get edges', async () => {
    await edges.add({
      source: 'file:a.ts',
      target: 'file:b.ts',
      type: 'depends_on',
      weight: 1.0
    })

    const fromA = await edges.getFrom('file:a.ts')
    expect(fromA).toHaveLength(1)
    expect(fromA[0].target).toBe('file:b.ts')
    expect(fromA[0].type).toBe('depends_on')
  })

  it('should get edges by type', async () => {
    await edges.add({ source: 'file:a.ts', target: 'file:b.ts', type: 'depends_on', weight: 1.0 })
    await edges.add({ source: 'file:a.ts', target: 'file:b.ts', type: 'related_to', weight: 0.8 })

    const dependsOn = await edges.getFrom('file:a.ts', 'depends_on')
    expect(dependsOn).toHaveLength(1)
    
    const relatedTo = await edges.getFrom('file:a.ts', 'related_to')
    expect(relatedTo).toHaveLength(1)
  })

  it('should delete edges', async () => {
    await edges.add({ source: 'file:a.ts', target: 'file:b.ts', type: 'depends_on', weight: 1.0 })
    await edges.delete('file:a.ts', 'file:b.ts')
    
    const fromA = await edges.getFrom('file:a.ts')
    expect(fromA).toHaveLength(0)
  })
})