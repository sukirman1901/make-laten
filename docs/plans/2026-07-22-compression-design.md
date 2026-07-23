# make-laten Compression Algorithm Design

## Date: 2026-07-22

## Problem
Current compression is basic truncation + formatting. Real savings:
- file-read: 0-2% (claimed 89%)
- grep: 1% (claimed 70%)
- git-diff: bug (claimed 60%)
- git-status: not implemented (claimed 65%)
- fetch: not tested (claimed75%)

## Approach: Hybrid (Regex + Tree-sitter)

### File Read Compression (target 89%)

**Strategy:**
1. Strip noise (~40% savings):
   - Remove imports (`import ... from '...'`)
   - Remove comments (`//`, `/* */`)
   - Remove blank lines, trailing whitespace
   - Remove type annotations in non-exported code

2. Extract structure (~30% savings):
   - Keep only: exports, class methods, function signatures
   - Remove function bodies for non-exported functions
   - Keep class properties but remove method implementations
   - Keep type definitions

3. Smart truncation (~19% savings):
   - For files > maxTokens: keep header + exports + bottom 20%
   - Mark omitted sections with `// [N lines omitted]`

### Grep Compression (target70%)

**Strategy:**
1. Group by file with match count
2. Deduplicate identical lines
3. Deduplicate similar patterns (e.g., repeated function calls)
4. Compact format: `file.ts:3 results`

### Git Diff Compression (target 60%)

**Strategy:**
1. Show diff stat summary first
2. For each file: only + and - lines
3. Condense adjacent changes
4. Remove context lines

### Git Status Compression (target 65%)

**Strategy:**
1. Group by status (M, A, D, ??)
2. Compress common path prefixes
3. Show count per group

### Fetch Compression (target 75%)

**Strategy:**
- Already has semantic extraction
- Verify and tune existing implementation

## Impact on LLM Performance

- **Token usage**: Reduced (40-89% savings)
- **LLM response quality**: Same — LLM reads same structure
- **LLM speed**: Faster (fewer tokens to process)
- **LLM cost**: Cheaper (fewer tokens billed)
- **Context window**: More efficient (can read more files)

## Implementation Order

1. File Read Compressor (most impact)
2. Git Diff Compressor (bug fix + compression)
3. Grep Compressor (grouping + dedup)
4. Git Status Compressor (grouping)
5. Fetch Compressor (verify + tune)

## Testing

- Benchmark before/after for each command
- Verify LLM can still understand compressed output
- Test with real codebases (100-1000 line files)
