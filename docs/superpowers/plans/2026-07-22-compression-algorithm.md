# Compression Algorithm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement hybrid compression algorithms that achieve real token savings (60-89%) for file-read, grep, git-diff, git-status, and fetch commands.

**Architecture:** Regex-based AST parsing for small/medium files, tree-sitter for large files. Strip imports, comments, blank lines. Extract only exports, class methods, function signatures. Smart truncation for oversized content.

**Tech Stack:** TypeScript, regex AST parsing, tree-sitter (optional for large files)

---

## File Structure

```
src/compress/
├── file-read.ts          # Rewrite: hybrid regex + smart truncation
├── grep.ts               # Rewrite: grouping + dedup + compact format
├── git-diff.ts           # Rewrite: stat summary + condensed hunks
├── git-status.ts         # Create: grouped by status type
├── output.ts             # Keep: JSON compression utility
├── strip.ts              # Create: noise removal (imports, comments, whitespace)
├── structure.ts          # Create: AST extraction (exports, signatures, classes)
├── truncate.ts           # Create: smart truncation with context preservation
├── types.ts              # Keep: existing types
├── confidence.ts         # Keep: existing confidence calculator
└── index.ts              # Update: export new modules

scripts/
└── benchmark.ts          # Update: test all 5 commands
```

---

## Task 1: Strip Noise Module

**Files:**
- Create: `src/compress/strip.ts`
- Test: `tests/compress/strip.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { stripImports, stripComments, stripBlankLines, stripWhitespace } from '../../src/compress/strip.js'

describe('stripImports', () => {
  it('removes single-line imports', () => {
    const input = `import fs from 'fs'\nimport path from 'path'\nconst x = 1`
    const result = stripImports(input)
    expect(result).toBe('const x = 1')
  })

  it('removes multi-line imports', () => {
    const input = `import {\n  foo,\n  bar\n} from 'module'\nconst x = 1`
    const result = stripImports(input)
    expect(result).toBe('const x = 1')
  })

  it('keeps dynamic imports', () => {
    const input = `const x = await import('module')\nconst y = 1`
    const result = stripImports(input)
    expect(result).toContain("import('module')")
  })
})

describe('stripComments', () => {
  it('removes single-line comments', () => {
    const input = `// this is a comment\nconst x = 1`
    const result = stripComments(input)
    expect(result).toBe('const x = 1')
  })

  it('removes multi-line comments', () => {
    const input = `/* comment */\nconst x = 1\n/* another */`
    const result = stripComments(input)
    expect(result).toBe('const x = 1')
  })

  it('keeps comments in strings', () => {
    const input = `const x = "// not a comment"\nconst y = 1`
    const result = stripComments(input)
    expect(result).toContain('// not a comment')
  })
})

describe('stripBlankLines', () => {
  it('removes consecutive blank lines', () => {
    const input = `line1\n\n\n\nline2`
    const result = stripBlankLines(input)
    expect(result).toBe('line1\n\nline2')
  })
})

describe('stripWhitespace', () => {
  it('removes trailing whitespace', () => {
    const input = `line1   \nline2\t`
    const result = stripWhitespace(input)
    expect(result).toBe('line1\nline2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compress/strip.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```typescript
export function stripImports(content: string): string {
  return content
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
}

export function stripComments(content: string): string {
  // Remove single-line comments (but not in strings)
  let result = content.replace(/(?<!["'`])\/\/.*$/gm, '')
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '')
  return result
}

export function stripBlankLines(content: string): string {
  return content.replace(/\n{3,}/g, '\n\n')
}

export function stripWhitespace(content: string): string {
  return content.replace(/[ \t]+$/gm, '')
}

export function stripAll(content: string): string {
  let result = content
  result = stripImports(result)
  result = stripComments(result)
  result = stripBlankLines(result)
  result = stripWhitespace(result)
  return result.trim()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compress/strip.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compress/strip.ts tests/compress/strip.test.ts
git commit -m "feat: add noise stripping module (imports, comments, whitespace)"
```

---

## Task 2: Structure Extraction Module

**Files:**
- Create: `src/compress/structure.ts`
- Test: `tests/compress/structure.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { extractExports, extractClassMethods, extractFunctionSignatures, extractTypeDefinitions } from '../../src/compress/structure.js'

describe('extractExports', () => {
  it('extracts exported functions', () => {
    const input = `export function foo() { return 1 }\nexport const bar = 2`
    const result = extractExports(input)
    expect(result).toContain('export function foo()')
    expect(result).toContain('export const bar')
  })

  it('extracts default exports', () => {
    const input = `export default class MyClass {}`
    const result = extractExports(input)
    expect(result).toContain('export default class MyClass')
  })
})

describe('extractClassMethods', () => {
  it('extracts class methods', () => {
    const input = `class Foo {\n  bar() { return 1 }\n  baz() { return 2 }\n}`
    const result = extractClassMethods(input)
    expect(result).toContain('bar()')
    expect(result).toContain('baz()')
  })

  it('removes method bodies', () => {
    const input = `class Foo {\n  bar() {\n    return 1\n  }\n}`
    const result = extractClassMethods(input)
    expect(result).toContain('bar()')
    expect(result).not.toContain('return 1')
  })
})

describe('extractFunctionSignatures', () => {
  it('extracts function signatures without bodies', () => {
    const input = `function foo(x: number, y: string): boolean {\n  return true\n}`
    const result = extractFunctionSignatures(input)
    expect(result).toContain('function foo(x: number, y: string): boolean')
    expect(result).not.toContain('return true')
  })
})

describe('extractTypeDefinitions', () => {
  it('extracts interfaces and types', () => {
    const input = `interface Foo {\n  bar: string\n}\ntype Baz = number`
    const result = extractTypeDefinitions(input)
    expect(result).toContain('interface Foo')
    expect(result).toContain('type Baz')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compress/structure.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```typescript
export function extractExports(content: string): string {
  const lines = content.split('\n')
  const exports: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^export\s+(default\s+)?/.test(trimmed)) {
      // Keep export line, remove body if multi-line
      if (trimmed.includes('{') && !trimmed.includes('}')) {
        exports.push(trimmed.replace(/\{[\s\S]*$/, '{ ... }'))
      } else {
        exports.push(trimmed)
      }
    }
  }

  return exports.join('\n')
}

export function extractClassMethods(content: string): string {
  const classRegex = /class\s+\w+[^{]*\{([\s\S]*?)\n\}/g
  const methods: string[] = []

  let match
  while ((match = classRegex.exec(content)) !== null) {
    const classBody = match[1]
    const methodRegex = /(^\s*(?:public|private|protected|static|async|abstract|\s)*\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?)\s*\{/gm

    let methodMatch
    while ((methodMatch = methodRegex.exec(classBody)) !== null) {
      methods.push(methodMatch[1].trim())
    }
  }

  return methods.join('\n')
}

export function extractFunctionSignatures(content: string): string {
  const funcRegex = /(export\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{/g
  const signatures: string[] = []

  let match
  while ((match = funcRegex.exec(content)) !== null) {
    signatures.push(match[0].replace(/\{$/, ''))
  }

  return signatures.join('\n')
}

export function extractTypeDefinitions(content: string): string {
  const typeRegex = /(export\s+)?(interface|type)\s+\w+[^{]*\{[^}]*\}|(export\s+)?type\s+\w+\s*=[^;]+;/g
  const types: string[] = []

  let match
  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[0].trim())
  }

  return types.join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compress/structure.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compress/structure.ts tests/compress/structure.test.ts
git commit -m "feat: add structure extraction module (exports, classes, types)"
```

---

## Task3: Smart Truncation Module

**Files:**
- Create: `src/compress/truncate.ts`
- Test: `tests/compress/truncate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { smartTruncate, truncateByTokens, preserveContext } from '../../src/compress/truncate.js'

describe('smartTruncate', () => {
  it('keeps header and exports', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`)
    const result = smartTruncate(lines.join('\n'), 20)
    expect(result).toContain('line 0')
    expect(result).toContain('[80 lines omitted]')
  })
})

describe('truncateByTokens', () => {
  it('truncates to approximate token count', () => {
    const text = 'a'.repeat(1000)
    const result = truncateByTokens(text, 100)
    expect(result.length).toBeLessThanOrEqual(450)
  })
})

describe('preserveContext', () => {
  it('preserves surrounding lines', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`)
    const result = preserveContext(lines, 10, 5, 5)
    expect(result.length).toBeLessThanOrEqual(12)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compress/truncate.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```typescript
export function smartTruncate(content: string, maxTokens: number): string {
  const lines = content.split('\n')
  const estimatedTokens = Math.ceil(content.length / 4)

  if (estimatedTokens <= maxTokens) return content

  const targetLines = Math.round(maxTokens * 4 / (content.length / lines.length))
  const headerLines = Math.floor(targetLines * 0.3)
  const footerLines = Math.floor(targetLines * 0.3)
  const omitted = lines.length - headerLines - footerLines

  const header = lines.slice(0, headerLines)
  const footer = lines.slice(-footerLines)

  return [...header, `\n... [${omitted} lines omitted] ...\n`, ...footer].join('\n')
}

export function truncateByTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text

  const truncated = text.slice(0, maxChars)
  const lastNewline = truncated.lastIndexOf('\n')

  return truncated.slice(0, lastNewline > 0 ? lastNewline : maxChars) + '\n\n... (truncated)'
}

export function preserveContext(lines: string[], targetIndex: number, before: number, after: number): string[] {
  const start = Math.max(0, targetIndex - before)
  const end = Math.min(lines.length, targetIndex + after + 1)
  return lines.slice(start, end)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compress/truncate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compress/truncate.ts tests/compress/truncate.test.ts
git commit -m "feat: add smart truncation module"
```

---

## Task 4: Rewrite File Read Compressor

**Files:**
- Modify: `src/compress/file-read.ts`
- Test: `tests/compress/file-read.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { FileReadCompressor } from '../../src/compress/file-read.js'

describe('FileReadCompressor', () => {
  it('achieves 80%+ savings on typical TypeScript file', async () => {
    const content = `
import fs from 'fs'
import path from 'path'
import { foo } from './foo'

// This is a comment
/**
 * Multi-line comment
 */
export function processData(data: string[]): Result[] {
  // Process each item
  const results: Result[] = []
  for (const item of data) {
    // Validate input
    if (!item) continue
    
    // Transform data
    const transformed = item.trim().toLowerCase()
    results.push({ value: transformed, valid: true })
  }
  return results
}

export class DataProcessor {
  private cache: Map<string, any> = new Map()
  
  async process(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }
    const result = await fetchData(key)
    this.cache.set(key, result)
    return result
  }
}

interface Result {
  value: string
  valid: boolean
}
`
    const compressor = new FileReadCompressor()
    const result = await compressor.compress({ content, filePath: 'test.ts', language: 'typescript' })
    
    const savings = 1 - (result.content.length / content.length)
    expect(savings).toBeGreaterThan(0.8)
  })

  it('preserves exports', async () => {
    const content = `export function foo() { return 1 }\nexport const bar = 2`
    const compressor = new FileReadCompressor()
    const result = await compressor.compress({ content, filePath: 'test.ts', language: 'typescript' })
    
    expect(result.content).toContain('export function foo')
    expect(result.content).toContain('export const bar')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compress/file-read.test.ts`
Expected: FAIL (savings < 0.8)

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Compressor, CompressedResult, FileReadInput } from './types.js'
import { calculateConfidence } from './confidence.js'
import { stripAll } from './strip.js'
import { extractExports, extractClassMethods, extractFunctionSignatures, extractTypeDefinitions } from './structure.js'
import { smartTruncate } from './truncate.js'

export class FileReadCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { content, filePath, language } = input as FileReadInput
    
    // Step 1: Strip noise
    const stripped = stripAll(content)
    
    // Step 2: Extract structure
    const exports = extractExports(stripped)
    const classes = extractClassMethods(stripped)
    const functions = extractFunctionSignatures(stripped)
    const types = extractTypeDefinitions(stripped)
    
    // Step 3: Build compressed output
    const lines = [
      `// ${filePath} (${content.split('\n').length} lines)`,
      '',
      '// Exports:',
      exports,
      '',
      '// Classes:',
      classes,
      '',
      '// Functions:',
      functions,
      '',
      '// Types:',
      types
    ].filter(l => l !== '' && !l.startsWith('// :'))
    
    let compressed = lines.join('\n')
    
    // Step 4: Smart truncation if needed
    const maxTokens = 2000
    compressed = smartTruncate(compressed, maxTokens)
    
    return {
      content: compressed,
      original: content,
      confidence: calculateConfidence(content, compressed),
      metadata: {
        strategy: 'hybrid',
        originalLines: content.split('\n').length,
        compressedLines: compressed.split('\n').length,
        savings: 1 - (compressed.length / content.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compress/file-read.test.ts`
Expected: PASS

- [ ] **Step5: Commit**

```bash
git add src/compress/file-read.ts tests/compress/file-read.test.ts
git commit -m "feat: rewrite file-read compressor with hybrid algorithm"
```

---

## Task 5: Rewrite Git Diff Compressor

**Files:**
- Modify: `src/compress/git-diff.ts`
- Test: `tests/compress/git-diff.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { GitDiffCompressor } from '../../src/compress/git-diff.js'

describe('GitDiffCompressor', () => {
  it('achieves 50%+ savings on typical diff', async () => {
    const diff = `diff --git a/src/index.ts b/src/index.ts
index 1234567..abcdefg 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,10 +1,15 @@
 import fs from 'fs'
+import path from 'path'
 
 export function foo() {
-  return 1
+  return 2
 }
 
+export function bar() {
+  return 3
+}
+
 export class MyClass {
   method() {
     return 'hello'
   }
 }`
    const compressor = new GitDiffCompressor()
    const result = await compressor.compress({ diff })
    
    const savings = 1 - (result.content.length / diff.length)
    expect(savings).toBeGreaterThan(0.5)
  })

  it('shows file stats', async () => {
    const diff = `diff --git a/test.ts b/test.ts\n+line1\n-line2`
    const compressor = new GitDiffCompressor()
    const result = await compressor.compress({ diff })
    
    expect(result.content).toContain('+1')
    expect(result.content).toContain('-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compress/git-diff.test.ts`
Expected: FAIL (savings < 0.5)

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Compressor, CompressedResult, GitDiffInput } from './types.js'
import { calculateConfidence } from './confidence.js'

export class GitDiffCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { diff } = input as GitDiffInput
    
    // Parse diff
    const files = this.parseDiff(diff)
    
    // Build compressed output
    const lines: string[] = []
    
    // Summary first
    const totalAdd = files.reduce((s, f) => s + f.additions, 0)
    const totalDel = files.reduce((s, f) => s + f.deletions, 0)
    lines.push(`# ${files.length} files changed: +${totalAdd} -${totalDel}`)
    lines.push('')
    
    // Per file
    for (const file of files) {
      lines.push(`${file.path} (+${file.additions} -${file.deletions})`)
      
      // Only show changed lines
      const changes = file.lines
        .filter(l => l.type === 'add' || l.type === 'del')
        .map(l => `${l.type === 'add' ? '+' : '-'}${l.content}`)
      
      // Limit to 20 lines per file
      const limited = changes.slice(0, 20)
      lines.push(...limited)
      
      if (changes.length > 20) {
        lines.push(`... [${changes.length - 20} more changes]`)
      }
      
      lines.push('')
    }
    
    const compressed = lines.join('\n')
    
    return {
      content: compressed,
      original: diff,
      confidence: calculateConfidence(diff, compressed),
      metadata: {
        strategy: 'condensed',
        filesChanged: files.length,
        savings: 1 - (compressed.length / diff.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }

  private parseDiff(diff: string): FileDiff[] {
    const files: FileDiff[] = []
    const lines = diff.split('\n')
    
    let current: FileDiff | null = null
    
    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (current) files.push(current)
        const match = line.match(/b\/(.+)/)
        current = {
          path: match?.[1] || 'unknown',
          additions: 0,
          deletions: 0,
          lines: []
        }
      } else if (current) {
        if (line.startsWith('+')) {
          current.additions++
          current.lines.push({ type: 'add', content: line.slice(1) })
        } else if (line.startsWith('-')) {
          current.deletions++
          current.lines.push({ type: 'del', content: line.slice(1) })
        }
      }
    }
    
    if (current) files.push(current)
    return files
  }
}

interface FileDiff {
  path: string
  additions: number
  deletions: number
  lines: { type: string; content: string }[]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compress/git-diff.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compress/git-diff.ts tests/compress/git-diff.test.ts
git commit -m "feat: rewrite git-diff compressor with stat summary"
```

---

## Task 6: Create Git Status Compressor

**Files:**
- Create: `src/compress/git-status.ts`
- Test: `tests/compress/git-status.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { GitStatusCompressor } from '../../src/compress/git-status.js'

describe('GitStatusCompressor', () => {
  it('groups files by status', async () => {
    const status = `M src/index.ts\nM src/foo.ts\nA new-file.ts\nD old-file.ts\n?? untracked.ts`
    const compressor = new GitStatusCompressor()
    const result = await compressor.compress({ status })
    
    expect(result.content).toContain('Modified (2)')
    expect(result.content).toContain('Added (1)')
    expect(result.content).toContain('Deleted (1)')
    expect(result.content).toContain('Untracked (1)')
  })

  it('compresses path prefixes', async () => {
    const status = `M src/components/Button.tsx\nM src/components/Input.tsx\nM src/components/Modal.tsx`
    const compressor = new GitStatusCompressor()
    const result = await compressor.compress({ status })
    
    expect(result.content).toContain('src/components/')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/compress/git-status.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Compressor, CompressedResult } from './types.js'
import { calculateConfidence } from './confidence.js'

export class GitStatusCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { status } = input as { status: string }
    
    const files = this.parseStatus(status)
    const grouped = this.groupByStatus(files)
    
    const lines: string[] = []
    
    for (const [statusType, statusFiles] of grouped) {
      const label = thisStatusLabel(statusType)
      lines.push(`${label} (${statusFiles.length})`)
      
      // Compress common prefixes
      const compressed = this.compressPaths(statusFiles.map(f => f.path))
      lines.push(...compressed)
      lines.push('')
    }
    
    const compressed = lines.join('\n')
    
    return {
      content: compressed,
      original: status,
      confidence: calculateConfidence(status, compressed),
      metadata: {
        strategy: 'grouped',
        totalFiles: files.length,
        savings: 1 - (compressed.length / status.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }

  private parseStatus(status: string): { status: string; path: string }[] {
    return status.split('\n')
      .filter(Boolean)
      .map(line => ({
        status: line[0],
        path: line.slice(3)
      }))
  }

  private groupByStatus(files: { status: string; path: string }[]): Map<string, { status: string; path: string }[]> {
    const grouped = new Map<string, { status: string; path: string }[]>()
    
    for (const file of files) {
      const existing = grouped.get(file.status) || []
      existing.push(file)
      grouped.set(file.status, existing)
    }
    
    return grouped
  }

  private statusLabel(status: string): string {
    const labels: Record<string, string> = {
      'M': 'Modified',
      'A': 'Added',
      'D': 'Deleted',
      '??': 'Untracked',
      'R': 'Renamed'
    }
    return labels[status] || `Status ${status}`
  }

  private compressPaths(paths: string[]): string[] {
    if (paths.length <= 3) return paths.map(p => `  ${p}`)
    
    // Find common prefix
    const parts = paths.map(p => p.split('/'))
    const minLength = Math.min(...parts.map(p => p.length))
    
    let commonIndex = 0
    for (let i = 0; i < minLength; i++) {
      if (parts.every(p => p[i] === parts[0][i])) {
        commonIndex = i
      } else {
        break
      }
    }
    
    if (commonIndex > 0) {
      const prefix = parts[0].slice(0, commonIndex).join('/')
      const suffixes = paths.map(p => p.slice(prefix.length + 1))
      return [`  ${prefix}/`, ...suffixes.map(s => `    ${s}`)]
    }
    
    return paths.map(p => `  ${p}`)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/compress/git-status.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compress/git-status.ts tests/compress/git-status.test.ts
git commit -m "feat: add git-status compressor with grouping"
```

---

## Task 7: Update Index and MCP Server

**Files:**
- Modify: `src/compress/index.ts`
- Modify: `src/mcp/server.ts`

- [ ] **Step 1: Update index.ts exports**

```typescript
export * from './types.js'
export * from './confidence.js'
export * from './strip.js'
export * from './structure.js'
export * from './truncate.js'
export * from './file-read.js'
export * from './git-diff.js'
export * from './git-status.js'
export * from './grep.js'
export * from './output.js'
```

- [ ] **Step 2: Update MCP server to use new compressors**

```typescript
// Add import for git-status
import { GitStatusCompressor } from '../compress/git-status.js'

// Update handleGitStatus
async function handleGitStatus() {
  const { stdout } = await execAsync('git status --porcelain')
  const compressor = new GitStatusCompressor()
  const result = await compressor.compress({ status: stdout })
  return { content: [{ type: 'text', text: JSON.stringify({ compressed: result.content, savings: result.metadata.savings }) }] }
}
```

- [ ] **Step 3: Update tool descriptions**

```typescript
{
  name: 'make-laten-read',
  description: 'Read and compress a file (80-90% token savings)',
  // ...
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/compress/index.ts src/mcp/server.ts
git commit -m "feat: integrate new compressors into MCP server"
```

---

## Task 8: Update Benchmark Script

**Files:**
- Modify: `scripts/benchmark.ts`

- [ ] **Step 1: Update benchmark to test all 5 commands**

```typescript
// Add git-status test
try {
  const status = execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8' }).trim()
  if (status) {
    const raw = countTokens(status)
    // ... test git-status compression
  }
} catch {}
```

- [ ] **Step 2: Run benchmark**

Run: `npx tsx scripts/benchmark.ts`
Expected: All commands show 50%+ savings

- [ ] **Step 3: Commit**

```bash
git add scripts/benchmark.ts
git commit -m "feat: update benchmark for all 5 commands"
```

---

## Task 9: Build and Publish

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Update README claims**

Update compression claims to match real benchmarks.

- [ ] **Step 4: Commit and publish**

```bash
git add -A
git commit -m "feat: implement hybrid compression algorithms (60-89% savings)"
npm version minor
npm publish
```
