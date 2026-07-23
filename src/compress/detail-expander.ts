import { buildSymbolIR, findSymbolsByName, type IrSymbol, type SymbolIR } from './symbol-ir.js'
import { SessionIRStore } from './session-ir-store.js'

export type DetailFocus =
  | { type: 'symbol'; name: string }
  | { type: 'range'; start: number; end: number }
  | { type: 'export'; name: string }

export type ExpandOk = {
  ok: true
  content: string
  range: { start: number; end: number }
  symbol?: IrSymbol
  irId: string
}

export type ExpandErr = {
  ok: false
  code: 'invalid_range' | 'symbol_not_found' | 'ambiguous_symbol' | 'invalid_focus'
  message: string
  candidates?: IrSymbol[]
  irId?: string
}

export type ExpandResult = ExpandOk | ExpandErr

export interface ExpandInput {
  content: string
  filePath: string
  mtimeMs: number
  focus: DetailFocus
}

function sliceLines(content: string, start: number, end: number): string {
  const lines = content.split('\n')
  return lines.slice(start - 1, end).join('\n')
}

export class DetailExpander {
  private store: SessionIRStore

  constructor(options?: { store?: SessionIRStore }) {
    this.store = options?.store ?? new SessionIRStore()
  }

  getStore(): SessionIRStore {
    return this.store
  }

  private resolveIR(content: string, filePath: string, mtimeMs: number): SymbolIR {
    const existing = this.store.get(filePath)
    if (existing && !this.store.isStale(filePath, mtimeMs)) return existing
    const ir = buildSymbolIR(content, filePath, mtimeMs)
    this.store.set(ir)
    return ir
  }

  async expand(input: ExpandInput): Promise<ExpandResult> {
    const { content, filePath, mtimeMs, focus } = input
    const lines = content.split('\n')
    const lineCount = lines.length

    if (focus.type === 'range') {
      const { start, end } = focus
      if (start < 1 || end < start || end > lineCount) {
        return {
          ok: false,
          code: 'invalid_range',
          message: `invalid range ${start}-${end} for file with ${lineCount} lines`
        }
      }
      const ir = this.resolveIR(content, filePath, mtimeMs)
      return {
        ok: true,
        content: sliceLines(content, start, end),
        range: { start, end },
        irId: ir.id
      }
    }

    const ir = this.resolveIR(content, filePath, mtimeMs)
    const name = focus.type === 'export' ? focus.name : focus.name
    const hits = findSymbolsByName(ir, name)

    if (hits.length === 0) {
      return {
        ok: false,
        code: 'symbol_not_found',
        message: `symbol not found: ${name}`,
        irId: ir.id
      }
    }
    if (hits.length > 1) {
      return {
        ok: false,
        code: 'ambiguous_symbol',
        message: `ambiguous symbol: ${name}`,
        candidates: hits,
        irId: ir.id
      }
    }

    const sym = hits[0]
    const start = sym.startLine
    const end = Math.min(sym.endLine, lineCount)
    if (start < 1 || end < start) {
      return {
        ok: false,
        code: 'invalid_range',
        message: `symbol ${name} has invalid range`,
        irId: ir.id
      }
    }

    return {
      ok: true,
      content: sliceLines(content, start, end),
      range: { start, end },
      symbol: sym,
      irId: ir.id
    }
  }
}
