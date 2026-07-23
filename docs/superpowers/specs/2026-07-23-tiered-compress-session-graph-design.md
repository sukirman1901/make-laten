# Design: Tiered File Compress + Session Graph

**Date:** 2026-07-23  
**Status:** Approved for planning  
**Version target:** post-1.2.3  
**Related:** RFC 001 Architecture, RFC 002 Compress Layer, RFC 003 Knowledge Graph

---

## Problem

Current `FileReadCompressor` optimizes for token savings by extracting exports/classes/functions/types and dropping bodies. That is useful for **overview** but unusable for **audit/detail review** (logic, security, correctness). Agents either:

1. Trust a lossy skeleton and miss bugs, or  
2. Bypass make-laten and re-read full files (wasting the product’s value).

Additionally:

- `FailureLearner` / learn persistence defaults to `~/.make-laten/`, so tests load production state and flake (`expected 1, got 2`).
- Knowledge graph and learn layers exist but are not wired as a solid expand path for compressed reads.

## Goals

1. **Overview compress** — high savings on large files (target ~15–25% of original tokens for large sources), always navigable.
2. **Audit detail** — **zero-loss** original source for a requested symbol or line range.
3. **IR + session store** — pointer map so expand does not require blind full re-parse every time (rebuild on miss/stale is allowed).
4. **Test isolation** — learn/graph paths injectable; vitest never reads/writes the user’s home make-laten data by accident.
5. **Learn foundation** — record overview/expand events for later pattern work without building full cross-session intelligence yet.

## Non-goals (this effort)

- Full multi-language AST (tree-sitter / babel) as a hard dependency.
- Cross-session ranking, embeddings, or L3 semantic cache as a requirement for expand.
- Reworking grep/git compressors in the same wave (file-read path first).
- Fancy MCP graph traversal APIs beyond what expand needs.
- Lossy “good enough” detail mode.

## Success metrics

| Metric | Criteria |
|--------|----------|
| Overview | Meaningful savings on large files; metadata reports strategy, lines, savings honestly |
| Detail | `content === original lines[start..end]` (bit-exact for the selected range) |
| Tests | Full suite green; learn tests isolated from `~/.make-laten` |
| Flow | Agent can overview → choose symbol/range → detail without dumping the whole file into context by default |
| Stale IR | mtime/content change invalidates IR; expand still correct after rebuild |

## Approach

**Two-tool + IR pointer (selected)**

- `make-laten-read` → overview + build/store `SymbolIR`
- `make-laten-read-detail` → zero-loss slice by symbol or line range
- Session store holds IR (+ ability to re-read original from disk)
- Thin graph: `file` → `has_ir` → `ir`
- Learn: injectable persistence; events for overview/expand

Rejected alternatives:

- **Single tool + modes only** — simpler API surface, but agents mis-pick modes and caching/IR lifecycle is messier.
- **Full lossless chunk index first** — correct but heavier storage/impl than needed for a solid v1 of this path.

---

## Architecture

```
Agent
  │
  ├─ make-laten-read(path)
  │       → FileReadCompressor (overview)
  │       → build SymbolIR
  │       → SessionStore upsert (ir, file meta)
  │       → optional graph: file -has_ir-> ir
  │       → return compact overview + symbol index
  │
  └─ make-laten-read-detail(path, focus)
          → DetailExpander
          → resolve focus via IR (or rebuild IR from disk)
          → return zero-loss slice + range metadata
```

### Components

| Unit | Responsibility |
|------|----------------|
| `SymbolIR` | Symbol → line offsets; content/mtime identity |
| `FileReadCompressor` | Overview only; always produce IR for non-passthrough (and optionally passthrough) reads |
| `DetailExpander` | Resolve focus; return exact original slice |
| `SessionStore` | L1 session: IR by path/id, access tracking; not dumping full original into every MCP payload |
| Graph (thin) | Persist `file` / `ir` nodes and `has_ir` edge when graph is enabled |
| MCP / CLI | Expose read + read-detail |

### Detail focus

```ts
type DetailFocus =
  | { type: 'symbol'; name: string }  // "compress" | "FileReadCompressor.compress"
  | { type: 'range'; start: number; end: number }  // 1-based inclusive
  | { type: 'export'; name: string }
```

**Fallback:** IR miss or stale → re-read file from disk → rebuild IR → slice. Detail must never be reconstructed from overview text.

---

## Overview format

Compact, navigable, includes how to expand:

```
// path/to/file.ts (342 lines) [ir:<id>]
// Exports: FileReadCompressor, calculateConfidence
// Classes:
//   FileReadCompressor
//     compress(input) L7-67
//     decompress(c) L69-71
// Functions:
//   helper() L80-90
// Types: FileReadInput, CompressedResult
// → detail: make-laten-read-detail <path> --symbol compress
```

Rules:

- Estimated tokens &lt; 200 → **passthrough** full file (no need for detail tool).
- Overview must list line ranges for expandable symbols when extraction succeeds.
- Do not put full method bodies in overview.

---

## SymbolIR schema

```ts
interface SymbolIR {
  id: string              // stable id derived from path + mtime (and/or content hash)
  filePath: string
  mtimeMs: number
  symbols: Array<{
    name: string
    kind: 'export' | 'class' | 'method' | 'function' | 'type'
    parent?: string       // e.g. class name for methods
    startLine: number     // 1-based inclusive
    endLine: number       // 1-based inclusive
  }>
}
```

Extraction for v1 may remain regex/structure-based (existing `structure.ts` / `strip.ts`), improved as needed for reliable line ranges. Multi-language AST is a later upgrade behind the same IR interface.

---

## API surface

### MCP

| Tool | Input | Output |
|------|--------|--------|
| `make-laten-read` | `file_path` | `{ compressed, savings, confidence, irId?, symbols? }` |
| `make-laten-read-detail` | `file_path`, `symbol?`, `start?`, `end?`, `export?` | `{ content, range, symbol?, irId }` |

Exactly one focus style required for detail: `symbol`, or `start`+`end`, or `export`.

### CLI

```bash
make-laten read <file>
make-laten read <file> --symbol <name>
make-laten read <file> --range <start>-<end>
make-laten read <file> --export <name>
```

Detail flags on `read` invoke the detail path; bare `read` is overview.

### Ambiguity

If a symbol name matches multiple IR entries, **do not guess**. Return structured candidates (name, kind, parent, lines) and a non-zero error/partial result the agent can disambiguate (e.g. `FileReadCompressor.compress`).

---

## Session store & caching

- Store IR keyed by normalized `filePath` and validate with `mtimeMs` (and/or content hash).
- Prefer re-reading file bytes from disk at detail time for zero-loss slices (simple, correct). Optional byte cache is an optimization, not required for correctness.
- Session store is process-local for MCP singletons; graph persistence is separate and optional per existing DB patterns.
- All store/graph/learn constructors accept injectable paths/dirs for tests.

---

## Graph (phase 1 — solid thin)

**In scope**

- Node types: `file`, `ir`
- Edge: `file -has_ir-> ir`
- Upsert on successful overview that produces IR
- Invalidate/replace IR node when mtime/id changes
- `createDatabase(path)` already supports path injection — tests use temp or `:memory:` if supported by better-sqlite3 usage in project

**Out of scope**

- Embeddings on nodes
- Cross-session “recommend next file”
- General-purpose graph query MCP tools

---

## Learn (phase 1 — solid thin)

**In scope**

- Injectable `persistencePath` for `FailureLearner` and `PatternMiner` (required for testability; production default remains under `~/.make-laten/`).
- Wave 0: fix tests to pass explicit temp paths and start empty.
- Record events (in-memory and/or existing pattern pipeline):
  - `overview_read` — path, irId, savings
  - `detail_expand` — path, focus, ir hit/miss, range size
- Failure records on missing file / invalid range (using injectable path).

**Out of scope for this effort**

- Rich recovery suggestion engine beyond current simple rules
- Cross-session pattern mining dashboards
- Auto-routing that forces detail vs overview

---

## Error handling

| Case | Behavior |
|------|----------|
| File not found | Structured error; optional failure record |
| Invalid range | Error with file line count |
| Symbol not found | Error + empty match; if IR present, no silent full-file dump |
| Ambiguous symbol | Candidates list; no slice until disambiguated |
| Stale IR | Rebuild once from disk, then serve |
| Permission error | Structured error; optional failure record |

---

## Rollout waves

| Wave | Deliverable | Exit criteria |
|------|-------------|---------------|
| 0 | Test isolation for learn persistence | 223/223 (or current full suite) green; no home-dir dependency in tests |
| 1 | SymbolIR builder + overview emits IR + SessionStore | Unit tests for IR ranges; overview still compresses |
| 2 | DetailExpander + MCP/CLI `read-detail` | Bit-exact slice tests; ambiguity tests |
| 3 | Graph file↔ir upsert/invalidate | Graph unit tests with temp DB |
| 4 | Learn expand/overview events + README/SKILL/CHANGELOG | Docs match behavior; integration overview→detail |

---

## Testing strategy

1. **Isolation** — learn/graph tests use temp directories; assert no writes under `~/.make-laten` during vitest (spot-check or env guard).
2. **IR** — fixtures with known class/method line ranges.
3. **Detail** — bit-exact equality against `fs.readFile` sliced lines.
4. **Ambiguity** — two methods same short name under different classes.
5. **Stale** — change mtime/content between overview and detail.
6. **Passthrough** — tiny file returns full content from `read`.
7. **Integration** — overview then detail on same path via public APIs.

---

## Versioning & docs touchpoints

- Bump package/CLI/`VERSION` consistently when releasing (fix known drift: package 1.2.3 vs CLI 1.0.3 vs `src/index.ts` 0.1.0) as part of release hygiene in wave 4 or a tiny prior chore in wave 0.
- Update `README.md`, `skills/SKILL.md`, MCP tool list (17 → 18 tools if detail is separate).
- CHANGELOG entry describing tiered read and test isolation.

---

## Open decisions (resolved in design)

| Decision | Choice |
|----------|--------|
| Priority order | Fix tests → tiered compress → thin graph/learn |
| Default compress UX | Overview first, detail on demand |
| API shape | Separate detail tool/path (CLI flags on `read` allowed) |
| Graph focus first | Session IR memory (file↔ir), not full A+B+C intelligence |
| Detail fidelity | Zero-loss original slice only |
| Overview+detail both required | Yes |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Regex structure extract wrong end lines | Fixture tests; prefer conservative end bounds; allow range override |
| Agents only call overview | Overview footer always shows detail invocation; skill docs mandate detail for audit |
| Session IR lost across MCP restarts | Rebuild from disk on miss (correctness preserved) |
| Persistence still flakes | Injectable paths + empty temp in `beforeEach` |

---

## Implementation note

No implementation in this document. After user approval of this written spec, create an implementation plan (writing-plans) and execute wave-by-wave with tests first per wave.
