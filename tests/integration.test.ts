import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createDatabase } from '../src/graph/database.js'
import { NodeStore } from '../src/graph/nodes.js'
import { EdgeStore } from '../src/graph/edges.js'
import { FileReadCompressor } from '../src/compress/file-read.js'
import { makeLatenCache } from '../src/cache/index.js'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

describe('Integration', () => {
  let db: any
  let nodes: NodeStore
  let edges: EdgeStore
  let cache: ReturnType<typeof makeLatenCache>
  let testDbPath: string

  beforeEach(async () => {
    testDbPath = path.join(process.cwd(), `test-${crypto.randomUUID()}.db`)
    db = await createDatabase(testDbPath)
    nodes = new NodeStore(db)
    edges = new EdgeStore(db)
    cache = makeLatenCache(db)
  })

  afterEach(async () => {
    db.close()
    await fs.unlink(testDbPath).catch(() => {})
  })

  it('should compress, cache, and store in graph', async () => {
    const content = `
export function hello() {
  console.log('world')
}

export function goodbye() {
  console.log('see ya')
}
    `.trim()

    // 1. Compress
    const compressor = new FileReadCompressor()
    const compressed = await compressor.compress({
      content,
      filePath: 'src/greetings.ts',
      language: 'typescript'
    })

    expect(compressed.confidence).toBeGreaterThan(0.7)

    // 2. Cache
    await cache.set('file:src/greetings.ts', {
      content: compressed.content,
      metadata: compressed.metadata
    })

    const cached = await cache.get('file:src/greetings.ts')
    expect(cached).not.toBeNull()
    expect(cached!.content).toBe(compressed.content)

    // 3. Store in graph
    await nodes.upsert({
      id: 'file:src/greetings.ts',
      type: 'file',
      content: compressed.content,
      original: content,
      metadata: compressed.metadata
    })

    const node = await nodes.get('file:src/greetings.ts')
    expect(node).not.toBeNull()
    expect(node!.original).toBe(content)
  })
})