import { describe, it, expect } from 'vitest'
import { DetailExpander } from '../../src/compress/detail-expander.js'
import { buildSymbolIR } from '../../src/compress/symbol-ir.js'
import { SessionIRStore } from '../../src/compress/session-ir-store.js'

const CONTENT = [
  'export class A {',
  '  foo() {',
  '    return 1',
  '  }',
  '  bar() {',
  '    return 2',
  '  }',
  '}',
  '',
  'export function util() {',
  '  return 3',
  '}',
].join('\n')

describe('DetailExpander', () => {
  it('slices by range bit-exact', async () => {
    const expander = new DetailExpander()
    const result = await expander.expand({
      content: CONTENT,
      filePath: 'a.ts',
      mtimeMs: 1,
      focus: { type: 'range', start: 2, end: 4 }
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toBe('  foo() {\n    return 1\n  }')
    expect(result.range).toEqual({ start: 2, end: 4 })
  })

  it('slices by symbol using IR', async () => {
    const store = new SessionIRStore()
    const ir = buildSymbolIR(CONTENT, 'a.ts', 1)
    store.set(ir)
    const expander = new DetailExpander({ store })
    const result = await expander.expand({
      content: CONTENT,
      filePath: 'a.ts',
      mtimeMs: 1,
      focus: { type: 'symbol', name: 'foo' }
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('return 1')
    expect(result.content).not.toContain('return 2')
  })

  it('returns candidates when symbol ambiguous', async () => {
    const twin = [
      'export class A {',
      '  run() { return 1 }',
      '}',
      'export class B {',
      '  run() { return 2 }',
      '}',
    ].join('\n')
    const expander = new DetailExpander()
    const result = await expander.expand({
      content: twin,
      filePath: 't.ts',
      mtimeMs: 1,
      focus: { type: 'symbol', name: 'run' }
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('ambiguous_symbol')
    expect(result.candidates!.length).toBe(2)
  })

  it('resolves qualified symbol', async () => {
    const twin = [
      'export class A {',
      '  run() { return 1 }',
      '}',
      'export class B {',
      '  run() { return 2 }',
      '}',
    ].join('\n')
    const expander = new DetailExpander()
    const result = await expander.expand({
      content: twin,
      filePath: 't.ts',
      mtimeMs: 1,
      focus: { type: 'symbol', name: 'B.run' }
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('return 2')
  })

  it('errors on invalid range', async () => {
    const expander = new DetailExpander()
    const result = await expander.expand({
      content: 'a\nb\n',
      filePath: 'x.ts',
      mtimeMs: 1,
      focus: { type: 'range', start: 5, end: 9 }
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('invalid_range')
  })
})
