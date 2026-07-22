# make-laten Phase 3: Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Intelligence Layer with pattern mining, failure learning, auto-correction, semantic cache (L3), and output compressors.

**Architecture:** Learn Layer mines patterns from successful operations and learns from failures. Auto-Correction Engine detects and fixes errors automatically. L3 Cache provides semantic caching with embeddings. Output compressors optimize final output for token savings.

**Tech Stack:** TypeScript, SQLite (better-sqlite3), Vitest, tsup, Node.js 22+

---

## File Structure

```
make-laten/
├── src/
│   ├── learn/
│   │   ├── index.ts                # Learn module exports
│   │   ├── pattern-miner.ts        # Pattern mining from successful ops
│   │   ├── failure-learner.ts      # Learn from failures
│   │   └── types.ts                # Learn types
│   ├── correct/
│   │   ├── index.ts                # Correct module exports
│   │   ├── auto-correct.ts         # Auto-correction engine
│   │   └── types.ts                # Correction types
│   ├── cache/
│   │   ├── l3-semantic.ts          # Semantic cache with embeddings
│   │   └── index.ts                # Updated exports
│   ├── compress/
│   │   ├── output.ts               # Output compressors
│   │   └── index.ts                # Updated exports
│   └── index.ts                    # Main exports (updated)
├── tests/
│   ├── learn/
│   │   ├── pattern-miner.test.ts
│   │   └── failure-learner.test.ts
│   ├── correct/
│   │   └── auto-correct.test.ts
│   ├── cache/
│   │   └── l3-semantic.test.ts
│   ├── compress/
│   │   └── output.test.ts
│   └── integration-phase3.test.ts
```

---

## Task 1: Learn Types

**Files:**
- Create: `src/learn/types.ts`
- Test: `tests/learn/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import type { Pattern, Failure, LearnContext } from '../../src/learn/types.js'

describe('Learn Types', () => {
  it('should define Pattern type', () => {
    const pattern: Pattern = {
      id: 'p1',
      type: 'file-read',
      pattern: 'large files compress better',
      confidence: 0.8,
      count: 10
    }
    expect(pattern.type).toBe('file-read')
  })

  it('should define Failure type', () => {
    const failure: Failure = {
      id: 'f1',
      type: 'compress',
      error: 'File not found',
      context: { filePath: '/missing.ts' },
      timestamp: Date.now()
    }
    expect(failure.type).toBe('compress')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/learn/types.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export type PatternType = 'file-read' | 'grep' | 'git-diff' | 'cache' | 'route'

export interface Pattern {
  id: string
  type: PatternType
  pattern: string
  confidence: number
  count: number
  metadata?: Record<string, any>
}

export interface Failure {
  id: string
  type: string
  error: string
  context?: Record<string, any>
  timestamp: number
}

export interface LearnContext {
  patterns: Pattern[]
  failures: Failure[]
  lastUpdated: number
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/learn/types.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/learn/types.ts tests/learn/types.test.ts
git commit -m "feat: learn types for pattern and failure tracking"
```

---

## Task 2: Pattern Miner

**Files:**
- Create: `src/learn/pattern-miner.ts`
- Test: `tests/learn/pattern-miner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PatternMiner } from '../../src/learn/pattern-miner.js'

describe('PatternMiner', () => {
  let miner: PatternMiner

  beforeEach(() => {
    miner = new PatternMiner()
  })

  it('should record operations', () => {
    miner.record({
      type: 'file-read',
      input: { filePath: 'src/main.ts' },
      output: { compressed: true, savings: 0.5 },
      success: true
    })

    const patterns = miner.getPatterns()
    expect(patterns.length).toBe(1)
    expect(patterns[0].type).toBe('file-read')
  })

  it('should mine patterns from repeated operations', () => {
    // Record similar operations
    for (let i = 0; i < 5; i++) {
      miner.record({
        type: 'file-read',
        input: { filePath: `src/file${i}.ts` },
        output: { compressed: true, savings: 0.5 },
        success: true
      })
    }

    const patterns = miner.getPatterns()
    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].count).toBe(5)
  })

  it('should not record failed operations', () => {
    miner.record({
      type: 'file-read',
      input: { filePath: 'missing.ts' },
      error: 'File not found',
      success: false
    })

    const patterns = miner.getPatterns()
    expect(patterns.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/learn/pattern-miner.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Pattern, PatternType } from './types.js'

interface Operation {
  type: string
  input: any
  output?: any
  error?: string
  success: boolean
}

export class PatternMiner {
  private operations: Operation[] = []
  private patterns: Map<string, Pattern> = new Map()

  record(operation: Operation): void {
    this.operations.push(operation)
    
    if (operation.success) {
      this.updatePatterns(operation)
    }
  }

  getPatterns(): Pattern[] {
    return Array.from(this.patterns.values())
  }

  getPatternsByType(type: PatternType): Pattern[] {
    return this.getPatterns().filter(p => p.type === type)
  }

  private updatePatterns(operation: Operation): void {
    const key = `${operation.type}:${this.hashInput(operation.input)}`
    const existing = this.patterns.get(key)
    
    if (existing) {
      existing.count++
      existing.confidence = Math.min(0.99, existing.confidence + 0.05)
    } else {
      this.patterns.set(key, {
        id: `p${this.patterns.size + 1}`,
        type: operation.type as PatternType,
        pattern: JSON.stringify(operation.input),
        confidence: 0.5,
        count: 1
      })
    }
  }

  private hashInput(input: any): string {
    return JSON.stringify(input).slice(0, 50)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/learn/pattern-miner.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/learn/pattern-miner.ts tests/learn/pattern-miner.test.ts
git commit -m "feat: pattern miner with operation tracking"
```

---

## Task 3: Failure Learner

**Files:**
- Create: `src/learn/failure-learner.ts`
- Test: `tests/learn/failure-learner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { FailureLearner } from '../../src/learn/failure-learner.js'

describe('FailureLearner', () => {
  let learner: FailureLearner

  beforeEach(() => {
    learner = new FailureLearner()
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
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/learn/failure-learner.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Failure } from './types.js'

interface FailureRecord extends Failure {
  count: number
}

export class FailureLearner {
  private failures: Map<string, FailureRecord> = new Map()

  record(failure: Omit<Failure, 'id' | 'timestamp'>): void {
    const key = `${failure.type}:${failure.error}`
    const existing = this.failures.get(key)
    
    if (existing) {
      existing.count++
    } else {
      this.failures.set(key, {
        id: `f${this.failures.size + 1}`,
        ...failure,
        timestamp: Date.now(),
        count: 1
      })
    }
  }

  getFailures(): Failure[] {
    return Array.from(this.failures.values())
  }

  getFailuresByType(type: string): Failure[] {
    return this.getFailures().filter(f => f.type === type)
  }

  getSuggestions(type: string): string[] {
    const failures = this.getFailuresByType(type)
    const suggestions: string[] = []
    
    for (const failure of failures) {
      if (failure.error.includes('not found')) {
        suggestions.push('check if file exists before processing')
      }
      if (failure.error.includes('permission')) {
        suggestions.push('verify file permissions')
      }
      if (failure.count > 2) {
        suggestions.push(`recurring issue: ${failure.error}`)
      }
    }
    
    return [...new Set(suggestions)]
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/learn/failure-learner.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/learn/failure-learner.ts tests/learn/failure-learner.test.ts
git commit -m "feat: failure learner with recovery suggestions"
```

---

## Task 4: Learn Module Index

**Files:**
- Create: `src/learn/index.ts`
- Test: `tests/learn/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { createLearner } from '../../src/learn/index.js'

describe('Learn Module Index', () => {
  it('should create a learner with miner and failure tracker', () => {
    const learner = createLearner()
    expect(learner.patterns).toBeDefined()
    expect(learner.failures).toBeDefined()
  })

  it('should record and learn from operations', () => {
    const learner = createLearner()
    
    learner.record({
      type: 'file-read',
      input: { filePath: 'test.ts' },
      output: { compressed: true },
      success: true
    })
    
    expect(learner.patterns.getPatterns().length).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/learn/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
import { PatternMiner } from './pattern-miner.js'
import { FailureLearner } from './failure-learner.js'

export function createLearner() {
  const patterns = new PatternMiner()
  const failures = new FailureLearner()

  return {
    patterns,
    failures,
    record: (op: any) => {
      patterns.record(op)
      if (!op.success) {
        failures.record({
          type: op.type,
          error: op.error || 'Unknown error',
          context: op.input
        })
      }
    }
  }
}

export { PatternMiner } from './pattern-miner.js'
export { FailureLearner } from './failure-learner.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/learn/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/learn/index.ts tests/learn/index.test.ts
git commit -m "feat: learn module with pattern mining and failure tracking"
```

---

## Task 5: Correction Types

**Files:**
- Create: `src/correct/types.ts`
- Test: `tests/correct/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import type { Correction, CorrectionRule } from '../../src/correct/types.js'

describe('Correction Types', () => {
  it('should define Correction type', () => {
    const correction: Correction = {
      id: 'c1',
      original: 'old content',
      corrected: 'new content',
      rule: 'fix-import',
      confidence: 0.9
    }
    expect(correction.rule).toBe('fix-import')
  })

  it('should define CorrectionRule type', () => {
    const rule: CorrectionRule = {
      name: 'fix-import',
      description: 'Fix missing imports',
      pattern: /import.*from/g,
      replacement: 'import { x } from'
    }
    expect(rule.name).toBe('fix-import')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/correct/types.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export interface Correction {
  id: string
  original: string
  corrected: string
  rule: string
  confidence: number
  metadata?: Record<string, any>
}

export interface CorrectionRule {
  name: string
  description: string
  pattern: RegExp | string
  replacement: string
  validate?: (input: string) => boolean
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/correct/types.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/correct/types.ts tests/correct/types.test.ts
git commit -m "feat: correction types for auto-correction engine"
```

---

## Task 6: Auto-Correction Engine

**Files:**
- Create: `src/correct/auto-correct.ts`
- Test: `tests/correct/auto-correct.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { AutoCorrect } from '../../src/correct/auto-correct.js'

describe('AutoCorrect', () => {
  let engine: AutoCorrect

  beforeEach(() => {
    engine = new AutoCorrect()
  })

  it('should add correction rules', () => {
    engine.addRule({
      name: 'fix-typo',
      description: 'Fix common typos',
      pattern: 'teh',
      replacement: 'the'
    })

    expect(engine.getRules().length).toBe(1)
  })

  it('should apply corrections', () => {
    engine.addRule({
      name: 'fix-typo',
      description: 'Fix common typos',
      pattern: 'teh',
      replacement: 'the'
    })

    const result = engine.correct('teh quick brown fox')
    expect(result).toBe('the quick brown fox')
  })

  it('should handle regex patterns', () => {
    engine.addRule({
      name: 'fix-imports',
      description: 'Fix import statements',
      pattern: /import\s+\w+\s+from/g,
      replacement: 'import { x } from'
    })

    const result = engine.correct('import foo from')
    expect(result).toBe('import { x } from')
  })

  it('should track corrections', () => {
    engine.addRule({
      name: 'fix-typo',
      description: 'Fix common typos',
      pattern: 'teh',
      replacement: 'the'
    })

    engine.correct('teh test')
    engine.correct('teh again')

    const stats = engine.getStats()
    expect(stats.applied).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/correct/auto-correct.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Correction, CorrectionRule } from './types.js'

export class AutoCorrect {
  private rules: CorrectionRule[] = []
  private corrections: Correction[] = []
  private appliedCount = 0

  addRule(rule: CorrectionRule): void {
    this.rules.push(rule)
  }

  getRules(): CorrectionRule[] {
    return this.rules
  }

  correct(input: string): string {
    let output = input

    for (const rule of this.rules) {
      if (typeof rule.pattern === 'string') {
        if (output.includes(rule.pattern)) {
          output = output.split(rule.pattern).join(rule.replacement)
          this.recordCorrection(input, output, rule.name)
        }
      } else {
        const matches = output.match(rule.pattern)
        if (matches) {
          output = output.replace(rule.pattern, rule.replacement)
          this.recordCorrection(input, output, rule.name)
        }
      }
    }

    return output
  }

  getStats(): { applied: number; corrections: Correction[] } {
    return {
      applied: this.appliedCount,
      corrections: this.corrections
    }
  }

  private recordCorrection(original: string, corrected: string, ruleName: string): void {
    this.appliedCount++
    this.corrections.push({
      id: `c${this.corrections.length + 1}`,
      original,
      corrected,
      rule: ruleName,
      confidence: 0.9
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/correct/auto-correct.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/correct/auto-correct.ts tests/correct/auto-correct.test.ts
git commit -m "feat: auto-correction engine with regex and string rules"
```

---

## Task 7: Correct Module Index

**Files:**
- Create: `src/correct/index.ts`
- Test: `tests/correct/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { createCorrector } from '../../src/correct/index.js'

describe('Correct Module Index', () => {
  it('should create a corrector with default rules', () => {
    const corrector = createCorrector()
    expect(corrector.engine).toBeDefined()
    expect(corrector.rules).toBeDefined()
  })

  it('should apply corrections via correct function', () => {
    const corrector = createCorrector()
    
    const result = corrector.correct('teh test')
    expect(result).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/correct/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
import { AutoCorrect } from './auto-correct.js'
import type { CorrectionRule } from './types.js'

const defaultRules: CorrectionRule[] = [
  {
    name: 'fix-typo-teh',
    description: 'Fix "teh" typo',
    pattern: 'teh',
    replacement: 'the'
  },
  {
    name: 'fix-typo-recieve',
    description: 'Fix "recieve" typo',
    pattern: 'recieve',
    replacement: 'receive'
  }
]

export function createCorrector(rules: CorrectionRule[] = defaultRules) {
  const engine = new AutoCorrect()
  
  for (const rule of rules) {
    engine.addRule(rule)
  }

  return {
    engine,
    rules: engine.getRules(),
    correct: (input: string) => engine.correct(input)
  }
}

export { AutoCorrect } from './auto-correct.js'
export type { Correction, CorrectionRule } from './types.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/correct/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/correct/index.ts tests/correct/index.test.ts
git commit -m "feat: correct module with default correction rules"
```

---

## Task 8: Semantic Cache Types

**Files:**
- Modify: `src/cache/types.ts` (or create if not exists)

- [ ] **Step 1: Create cache types**

```typescript
export interface SemanticCacheEntry {
  id: string
  content: string
  embedding: number[]
  metadata: Record<string, any>
  createdAt: number
}

export interface SemanticSearchResult {
  entry: SemanticCacheEntry
  similarity: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/cache/types.ts
git commit -m "feat: semantic cache types for L3 cache"
```

---

## Task 9: Semantic Cache

**Files:**
- Create: `src/cache/l3-semantic.ts`
- Test: `tests/cache/l3-semantic.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SemanticCache } from '../../src/cache/l3-semantic.js'

describe('SemanticCache', () => {
  let cache: SemanticCache

  beforeEach(() => {
    cache = new SemanticCache()
  })

  it('should store entries with embeddings', () => {
    cache.set('key1', {
      content: 'test content',
      embedding: [0.1, 0.2, 0.3],
      metadata: {}
    })

    const entry = cache.get('key1')
    expect(entry).not.toBeNull()
    expect(entry!.content).toBe('test content')
  })

  it('should search by similarity', () => {
    cache.set('key1', {
      content: 'file read compressor',
      embedding: [0.1, 0.2, 0.3],
      metadata: {}
    })

    cache.set('key2', {
      content: 'grep results compressor',
      embedding: [0.4, 0.5, 0.6],
      metadata: {}
    })

    const results = cache.search([0.1, 0.2, 0.3], 0.8)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].entry.content).toBe('file read compressor')
  })

  it('should respect similarity threshold', () => {
    cache.set('key1', {
      content: 'completely different',
      embedding: [0.9, 0.8, 0.7],
      metadata: {}
    })

    const results = cache.search([0.1, 0.2, 0.3], 0.9)
    expect(results.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/cache/l3-semantic.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { SemanticCacheEntry, SemanticSearchResult } from './types.js'

export class SemanticCache {
  private store: Map<string, SemanticCacheEntry> = new Map()

  set(key: string, entry: Omit<SemanticCacheEntry, 'id' | 'createdAt'>): void {
    this.store.set(key, {
      id: key,
      ...entry,
      createdAt: Date.now()
    })
  }

  get(key: string): SemanticCacheEntry | null {
    return this.store.get(key) || null
  }

  delete(key: string): boolean {
    return this.store.delete(key)
  }

  search(queryEmbedding: number[], threshold: number = 0.8): SemanticSearchResult[] {
    const results: SemanticSearchResult[] = []

    for (const entry of this.store.values()) {
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding)
      if (similarity >= threshold) {
        results.push({ entry, similarity })
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/cache/l3-semantic.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/cache/l3-semantic.ts tests/cache/l3-semantic.test.ts
git commit -m "feat: L3 semantic cache with cosine similarity search"
```

---

## Task 10: Update Cache Module

**Files:**
- Modify: `src/cache/index.ts`

- [ ] **Step 1: Update cache exports**

```typescript
export { SessionCache, type CacheEntry, type CacheStats } from './l1-session.js'
export { CrossSessionCache } from './l2-cross.js'
export { SemanticCache } from './l3-semantic.js'
export { makeLatenCache } from './index.js'
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/cache/index.ts
git commit -m "feat: update cache exports with L3 semantic cache"
```

---

## Task 11: Output Compressors

**Files:**
- Create: `src/compress/output.ts`
- Test: `tests/compress/output.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { OutputCompressor } from '../../src/compress/output.js'

describe('OutputCompressor', () => {
  const compressor = new OutputCompressor()

  it('should truncate long output', () => {
    const long = 'x'.repeat(10000)
    const result = compressor.compress(long, { maxTokens: 100 })
    expect(result.length).toBeLessThan(10000)
    expect(result).toContain('...')
  })

  it('should preserve important sections', () => {
    const content = `
# Header
Important content here
## Section
More details
    `.trim()

    const result = compressor.compress(content, { 
      maxTokens: 50,
      preserveSections: true 
    })
    expect(result).toContain('Header')
  })

  it('should respect token budget', () => {
    const content = 'word '.repeat(500)
    const result = compressor.compress(content, { maxTokens: 100 })
    expect(result.split(' ').length).toBeLessThan(500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/compress/output.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
interface OutputOptions {
  maxTokens?: number
  preserveSections?: boolean
  prioritize?: ('headers' | 'code' | 'errors')[]
}

export class OutputCompressor {
  compress(content: string, options: OutputOptions = {}): string {
    const { maxTokens = 1000, preserveSections = false } = options
    const estimatedTokens = this.estimateTokens(content)

    if (estimatedTokens <= maxTokens) {
      return content
    }

    if (preserveSections) {
      return this.compressWithSections(content, maxTokens)
    }

    return this.truncate(content, maxTokens)
  }

  private truncate(content: string, maxTokens: number): string {
    const lines = content.split('\n')
    const result: string[] = []
    let tokenCount = 0

    for (const line of lines) {
      const lineTokens = this.estimateTokens(line)
      if (tokenCount + lineTokens > maxTokens) {
        result.push('... (truncated)')
        break
      }
      result.push(line)
      tokenCount += lineTokens
    }

    return result.join('\n')
  }

  private compressWithSections(content: string, maxTokens: number): string {
    const sections = content.split(/^(#{1,3}\s.+)$/m)
    const result: string[] = []
    let tokenCount = 0

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const sectionTokens = this.estimateTokens(section)

      if (tokenCount + sectionTokens > maxTokens) {
        if (section.startsWith('#')) {
          result.push(section)
          tokenCount += sectionTokens
        }
      } else {
        result.push(section)
        tokenCount += sectionTokens
      }
    }

    return result.join('')
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/compress/output.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/compress/output.ts tests/compress/output.test.ts
git commit -m "feat: output compressor with truncation and section preservation"
```

---

## Task 12: Update Compress Module

**Files:**
- Modify: `src/compress/index.ts`

- [ ] **Step 1: Update compress exports**

```typescript
export { FileReadCompressor } from './file-read.js'
export { GrepCompressor } from './grep.js'
export { GitDiffCompressor } from './git-diff.js'
export { OutputCompressor } from './output.js'
export { calculateConfidence } from './confidence.js'
export type { Compressor, CompressedResult, FileReadInput, GrepInput, GitDiffInput } from './types.js'
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/compress/index.ts
git commit -m "feat: update compress exports with output compressor"
```

---

## Task 13: Update Main Index

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update main exports**

```typescript
export * from './graph/index.js'
export * from './compress/index.js'
export * from './cache/index.js'
export * from './route/index.js'
export * from './tool/index.js'
export * from './adapter/index.js'
export * from './learn/index.js'
export * from './correct/index.js'
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: update main exports with learn and correct modules"
```

---

## Task 14: Phase 3 Integration Test

**Files:**
- Create: `tests/integration-phase3.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, it, expect } from 'vitest'
import { createLearner } from '../src/learn/index.js'
import { createCorrector } from '../src/correct/index.js'
import { SemanticCache } from '../src/cache/l3-semantic.js'
import { OutputCompressor } from '../src/compress/output.js'

describe('Phase 3 Integration', () => {
  it('should learn from operations and apply corrections', () => {
    const learner = createLearner()
    const corrector = createCorrector()

    // Record successful operation
    learner.record({
      type: 'file-read',
      input: { filePath: 'src/main.ts' },
      output: { compressed: true },
      success: true
    })

    // Record failure
    learner.record({
      type: 'file-read',
      input: { filePath: 'missing.ts' },
      error: 'File not found',
      success: false
    })

    // Get suggestions
    const suggestions = learner.failures.getSuggestions('file-read')
    expect(suggestions.length).toBeGreaterThan(0)

    // Apply correction
    const corrected = corrector.correct('teh test')
    expect(corrected).toBe('the test')
  })

  it('should cache and search semantically', () => {
    const cache = new SemanticCache()

    cache.set('key1', {
      content: 'file read compressor',
      embedding: [0.1, 0.2, 0.3],
      metadata: { type: 'compressor' }
    })

    const results = cache.search([0.1, 0.2, 0.3], 0.8)
    expect(results.length).toBe(1)
    expect(results[0].entry.content).toBe('file read compressor')
  })

  it('should compress output intelligently', () => {
    const compressor = new OutputCompressor()

    const longContent = 'Important header\n' + 'x'.repeat(5000)
    const compressed = compressor.compress(longContent, {
      maxTokens: 100,
      preserveSections: true
    })

    expect(compressed).toContain('Important header')
    expect(compressed.length).toBeLessThan(longContent.length)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run tests/integration-phase3.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration-phase3.test.ts
git commit -m "test: Phase 3 integration test for intelligence features"
```

---

## Task 15: Final Build & Verify

- [ ] **Step 1: Run all tests**

```bash
npm test
```

- [ ] **Step 2: Build project**

```bash
npm run build
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: Phase 3 intelligence implementation complete"
```

---

## Summary

Phase 3 delivers:

1. **Pattern Miner** — Learns from successful operations
2. **Failure Learner** — Tracks failures and provides recovery suggestions
3. **Auto-Correction Engine** — Applies rules to fix common errors
4. **L3 Semantic Cache** — Cosine similarity search for semantic matching
5. **Output Compressors** — Truncation with section preservation
6. **Integration** — Full learn → correct → cache → compress pipeline
