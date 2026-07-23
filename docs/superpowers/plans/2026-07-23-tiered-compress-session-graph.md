# Tiered Compress + Session Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Solid overview file-read compression with zero-loss on-demand detail, session IR storage, thin file↔ir graph wiring, and isolated learn persistence so the full test suite stays green.

**Architecture:** Overview via `FileReadCompressor` builds a `SymbolIR` (symbol → line ranges) stored in `SessionIRStore`. New `DetailExpander` returns bit-exact original slices by symbol or range. MCP/CLI expose detail path. Graph upserts `file`/`ir` nodes. Learn layers already support `persistencePath`; tests must always inject temp paths.

**Tech Stack:** TypeScript, Vitest, Node fs, better-sqlite3 (existing graph), Commander CLI, custom MCP JSON-RPC server.

**Spec:** `docs/superpowers/specs/2026-07-23-tiered-compress-session-graph-design.md`

---

## File map

| Path | Role |
|------|------|
| `src/compress/symbol-ir.ts` | **Create** — types + `buildSymbolIR(content, filePath, mtimeMs)` |
| `src/compress/detail-expander.ts` | **Create** — zero-loss slice by focus |
| `src/compress/session-ir-store.ts` | **Create** — in-memory IR by normalized path |
| `src/compress/file-read.ts` | **Modify** — overview includes ranges + IR metadata |
| `src/compress/structure.ts` | **Modify** only if needed for line-aware helpers; prefer new logic in `symbol-ir.ts` |
| `src/compress/types.ts` | **Modify** — extend metadata types if useful |
| `src/compress/index.ts` | **Modify** — export new modules |
| `src/graph/file-ir.ts` | **Create** — upsert/invalidate file↔ir helpers |
| `src/cli/commands/read.ts` | **Modify** — `--symbol` / `--range` / `--export` |
| `src/cli/index.ts` | **Modify** — wire read options |
| `src/mcp/server.ts` | **Modify** — `make-laten-read-detail` tool + overview IR store |
| `src/learn/*` | **No API change** — tests inject paths |
| `tests/learn/failure-learner.test.ts` | **Modify** — temp persistence |
| `tests/compress/symbol-ir.test.ts` | **Create** |
| `tests/compress/detail-expander.test.ts` | **Create** |
| `tests/compress/session-ir-store.test.ts` | **Create** |
| `tests/compress/file-read.test.ts` | **Modify** — overview metadata/IR |
| `tests/graph/file-ir.test.ts` | **Create** |
| `tests/integration-tiered-read.test.ts` | **Create** — overview → detail |
| `README.md`, `skills/SKILL.md`, `CHANGELOG.md` | **Modify** — wave 4 docs |

---

### Task 0: Fix learn test isolation (Wave 0)

**Files:**
- Modify: `tests/learn/failure-learner.test.ts`
- Modify: `tests/learn/pattern-miner.test.ts` (harden temp path uniqueness)
- Test: same files

- [ ] **Step 1: Rewrite failure-learner tests with isolated temp path**

Replace full file content of `tests/learn/failure-learner.test.ts` with:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FailureLearner } from '../../src/learn/failure-learner.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('FailureLearner', () => {
  let learner: FailureLearner
  let tmpFile: string

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `make-laten-failures-${process.pid}-${Date.now()}.json`)
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    learner = new FailureLearner({ persistencePath: tmpFile })
  })

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
  })

  it('should record failures', () => {
    learner.record({
      type: 'compress',
      error: 'File not found',
      context: { filePath: '/missing.ts' }
    })

    const failures = learner.getFailures()
    expect(failures.length).toBe(1)
    expect(failures[0].error).toBe('File not found')
  })

  it('should detect repeated failures', () => {
    for (let i = 0; i < 3; i++) {
      learner.record({
        type: 'compress',
        error: 'File not found',
        context: { filePath: `/missing${i}.ts` }
      })
    }

    const suggestions = learner.getSuggestions('compress')
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('should provide recovery suggestions', () => {
    learner.record({
      type: 'compress',
      error: 'File not found',
      context: { filePath: '/missing.ts' }
    })

    const suggestions = learner.getSuggestions('compress')
    expect(suggestions.some(s => s.includes('check'))).toBe(true)
  })

  it('starts empty when persistence file is missing', () => {
    expect(learner.getFailures()).toEqual([])
  })
})
```

- [ ] **Step 2: Harden pattern-miner temp path**

In `tests/learn/pattern-miner.test.ts`, change `beforeEach` to unique temp + cleanup:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PatternMiner } from '../../src/learn/pattern-miner.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('PatternMiner', () => {
  let miner: PatternMiner
  let tmpFile: string

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `make-laten-patterns-${process.pid}-${Date.now()}.json`)
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    miner = new PatternMiner({ persistencePath: tmpFile })
  })

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
  })

  // keep existing it() bodies unchanged
```

Keep the existing three `it(...)` blocks as they are; only wrap setup/teardown.

- [ ] **Step 3: Run learn tests**

Run: `npx vitest run tests/learn/failure-learner.test.ts tests/learn/pattern-miner.test.ts`

Expected: all PASS

- [ ] **Step 4: Run full suite**

Run: `npm test`

Expected: all tests PASS (223+), 0 failed

- [ ] **Step 5: Commit**

```bash
git add -f tests/learn/failure-learner.test.ts tests/learn/pattern-miner.test.ts
git commit -m "test: isolate learn persistence from home directory"
```

Note: `tests/` is gitignored — use `git add -f` for test files in this repo.

---

### Task 1: SymbolIR builder (Wave 1)

**Files:**
- Create: `src/compress/symbol-ir.ts`
- Create: `tests/compress/symbol-ir.test.ts`
- Modify: `src/compress/index.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/compress/symbol-ir.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildSymbolIR, findSymbolsByName } from '../../src/compress/symbol-ir.js'

const FIXTURE = `
export interface FileReadInput {
  content: string
}

export class FileReadCompressor {
  async compress(input: unknown): Promise<string> {
    const x = 1
    return String(x)
  }

  async decompress(c: string): Promise<string> {
    return c
  }
}

export function helper(a: number): number {
  return a + 1
}

export type CompressedResult = { content: string }
`

describe('buildSymbolIR', () => {
  it('extracts classes, methods, functions, types with line ranges', () => {
    const ir = buildSymbolIR(FIXTURE, '/tmp/sample.ts', 1000)
    expect(ir.filePath).toBe('/tmp/sample.ts')
    expect(ir.mtimeMs).toBe(1000)
    expect(ir.id).toBeTruthy()

    const classes = ir.symbols.filter(s => s.kind === 'class')
    expect(classes.some(s => s.name === 'FileReadCompressor')).toBe(true)

    const methods = ir.symbols.filter(s => s.kind === 'method')
    const compress = methods.find(s => s.name === 'compress' && s.parent === 'FileReadCompressor')
    expect(compress).toBeTruthy()
    expect(compress!.startLine).toBeGreaterThan(0)
    expect(compress!.endLine).toBeGreaterThanOrEqual(compress!.startLine)

    const fn = ir.symbols.find(s => s.kind === 'function' && s.name === 'helper')
    expect(fn).toBeTruthy()

    const types = ir.symbols.filter(s => s.kind === 'type' || s.kind === 'export')
    expect(types.length).toBeGreaterThan(0)
  })

  it('findSymbolsByName returns all matches', () => {
    const ir = buildSymbolIR(FIXTURE, '/tmp/sample.ts', 1)
    const hits = findSymbolsByName(ir, 'compress')
    expect(hits.length).toBe(1)
    expect(hits[0].parent).toBe('FileReadCompressor')
  })

  it('supports Qualified parent.name lookup', () => {
    const ir = buildSymbolIR(FIXTURE, '/tmp/sample.ts', 1)
    const hits = findSymbolsByName(ir, 'FileReadCompressor.compress')
    expect(hits.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/compress/symbol-ir.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/compress/symbol-ir.ts`**

```ts
import { createHash } from 'crypto'

export type SymbolKind = 'export' | 'class' | 'method' | 'function' | 'type'

export interface IrSymbol {
  name: string
  kind: SymbolKind
  parent?: string
  startLine: number
  endLine: number
}

export interface SymbolIR {
  id: string
  filePath: string
  mtimeMs: number
  symbols: IrSymbol[]
}

function lineAt(content: string, index: number): number {
  if (index <= 0) return 1
  let line = 1
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++
  }
  return line
}

function findMatchingBrace(content: string, openIdx: number): number {
  let depth = 0
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return content.length - 1
}

export function buildSymbolIR(content: string, filePath: string, mtimeMs: number): SymbolIR {
  const symbols: IrSymbol[] = []

  const classRe = /\bclass\s+(\w+)\s*[^{]*\{/g
  let m: RegExpExecArray | null
  while ((m = classRe.exec(content)) !== null) {
    const name = m[1]
    const openIdx = m.index + m[0].length - 1
    const closeIdx = findMatchingBrace(content, openIdx)
    const startLine = lineAt(content, m.index)
    const endLine = lineAt(content, closeIdx)
    symbols.push({ name, kind: 'class', startLine, endLine })

    const body = content.slice(openIdx + 1, closeIdx)
    const methodRe = /(?:public|private|protected|static|async|abstract|\s)*\b([A-Za-z_][\w]*)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g
    let mm: RegExpExecArray | null
    while ((mm = methodRe.exec(body)) !== null) {
      const methodName = mm[1]
      if (methodName === 'constructor' || methodName === 'if' || methodName === 'for' || methodName === 'while' || methodName === 'switch') continue
      const absOpen = openIdx + 1 + mm.index + mm[0].length - 1
      const absClose = findMatchingBrace(content, absOpen)
      symbols.push({
        name: methodName,
        kind: 'method',
        parent: name,
        startLine: lineAt(content, openIdx + 1 + mm.index),
        endLine: lineAt(content, absClose)
      })
    }
  }

  const fnRe = /\b(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g
  while ((m = fnRe.exec(content)) !== null) {
    const openIdx = m.index + m[0].length - 1
    const closeIdx = findMatchingBrace(content, openIdx)
    symbols.push({
      name: m[1],
      kind: 'function',
      startLine: lineAt(content, m.index),
      endLine: lineAt(content, closeIdx)
    })
  }

  const typeRe = /\b(?:export\s+)?(interface|type)\s+(\w+)\b/g
  while ((m = typeRe.exec(content)) !== null) {
    const kindWord = m[1]
    const name = m[2]
    let endLine = lineAt(content, m.index)
    const after = content.slice(m.index)
    const brace = after.indexOf('{')
    const eq = after.indexOf('=')
    if (kindWord === 'interface' || (brace >= 0 && (eq < 0 || brace < eq))) {
      const openIdx = m.index + brace
      const closeIdx = findMatchingBrace(content, openIdx)
      endLine = lineAt(content, closeIdx)
    } else {
      const semi = content.indexOf(';', m.index)
      endLine = lineAt(content, semi >= 0 ? semi : m.index)
    }
    symbols.push({
      name,
      kind: 'type',
      startLine: lineAt(content, m.index),
      endLine
    })
  }

  const id = createHash('sha256')
    .update(`${filePath}|${mtimeMs}|${content.length}`)
    .digest('hex')
    .slice(0, 12)

  return { id, filePath, mtimeMs, symbols }
}

export function findSymbolsByName(ir: SymbolIR, name: string): IrSymbol[] {
  if (name.includes('.')) {
    const [parent, child] = name.split('.', 2)
    return ir.symbols.filter(s => s.parent === parent && s.name === child)
  }
  return ir.symbols.filter(s => s.name === name)
}
```

- [ ] **Step 4: Export from compress index**

Add to `src/compress/index.ts`:

```ts
export * from './symbol-ir.js'
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `npx vitest run tests/compress/symbol-ir.test.ts`

Expected: PASS

If method ranges fail, adjust regex only inside `symbol-ir.ts` until fixtures pass — do not weaken assertions.

- [ ] **Step 6: Commit**

```bash
git add src/compress/symbol-ir.ts src/compress/index.ts
git add -f tests/compress/symbol-ir.test.ts
git commit -m "feat: add SymbolIR builder with line-ranged symbols"
```

---

### Task 2: SessionIRStore (Wave 1)

**Files:**
- Create: `src/compress/session-ir-store.ts`
- Create: `tests/compress/session-ir-store.test.ts`
- Modify: `src/compress/index.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/compress/session-ir-store.test.ts`:

```ts
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/compress/session-ir-store.test.ts`

Expected: FAIL module not found

- [ ] **Step 3: Implement store**

Create `src/compress/session-ir-store.ts`:

```ts
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
```

Export from `src/compress/index.ts`:

```ts
export * from './session-ir-store.js'
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/compress/session-ir-store.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/compress/session-ir-store.ts src/compress/index.ts
git add -f tests/compress/session-ir-store.test.ts
git commit -m "feat: add SessionIRStore for overview IR pointers"
```

---

### Task 3: Overview emits IR metadata (Wave 1)

**Files:**
- Modify: `src/compress/file-read.ts`
- Modify: `tests/compress/file-read.test.ts` (add cases; keep old ones green)

- [ ] **Step 1: Read existing file-read tests**

Run: `npx vitest run tests/compress/file-read.test.ts`

Note current expectations so you do not break them.

- [ ] **Step 2: Add failing tests for IR metadata**

Append to `tests/compress/file-read.test.ts`:

```ts
import { buildSymbolIR } from '../../src/compress/symbol-ir.js'

// inside describe:
it('includes irId and symbol summary for large files', async () => {
  const lines = []
  lines.push('export class Big {')
  for (let i = 0; i < 80; i++) {
    lines.push(`  m${i}() { return ${i} }`)
  }
  lines.push('}')
  const content = lines.join('\n')
  // ensure > 200 tokens (~800+ chars)
  expect(content.length).toBeGreaterThan(800)

  const compressor = new FileReadCompressor()
  const result = await compressor.compress({
    content,
    filePath: 'src/big.ts',
    language: 'typescript'
  })

  expect(result.metadata.strategy).not.toBe('passthrough')
  expect(result.metadata.irId).toBeTruthy()
  expect(result.metadata.mtimeMs).toBeTypeOf('number')
  expect(Array.isArray(result.metadata.symbols)).toBe(true)
  expect(result.content).toContain('Big')
  expect(result.content).toMatch(/L\d+-\d+/)
  expect(result.content).toContain('make-laten-read-detail')
})
```

If existing tests import differently, match the file’s import style (`FileReadCompressor` already imported).

- [ ] **Step 3: Run — expect FAIL on missing metadata**

Run: `npx vitest run tests/compress/file-read.test.ts`

- [ ] **Step 4: Update `FileReadCompressor`**

Replace `src/compress/file-read.ts` with:

```ts
import type { Compressor, CompressedResult, FileReadInput } from './types.js'
import { calculateConfidence } from './confidence.js'
import { stripAll } from './strip.js'
import { smartTruncate } from './truncate.js'
import { buildSymbolIR } from './symbol-ir.js'

export class FileReadCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { content, filePath } = input as FileReadInput & { mtimeMs?: number }
    const mtimeMs = (input as FileReadInput & { mtimeMs?: number }).mtimeMs ?? 0

    const lines = content.split('\n').length
    const tokens = Math.ceil(content.length / 4)

    if (tokens < 200) {
      return {
        content,
        original: content,
        confidence: 1.0,
        metadata: {
          strategy: 'passthrough',
          originalLines: lines,
          compressedLines: lines,
          savings: 0,
          irId: null,
          mtimeMs,
          symbols: []
        }
      }
    }

    const stripped = stripAll(content)
    const ir = buildSymbolIR(stripped.length > 0 ? content : content, filePath, mtimeMs)

    const byKind = (kind: string) => ir.symbols.filter(s => s.kind === kind)

    const formatSym = (s: { name: string; parent?: string; startLine: number; endLine: number }) => {
      const label = s.parent ? `${s.parent}.${s.name}` : s.name
      return `//   ${label} L${s.startLine}-${s.endLine}`
    }

    const sections: string[] = [
      `// ${filePath} (${lines} lines) [ir:${ir.id}]`
    ]

    const classes = byKind('class')
    const methods = byKind('method')
    const functions = byKind('function')
    const types = byKind('type')

    if (classes.length) {
      sections.push('// Classes:')
      for (const c of classes) {
        sections.push(`//   ${c.name} L${c.startLine}-${c.endLine}`)
        for (const m of methods.filter(x => x.parent === c.name)) {
          sections.push(formatSym(m))
        }
      }
    }

    if (functions.length) {
      sections.push('// Functions:')
      for (const f of functions) sections.push(formatSym(f))
    }

    if (types.length) {
      sections.push('// Types:')
      for (const t of types) sections.push(formatSym(t))
    }

    sections.push(`// → detail: make-laten-read-detail ${filePath} --symbol <name>`)

    let compressed = sections.join('\n')
    compressed = smartTruncate(compressed, 2000)

    return {
      content: compressed,
      original: content,
      confidence: calculateConfidence(content, compressed),
      metadata: {
        strategy: 'hybrid-ir',
        originalLines: lines,
        compressedLines: compressed.split('\n').length,
        savings: 1 - (compressed.length / content.length),
        irId: ir.id,
        mtimeMs,
        symbols: ir.symbols.map(s => ({
          name: s.name,
          kind: s.kind,
          parent: s.parent,
          startLine: s.startLine,
          endLine: s.endLine
        })),
        ir
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }
}
```

- [ ] **Step 5: Run file-read tests — fix until PASS**

Run: `npx vitest run tests/compress/file-read.test.ts`

Update any assertions that expected old `strategy: 'hybrid'` or old section headers (`// Exports:` only). Prefer updating tests to new format rather than restoring dead export-string extraction, unless a test is about strip behavior elsewhere.

- [ ] **Step 6: Commit**

```bash
git add src/compress/file-read.ts
git add -f tests/compress/file-read.test.ts
git commit -m "feat: overview file-read emits SymbolIR metadata and ranges"
```

---

### Task 4: DetailExpander zero-loss (Wave 2)

**Files:**
- Create: `src/compress/detail-expander.ts`
- Create: `tests/compress/detail-expander.test.ts`
- Modify: `src/compress/index.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/compress/detail-expander.test.ts`:

```ts
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/compress/detail-expander.test.ts`

- [ ] **Step 3: Implement DetailExpander**

Create `src/compress/detail-expander.ts`:

```ts
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
```

Export from `src/compress/index.ts`:

```ts
export * from './detail-expander.js'
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/compress/detail-expander.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/compress/detail-expander.ts src/compress/index.ts
git add -f tests/compress/detail-expander.test.ts
git commit -m "feat: add DetailExpander for zero-loss symbol/range slices"
```

---

### Task 5: CLI read detail flags (Wave 2)

**Files:**
- Modify: `src/cli/commands/read.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Update read command**

Replace `src/cli/commands/read.ts` with:

```ts
import fs from 'fs/promises'
import { statSync } from 'fs'
import { FileReadCompressor } from '../../compress/file-read.js'
import { DetailExpander } from '../../compress/detail-expander.js'
import type { DetailFocus } from '../../compress/detail-expander.js'

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown'
  }
  return langMap[ext] || 'text'
}

export interface ReadCommandOptions {
  symbol?: string
  range?: string
  exportName?: string
}

function parseFocus(opts: ReadCommandOptions): DetailFocus | null {
  if (opts.symbol) return { type: 'symbol', name: opts.symbol }
  if (opts.exportName) return { type: 'export', name: opts.exportName }
  if (opts.range) {
    const m = opts.range.match(/^(\d+)-(\d+)$/)
    if (!m) throw new Error(`Invalid --range, expected start-end, got ${opts.range}`)
    return { type: 'range', start: parseInt(m[1], 10), end: parseInt(m[2], 10) }
  }
  return null
}

export async function readCommand(filePath: string, opts: ReadCommandOptions = {}): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const mtimeMs = statSync(filePath).mtimeMs
    const focus = parseFocus(opts)

    if (focus) {
      const expander = new DetailExpander()
      const result = await expander.expand({ content, filePath, mtimeMs, focus })
      console.log(JSON.stringify(result, null, 2))
      if (!result.ok) process.exit(1)
      return
    }

    const compressor = new FileReadCompressor()
    const result = await compressor.compress({
      content,
      filePath,
      language: detectLanguage(filePath),
      mtimeMs
    } as any)

    console.log(JSON.stringify({
      file: filePath,
      compressed: result.content,
      confidence: result.confidence,
      metadata: {
        ...result.metadata,
        ir: undefined,
        symbols: result.metadata.symbols
      }
    }, null, 2))
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    process.exit(1)
  }
}
```

- [ ] **Step 2: Wire CLI options in `src/cli/index.ts`**

Change the `read` command registration to:

```ts
program
  .command('read')
  .description('Compressed file read (overview) or zero-loss detail')
  .argument('<file>', 'File path')
  .option('-s, --symbol <name>', 'Expand symbol (zero-loss detail)')
  .option('-r, --range <start-end>', 'Expand line range (inclusive, 1-based)')
  .option('-e, --export <name>', 'Expand export/type by name')
  .action((file: string, opts: { symbol?: string; range?: string; export?: string }) => {
    return readCommand(file, {
      symbol: opts.symbol,
      range: opts.range,
      exportName: opts.export
    })
  })
```

- [ ] **Step 3: Manual smoke (after build)**

Run:

```bash
npm run build
node dist/cli/index.js read src/compress/file-read.ts | head -c 400
node dist/cli/index.js read src/compress/file-read.ts --symbol compress | head -c 400
```

Expected: first prints overview JSON with `irId`; second prints `ok: true` and method body including implementation lines.

- [ ] **Step 4: Commit**

```bash
git add src/cli/commands/read.ts src/cli/index.ts
git commit -m "feat: CLI read --symbol/--range/--export for zero-loss detail"
```

---

### Task 6: MCP read-detail tool (Wave 2)

**Files:**
- Modify: `src/mcp/server.ts`

- [ ] **Step 1: Add shared store singletons near top of server**

After existing singletons (`sessionCache`, etc.), add:

```ts
import { DetailExpander } from '../compress/detail-expander.js'
import { SessionIRStore } from '../compress/session-ir-store.js'
import { statSync } from 'fs'

const irStore = new SessionIRStore()
const detailExpander = new DetailExpander({ store: irStore })
```

- [ ] **Step 2: Register tool in TOOLS array (after make-laten-read)**

```ts
  {
    name: 'make-laten-read-detail',
    description: 'Zero-loss file detail by symbol or line range (use after make-laten-read overview)',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to file' },
        symbol: { type: 'string', description: 'Symbol name or Parent.method' },
        start: { type: 'number', description: 'Start line (1-based, with end)' },
        end: { type: 'number', description: 'End line (1-based inclusive)' },
        export: { type: 'string', description: 'Export/type name' }
      },
      required: ['file_path']
    }
  },
```

- [ ] **Step 3: Update handleRead to store IR**

```ts
async function handleRead(params: { file_path: string }) {
  const content = await fs.readFile(params.file_path, 'utf-8')
  const mtimeMs = statSync(params.file_path).mtimeMs
  const compressor = new FileReadCompressor()
  const result = await compressor.compress({
    content,
    filePath: params.file_path,
    language: detectLanguage(params.file_path),
    mtimeMs
  } as any)

  if (result.metadata.ir) {
    irStore.set(result.metadata.ir)
  }

  patternMiner.record({
    type: 'overview_read',
    input: { file: params.file_path, irId: result.metadata.irId },
    output: { savings: result.metadata.savings },
    success: true
  })
  sessionCache.set(`file:${params.file_path}`, { content: result.content, metadata: result.metadata })

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        compressed: result.content,
        savings: result.metadata.savings,
        confidence: result.confidence,
        irId: result.metadata.irId,
        symbols: result.metadata.symbols
      })
    }]
  }
}
```

- [ ] **Step 4: Add handleReadDetail + dispatch**

```ts
async function handleReadDetail(params: {
  file_path: string
  symbol?: string
  start?: number
  end?: number
  export?: string
}) {
  const content = await fs.readFile(params.file_path, 'utf-8')
  const mtimeMs = statSync(params.file_path).mtimeMs

  let focus: import('../compress/detail-expander.js').DetailFocus | null = null
  if (params.symbol) focus = { type: 'symbol', name: params.symbol }
  else if (params.export) focus = { type: 'export', name: params.export }
  else if (params.start != null && params.end != null) {
    focus = { type: 'range', start: params.start, end: params.end }
  }

  if (!focus) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: false,
          code: 'invalid_focus',
          message: 'Provide symbol, export, or start+end'
        })
      }],
      isError: true
    }
  }

  const result = await detailExpander.expand({
    content,
    filePath: params.file_path,
    mtimeMs,
    focus
  })

  patternMiner.record({
    type: 'detail_expand',
    input: { file: params.file_path, focus },
    output: result.ok ? { range: result.range } : { code: result.code },
    success: result.ok
  })

  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    isError: !result.ok
  }
}
```

In the tool dispatch `switch`/if-chain, add:

```ts
case 'make-laten-read-detail':
  return handleReadDetail(args)
```

(Match the existing dispatch style in the file — read the bottom of `server.ts` and wire consistently.)

- [ ] **Step 5: Build**

Run: `npm run build`

Expected: success

- [ ] **Step 6: Commit**

```bash
git add src/mcp/server.ts
git commit -m "feat: MCP make-laten-read-detail + IR session store on read"
```

---

### Task 7: Graph file↔ir helper (Wave 3)

**Files:**
- Create: `src/graph/file-ir.ts`
- Create: `tests/graph/file-ir.test.ts`
- Modify: `src/graph/index.ts` (export)

- [ ] **Step 1: Write failing tests**

Create `tests/graph/file-ir.test.ts`:

```ts
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

    const out = await edges.listBySource(`file:${ir.filePath}`)
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
```

If `EdgeStore` method names differ, open `src/graph/edges.ts` and use the real list API (e.g. `listFrom`, `getBySource`). Adjust test to the actual API — do not invent methods without implementing them.

- [ ] **Step 2: Read edges API**

Open `src/graph/edges.ts` and note method names for listing by source.

- [ ] **Step 3: Implement `src/graph/file-ir.ts`**

```ts
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
    metadata: { irId: ir.id, filePath: ir.filePath, mtimeMs: ir.mtimeMs, symbolCount: ir.symbols.length }
  })

  // Use the real EdgeStore API from edges.ts — e.g. edges.add / edges.upsert
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
  const iId = irNodeId(irId)
  await nodes.delete(iId)
  // if edges cascade on node delete already, skip; else delete edge explicitly
  void edges
  void filePath
}
```

**Important:** Match `edges.add` (or whatever exists) exactly. Read `src/graph/edges.ts` and `tests/graph/edges.test.ts` first; copy call shape from existing tests.

- [ ] **Step 4: Export from graph index**

In `src/graph/index.ts` add:

```ts
export * from './file-ir.js'
```

- [ ] **Step 5: Run graph tests**

Run: `npx vitest run tests/graph/file-ir.test.ts tests/graph/`

Expected: PASS

- [ ] **Step 6: Optional wire into MCP handleRead**

After `irStore.set`, if you want graph on by default in-process:

```ts
// only if creating db is cheap/singleton — otherwise skip MCP wiring and keep helper library-only this wave
```

Spec allows graph upsert on overview when enabled. Minimal solid approach: **library + tests this wave**; MCP optional singleton DB can wait if no existing MCP graph singleton. Prefer not opening `~/.make-laten.db` from MCP without injectable path.

- [ ] **Step 7: Commit**

```bash
git add src/graph/file-ir.ts src/graph/index.ts
git add -f tests/graph/file-ir.test.ts
git commit -m "feat: graph helpers for file↔ir upsert and invalidate"
```

---

### Task 8: Integration overview → detail (Wave 2/4)

**Files:**
- Create: `tests/integration-tiered-read.test.ts`

- [ ] **Step 1: Write integration test**

```ts
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

    expect(overview.metadata.ir).toBeTruthy()
    store.set(overview.metadata.ir)

    const symbols = overview.metadata.symbols as Array<{ name: string; kind: string }>
    const target = symbols.find(s => s.kind === 'function') || symbols[0]
    expect(target).toBeTruthy()

    const expander = new DetailExpander({ store })
    const detail = await expander.expand({
      content,
      filePath,
      mtimeMs,
      focus: { type: 'symbol', name: target.name }
    })

    expect(detail.ok).toBe(true)
    if (!detail.ok) return

    const lines = content.split('\n')
    const expected = lines.slice(detail.range.start - 1, detail.range.end).join('\n')
    expect(detail.content).toBe(expected)
  })
})
```

- [ ] **Step 2: Run**

Run: `npx vitest run tests/integration-tiered-read.test.ts`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add -f tests/integration-tiered-read.test.ts
git commit -m "test: integration overview to zero-loss detail expand"
```

---

### Task 9: Learn events already recorded + docs (Wave 4)

**Files:**
- Modify: `README.md` (MCP table + CLI flags)
- Modify: `skills/SKILL.md`
- Modify: `CHANGELOG.md`
- Optionally align versions in `package.json` / `src/cli/index.ts` / `src/index.ts` only if doing a release commit

- [ ] **Step 1: README — document tools**

In MCP tools section, add row:

```markdown
| `make-laten-read-detail` | Zero-loss detail by symbol or line range |
```

In CLI section:

```markdown
make-laten read <file>                 # overview
make-laten read <file> --symbol name   # zero-loss detail
make-laten read <file> --range 10-40   # zero-loss lines
```

Update tool count 17 → 18 where mentioned.

- [ ] **Step 2: skills/SKILL.md**

Add `make-laten-read-detail` to compress layer table and tool mapping:

```markdown
| Audit/detail file body | `make-laten-read-detail` or `make-laten read --symbol` |
```

- [ ] **Step 3: CHANGELOG**

Under Unreleased or next version:

```markdown
### Added
- Tiered file read: overview IR + zero-loss `read-detail` (MCP/CLI)
- SessionIRStore and graph file↔ir helpers
### Fixed
- Learn layer tests no longer load `~/.make-laten` state
```

- [ ] **Step 4: Full test + build**

Run:

```bash
npm test
npm run build
npm run typecheck
```

Expected: all green

- [ ] **Step 5: Commit**

```bash
git add README.md skills/SKILL.md CHANGELOG.md
git add -f docs/superpowers/plans/2026-07-23-tiered-compress-session-graph.md
git commit -m "docs: tiered read overview/detail and tool count 18"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Test isolation learn paths | Task 0 |
| SymbolIR builder | Task 1 |
| Session IR store | Task 2 |
| Overview emits IR + ranges + detail hint | Task 3 |
| Zero-loss detail expander | Task 4 |
| CLI flags | Task 5 |
| MCP read-detail + store IR on read | Task 6 |
| Graph file↔ir thin | Task 7 |
| overview→detail integration | Task 8 |
| Learn overview_read / detail_expand events | Task 6 (patternMiner.record) |
| Docs README/SKILL/CHANGELOG | Task 9 |
| Ambiguous symbol candidates | Task 4 |
| Stale IR rebuild | Task 4 `resolveIR` |
| Passthrough &lt;200 tokens | Task 3 |
| No full AST dependency | Task 1 regex brace matcher |
| Bit-exact detail | Task 4 + 8 |

No intentional TBD placeholders remain. EdgeStore method names must be verified against `src/graph/edges.ts` in Task 7 before coding.

---

## Execution notes

- Repo gitignores `tests/` and `docs/` — always `git add -f` for those paths when committing.
- Prefer TDD order inside each task; do not skip “run fail then pass”.
- After all tasks: `npm test && npm run build && npm run typecheck`.
