import { describe, it, expect } from 'vitest'
import { FileReadCompressor } from '../src/compress/file-read.js'
import { DetailExpander } from '../src/compress/detail-expander.js'
import { SessionIRStore } from '../src/compress/session-ir-store.js'
import fs from 'fs'
import path from 'path'

describe('tiered read integration', () => {
  it('overview then detail returns bit-exact method body from real file', async () => {
    const filePath = path.resolve('src/compress/confidence.ts')
    const content = fs.readFileSync(filePath, 'utf-8')
    const mtimeMs = fs.statSync(filePath).mtimeMs

    const store = new SessionIRStore()
    const compressor = new FileReadCompressor()
    const overview = await compressor.compress({
      content,
      filePath,
      language: 'typescript',
      mtimeMs
    } as any)

    // small files may passthrough — still allow detail expand
    if (overview.metadata.ir) {
      store.set(overview.metadata.ir)
    }

    const expander = new DetailExpander({ store })
    const symbols = (overview.metadata.symbols as Array<{ name: string; kind: string }>) || []
    let targetName = symbols.find(s => s.kind === 'function')?.name

    if (!targetName) {
      // rebuild IR for small passthrough files
      const { buildSymbolIR } = await import('../src/compress/symbol-ir.js')
      const ir = buildSymbolIR(content, filePath, mtimeMs)
      store.set(ir)
      targetName = ir.symbols.find(s => s.kind === 'function')?.name
    }

    expect(targetName).toBeTruthy()

    const detail = await expander.expand({
      content,
      filePath,
      mtimeMs,
      focus: { type: 'symbol', name: targetName! }
    })

    expect(detail.ok).toBe(true)
    if (!detail.ok) return

    const lines = content.split('\n')
    const expected = lines.slice(detail.range.start - 1, detail.range.end).join('\n')
    expect(detail.content).toBe(expected)
  })
})
