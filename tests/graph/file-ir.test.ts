import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createDatabase } from '../../src/graph/database.js'
import { NodeStore } from '../../src/graph/nodes.js'
import { EdgeStore } from '../../src/graph/edges.js'
import { upsertFileIR, invalidateFileIR } from '../../src/graph/file-ir.js'
import { buildSymbolIR } from '../../src/compress/symbol-ir.js'

describe('file-ir graph', () => {
  let dbPath: string
  let db: Awaited<ReturnType<typeof createDatabase>>

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `make-laten-graph-${process.pid}-${Date.now()}.db`)
    db = await createDatabase(dbPath)
  })

  afterEach(() => {
    try { db.close() } catch {}
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('upserts file and ir nodes with has_ir edge', async () => {
    const nodes = new NodeStore(db)
    const edges = new EdgeStore(db)
    const ir = buildSymbolIR('export function x() { return 1 }\n', 'src/x.ts', 42)

    await upsertFileIR(nodes, edges, ir)

    const fileNode = await nodes.get(`file:${ir.filePath}`)
    const irNode = await nodes.get(`ir:${ir.id}`)
    expect(fileNode).toBeTruthy()
    expect(irNode).toBeTruthy()
    expect(irNode!.content).toContain('x')

    const out = await edges.getFrom(`file:${ir.filePath}`)
    expect(out.some(e => e.type === 'has_ir' && e.target === `ir:${ir.id}`)).toBe(true)
  })

  it('invalidate removes ir node and edges', async () => {
    const nodes = new NodeStore(db)
    const edges = new EdgeStore(db)
    const ir = buildSymbolIR('export function x() { return 1 }\n', 'src/x.ts', 42)
    await upsertFileIR(nodes, edges, ir)
    await invalidateFileIR(nodes, edges, ir.filePath, ir.id)

    expect(await nodes.get(`ir:${ir.id}`)).toBeNull()
  })
})
