import type { SymbolIR } from './symbol-ir.js'

export class SessionIRStore {
  private map = new Map<string, SymbolIR>()

  set(ir: SymbolIR): void {
    this.map.set(ir.filePath, ir)
  }

  get(filePath: string): SymbolIR | null {
    return this.map.get(filePath) ?? null
  }

  isStale(filePath: string, mtimeMs: number): boolean {
    const ir = this.map.get(filePath)
    if (!ir) return true
    return ir.mtimeMs !== mtimeMs
  }

  delete(filePath: string): void {
    this.map.delete(filePath)
  }

  clear(): void {
    this.map.clear()
  }
}
