# RFC 002: Compress Layer Design

**Status:** Draft
**Author:** make-laten team
**Date:** 2026-07-22
**Depends on:** [RFC 001: Architecture](./001-architecture.md)

---

## Summary

Define the Compress Layer — responsible for reducing tokens at input, output, and reasoning touchpoints while maintaining reversibility.

---

## Motivation

AI coding agents consume tokens in three ways:

1. **Input tokens** — file reads, grep results, git output, web content
2. **Output tokens** — agent responses, explanations, code generation
3. **Reasoning tokens** — planning, re-reading, re-computing

Each type requires different compression strategies. The Compress Layer provides unified interfaces for all three.

---

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  COMPRESS LAYER                          │
├───────────────┬──────────────────┬──────────────────────┤
│  Input        │  Output          │  Reasoning           │
│  Compressor   │  Compressor      │  Compressor          │
├───────────────┼──────────────────┼──────────────────────┤
│ • File read   │ • Drop ceremony  │ • Cache hit skip     │
│ • Grep/Glob   │ • Terse errors   │ • Plan reuse         │
│ • Git diff    │ • Skip reprint   │ • Subagent dedup     │
│ • Web fetch   │ • Code compress  │                      │
└───────────────┴──────────────────┴──────────────────────┘
```

### Input Compressors

#### File Read Compressor

**Strategy:** AST-based signature extraction

```typescript
class FileReadCompressor implements Compressor {
  async compress(input: FileReadInput): Promise<CompressedResult> {
    const { content, language, filePath } = input
    
    // 1. Parse AST
    const ast = await this.parseAST(content, language)
    
    // 2. Extract signatures
    const signatures = this.extractSignatures(ast)
    
    // 3. Extract key logic (exports, main functions, types)
    const keyLogic = this.extractKeyLogic(ast)
    
    // 4. Compose compressed output
    const compressed = this.compose(filePath, signatures, keyLogic)
    
    return {
      content: compressed,
      original: content,
      confidence: this.calculateConfidence(content, compressed),
      metadata: {
        lines: content.split('\n').length,
        compressedLines: compressed.split('\n').length,
        savings: 1 - (compressed.length / content.length)
      }
    }
  }
  
  private extractSignatures(ast: AST): Signature[] {
    // Extract: function signatures, class declarations,
    // type definitions, exports
    return ast.body
      .filter(node => this.isSignature(node))
      .map(node => this.signatureToString(node))
  }
  
  private extractKeyLogic(ast: AST): string[] {
    // Extract: main logic flow, error handling,
    // API calls, side effects
    return ast.body
      .filter(node => this.isKeyLogic(node))
      .map(node => this.nodeToString(node))
  }
}
```

**Compression rules:**

| Content | Keep | Drop |
|---------|------|------|
| Function | Signature + params + return type | Body (unless < 10 lines) |
| Class | Constructor + public methods | Private methods (unless small) |
| Type | Full definition | — |
| Export | Full signature | Implementation |
| Import | Module name | Specific imports |

#### Grep Compressor

**Strategy:** Group results by file, show unique matches only

```typescript
class GrepCompressor implements Compressor {
  async compress(input: GrepInput): Promise<CompressedResult> {
    const { results, pattern, directory } = input
    
    // 1. Group by file
    const grouped = this.groupByFile(results)
    
    // 2. For each file, show unique matches
    const compressed = grouped.map(file => ({
      file: file.path,
      matches: this.deduplicateMatches(file.matches),
      count: file.matches.length
    }))
    
    // 3. Sort by relevance
    compressed.sort((a, b) => b.count - a.count)
    
    return {
      content: this.format(compressed),
      original: this.format(results),
      confidence: 0.95,
      metadata: {
        totalMatches: results.length,
        uniqueFiles: grouped.length,
        savings: 1 - (this.format(compressed).length / this.format(results).length)
      }
    }
  }
}
```

#### Git Diff Compressor

**Strategy:** Condense hunks, show only changed lines with context

```typescript
class GitDiffCompressor implements Compressor {
  async compress(input: GitDiffInput): Promise<CompressedResult> {
    const { diff } = input
    
    // 1. Parse diff hunks
    const hunks = this.parseDiff(diff)
    
    // 2. Condense each hunk
    const condensed = hunks.map(hunk => ({
      file: hunk.file,
      changes: this.condenseHunk(hunk),
      stats: { additions: hunk.additions, deletions: hunk.deletions }
    }))
    
    // 3. Drop unchanged files
    const significant = condensed.filter(h => h.changes.length > 0)
    
    return {
      content: this.format(significant),
      original: diff,
      confidence: 0.90,
      metadata: {
        filesChanged: significant.length,
        totalChanges: hunks.reduce((acc, h) => acc + h.additions + h.deletions, 0)
      }
    }
  }
  
  private condenseHunk(hunk: Hunk): string[] {
    // Keep: changed lines with 2 lines of context
    // Drop: unchanged lines, metadata, binary diffs
    return hunk.lines
      .filter(line => line.type !== 'context' || line.nearChange)
      .map(line => `${line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '} ${line.content}`)
  }
}
```

### Output Compressors

**Strategy:** Drop ceremony, compress prose, keep code exact

```typescript
class OutputCompressor implements Compressor {
  async compress(input: AgentOutput): Promise<CompressedResult> {
    const { text, codeBlocks, errors } = input
    
    // 1. Drop ceremonial text
    const cleaned = this.dropCeremony(text)
    
    // 2. Compress prose sections
    const compressedProse = this.compressProse(cleaned)
    
    // 3. Keep code blocks exact (no compression)
    // 4. Compress error messages
    const compressedErrors = this.compressErrors(errors)
    
    return {
      content: this.compose(compressedProse, codeBlocks, compressedErrors),
      original: this.compose(text, codeBlocks, errors),
      confidence: 0.85
    }
  }
  
  private dropCeremony(text: string): string {
    const ceremonyPatterns = [
      /^Sure[!.]?\s*I('d| would) be happy to help.*?\n/gim,
      /^Let me (think about|look at|examine) this.*?\n/gim,
      /^Here('s| is) what I.*?:\n/gim,
      /^I('ll| will) (help you|show you|explain).*?\n/gim,
    ]
    
    return text.replace(new RegExp(ceremonyPatterns.join('|'), 'gim'), '')
  }
}
```

### Reasoning Compressors

**Strategy:** Skip redundant operations, reuse plans

```typescript
class ReasoningCompressor implements Compressor {
  async compress(input: ReasoningInput): Promise<CompressedResult> {
    const { operation, history, graph } = input
    
    // 1. Check if operation was already done
    const cached = await graph.findSimilar(operation)
    if (cached && cached.confidence > 0.9) {
      return {
        content: `Use cached result from ${cached.accessedAt}`,
        original: null,
        confidence: cached.confidence,
        metadata: { skipped: true, cacheHit: true }
      }
    }
    
    // 2. Check if plan already exists
    const existingPlan = await graph.findPlan(operation)
    if (existingPlan) {
      return {
        content: existingPlan,
        original: null,
        confidence: existingPlan.confidence,
        metadata: { reused: true }
      }
    }
    
    // 3. No compression — let agent proceed
    return null
  }
}
```

---

## Reversibility (CCR)

Every compressed output stores the original and can be retrieved:

```typescript
interface CompressedResult {
  content: string           // compressed output
  original: string | null   // original content
  confidence: number        // 0-1
  metadata: {
    savings: number
    strategy: string
    timestamp: number
  }
}

// Retrieval
async function retrieve(id: string): Promise<string> {
  const entry = await graph.getNode(id)
  if (entry?.original) return entry.original
  throw new Error('Original not available')
}

// Partial retrieval
async function retrieveSection(id: string, section: string): Promise<string> {
  const entry = await graph.getNode(id)
  if (!entry?.original) throw new Error('Original not available')
  
  // Parse and extract specific section
  return this.extractSection(entry.original, section)
}
```

---

## Confidence Scoring

Each compression includes a confidence score:

```typescript
function calculateConfidence(original: string, compressed: string): number {
  let score = 1.0
  
  // Penalize if too much dropped
  const ratio = compressed.length / original.length
  if (ratio < 0.05) score -= 0.3  // too aggressive
  if (ratio < 0.01) score -= 0.5  // way too aggressive
  
  // Penalize if code blocks were modified
  if (this.codeBlocksModified(original, compressed)) score -= 0.4
  
  // Penalize if error messages changed
  if (this.errorsModified(original, compressed)) score -= 0.3
  
  // Bonus for known patterns
  if (this.isKnownPattern(original)) score += 0.1
  
  return Math.max(0, Math.min(1, score))
}
```

**Thresholds:**
- `confidence >= 0.8`: Return compressed (high confidence)
- `0.5 <= confidence < 0.8`: Return compressed with warning
- `confidence < 0.5`: Return original (low confidence)

---

## Performance Targets

| Operation | Target Latency | Target Savings |
|-----------|---------------|----------------|
| File read compress | < 50ms | 80-90% |
| Grep compress | < 100ms | 85-95% |
| Git diff compress | < 150ms | 85-95% |
| Web fetch compress | < 200ms | 70-85% |
| Output compress | < 20ms | 50-70% |
| Reasoning compress | < 10ms | Varies |

---

## Open Questions

1. Should we support binary file compression (images, PDFs)?
2. How to handle very large files (>10MB)?
3. Should compression be async or sync?
4. How to handle encoding issues (UTF-8, UTF-16, etc.)?
