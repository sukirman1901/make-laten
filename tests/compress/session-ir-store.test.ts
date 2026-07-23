import { describe, it, expect } from 'vitest'
import { SessionIRStore } from '../../src/compress/session-ir-store.js'
import { buildSymbolIR } from '../../src/compress/symbol-ir.js'

describe('SessionIRStore', () => {
  it('stores and retrieves IR by path', () => {
    const store = new SessionIRStore()
    const ir = buildSymbolIR('export function a() { return 1 }\n', '/abs/a.ts', 10)
    store.set(ir)
    expect(store.get('/abs/a.ts')?.id).toBe(ir.id)
  })

  it('normalizes relative vs absolute inconsistently only by string key used', () => {
    const store = new SessionIRStore()
    const ir = buildSymbolIR('export function a() { return 1 }\n', 'src/a.ts', 10)
    store.set(ir)
    expect(store.get('src/a.ts')).toBeTruthy()
    expect(store.get('other.ts')).toBeNull()
  })

  it('isStale when mtime differs', () => {
    const store = new SessionIRStore()
    const ir = buildSymbolIR('export function a() { return 1 }\n', 'src/a.ts', 10)
    store.set(ir)
    expect(store.isStale('src/a.ts', 10)).toBe(false)
    expect(store.isStale('src/a.ts', 11)).toBe(true)
    expect(store.isStale('missing.ts', 1)).toBe(true)
  })

  it('delete removes entry', () => {
    const store = new SessionIRStore()
    const ir = buildSymbolIR('export function a() { return 1 }\n', 'src/a.ts', 10)
    store.set(ir)
    store.delete('src/a.ts')
    expect(store.get('src/a.ts')).toBeNull()
  })
})
