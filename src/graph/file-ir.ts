import type { NodeStore } from './nodes.js'
import type { EdgeStore } from './edges.js'
import type { SymbolIR } from '../compress/symbol-ir.js'

export function fileNodeId(filePath: string): string {
  return `file:${filePath}`
}

export function irNodeId(irId: string): string {
  return `ir:${irId}`
}

export async function upsertFileIR(
  nodes: NodeStore,
  edges: EdgeStore,
  ir: SymbolIR
): Promise<void> {
  const fId = fileNodeId(ir.filePath)
  const iId = irNodeId(ir.id)

  await nodes.upsert({
    id: fId,
    type: 'file',
    content: ir.filePath,
    metadata: { mtimeMs: ir.mtimeMs, path: ir.filePath }
  })

  await nodes.upsert({
    id: iId,
    type: 'ir',
    content: JSON.stringify(ir.symbols),
    metadata: {
      irId: ir.id,
      filePath: ir.filePath,
      mtimeMs: ir.mtimeMs,
      symbolCount: ir.symbols.length
    }
  })

  const existing = await edges.getFrom(fId, 'has_ir')
  for (const e of existing) {
    await edges.delete(e.source, e.target)
  }

  await edges.add({
    source: fId,
    target: iId,
    type: 'has_ir',
    weight: 1
  })
}

export async function invalidateFileIR(
  nodes: NodeStore,
  edges: EdgeStore,
  filePath: string,
  irId: string
): Promise<void> {
  const fId = fileNodeId(filePath)
  const iId = irNodeId(irId)
  await edges.delete(fId, iId)
  await nodes.delete(iId)
}
