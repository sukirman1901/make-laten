import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createDatabase, type Database } from '../../src/graph/database.js'
import { NodeStore } from '../../src/graph/nodes.js'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

describe('NodeStore', () => {
  let db: Database
  let store: NodeStore
  let testDbPath: string

  beforeEach(async () => {
    testDbPath = path.join(process.cwd(), `test-${crypto.randomUUID()}.db`)
    db = await createDatabase(testDbPath)
    store = new NodeStore(db)
  })

  afterEach(async () => {
    db.close()
    await fs.unlink(testDbPath).catch(() => {})
  })

  it('should upsert and get node', async () => {
    await store.upsert({
      id: 'file:src/main.ts',
      type: 'file',
      content: 'export const main = () => {}',
      metadata: { language: 'typescript' }
    })

    const node = await store.get('file:src/main.ts')
    expect(node).not.toBeNull()
    expect(node!.id).toBe('file:src/main.ts')
    expect(node!.type).toBe('file')
    expect(node!.content).toBe('export const main = () => {}')
  })

  it('should return null for non-existent node', async () => {
    const node = await store.get('file:nonexistent.ts')
    expect(node).toBeNull()
  })

  it('should update access count on get', async () => {
    await store.upsert({
      id: 'file:src/main.ts',
      type: 'file',
      content: 'test',
      metadata: {}
    })

    await store.get('file:src/main.ts')
    await store.get('file:src/main.ts')

    const node = await store.get('file:src/main.ts')
    expect(node!.accessCount).toBe(4) // 1 upsert + 3 gets
  })

  it('should delete node', async () => {
    await store.upsert({
      id: 'file:src/main.ts',
      type: 'file',
      content: 'test',
      metadata: {}
    })

    await store.delete('file:src/main.ts')
    const node = await store.get('file:src/main.ts')
    expect(node).toBeNull()
  })

  it('should list nodes by type', async () => {
    await store.upsert({ id: 'file:a.ts', type: 'file', content: 'a', metadata: {} })
    await store.upsert({ id: 'file:b.ts', type: 'file', content: 'b', metadata: {} })
    await store.upsert({ id: 'cmd:ls', type: 'command', content: 'ls output', metadata: {} })

    const files = await store.listByType('file')
    expect(files).toHaveLength(2)
    
    const commands = await store.listByType('command')
    expect(commands).toHaveLength(1)
  })
})
