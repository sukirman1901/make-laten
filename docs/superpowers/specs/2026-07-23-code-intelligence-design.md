# Code Intelligence Layer Design

**Date:** 2026-07-23
**Status:** Draft
**Author:** make-laten team

## Summary

Add full code intelligence to make-laten: query, explain, path, impact analysis, and search across 40+ languages. Integrate with existing compress, cache, and learn layers for maximum token savings.

## Goals

1. Query code without reading full files (indirect token savings)
2. Understand code relationships (calls, imports, inherits)
3. Impact analysis (what breaks when code changes)
4. Natural language + structured query interface
5. Full integration with existing layers

## Non-Goals

1. Replace Graphify (different approach, can complement)
2. Real-time collaboration (single-user for now)
3. Full IDE integration (MCP only)

## Architecture

```
┌─────────────────────────────────────────────┐
│           Code Query Layer                  │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Builder │  │  Query  │  │ Impact  │     │
│  │ (AST)   │  │ Engine  │  │ Analyzer│     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │            │            │           │
│  ┌────▼────────────▼────────────▼────┐      │
│  │         Graph Store (SQLite)      │      │
│  └───────────────────────────────────┘      │
├─────────────────────────────────────────────┤
│         Compress Layer (existing)           │
├─────────────────────────────────────────────┤
│         Cache Layer (existing)              │
├─────────────────────────────────────────────┤
│         Learn Layer (existing)              │
└─────────────────────────────────────────────┘
```

## Components

### 1. AST Parser & Builder

**Parser:** tree-sitter WASM bindings

**Languages (40+):**
- TypeScript, JavaScript, JSX, TSX
- Python, Ruby, PHP
- Go, Rust, Java, C, C++
- Swift, Kotlin, Scala
- And 30+ more via tree-sitter grammars

**Nodes:**
- `file:path/to/file.ts`
- `function:FunctionName`
- `class:ClassName`
- `method:ClassName.methodName`
- `type:TypeName`
- `export:exportName`
- `import:importPath`

**Edges:**
- `defines` (file → function/class)
- `calls` (function → function)
- `extends` (class → class)
- `implements` (class → interface)
- `imports` (file → file)
- `uses` (function → type)

**Storage:**
- Session: in-memory (ephemeral)
- Persistent: `.make-laten/graph.json` (commit-able)

### 2. Query Engine

**Query Types:**

| Type | Function | Output |
|------|----------|--------|
| explain | `explain(symbol)` | Description, connections, location |
| path | `path(source, target)` | Shortest path between symbols |
| query | `query(question)` | Relevant subgraph |
| impact | `impact(symbol)` | What breaks if changed |
| search | `search(query)` | Matching symbols |

**Query Processing:**
1. Natural language → parse intent → structured query
2. Structured → direct execution
3. Execute on graph
4. Compress result via existing compress layer
5. Cache via existing cache layer

### 3. Incremental Build

**Triggers:**
1. First query (auto-build)
2. Git commit (post-commit hook)
3. Manual: `make-laten build-graph`

**Strategy:**
- First time: scan all files, build full graph
- Incremental: only re-parse changed files
- Update affected nodes/edges
- Merge with existing graph

**Performance:**
- Full build: ~2-5 sec for 10k LOC
- Incremental: ~100-500ms for 1 file

### 4. Integration Pipeline

```
User Query
     │
     ▼
Query Router → detect intent
     │
     ▼
Graph Query → execute on graph
     │
     ▼
Compress → format output
     │
     ▼
Cache → store result
     │
     ▼
Learn → record pattern
     │
     ▼
Compressed Output to Agent
```

### 5. MCP Tools (6 new)

| Tool | Function |
|------|----------|
| `query` | Query the code graph |
| `explain` | Explain a symbol |
| `path` | Find path between symbols |
| `impact` | Impact analysis |
| `search` | Search symbols |
| `build-graph` | Build/update graph |

**Total MCP tools: 18 + 6 = 24**

### 6. Storage

**Session:**
- In-memory graph (ephemeral)
- Fast access

**Persistent:**
- `.make-laten/graph.json`
- Portable (commit-able)
- Merge-friendly (JSON)
- Size: ~1MB per 10k LOC

**Configuration:**
```json
// .make-laten/config.json
{
  "languages": ["typescript", "python", "go", "rust"],
  "exclude": ["node_modules", "dist", "*.test.ts"],
  "autoBuild": true,
  "gitHook": true
}
```

## File Structure

```
src/
├── graph/                    # Existing (extend)
│   ├── database.ts
│   ├── nodes.ts
│   ├── edges.ts
│   └── file-ir.ts
│
├── code-intel/               # NEW
│   ├── ast-builder.ts
│   ├── graph-builder.ts
│   ├── query-engine.ts
│   ├── impact-analyzer.ts
│   ├── incremental.ts
│   └── languages/
│       ├── index.ts
│       ├── typescript.ts
│       ├── python.ts
│       ├── go.ts
│       └── ...
│
├── compress/                 # Existing (integrate)
├── cache/                    # Existing (integrate)
├── learn/                    # Existing (integrate)
└── mcp/
    └── server.ts             # Add 6 new tools
```

## Testing

**Test Categories:**

| Category | Count |
|----------|-------|
| Unit: AST Parser | 10 |
| Unit: Graph Builder | 10 |
| Unit: Query Engine | 10 |
| Unit: Incremental | 5 |
| Language Tests | 40 |
| Integration | 10 |
| E2E | 5 |

**Total: ~100 tests**

## Implementation Plan

### Phase 1: Core (Week 1)
- tree-sitter WASM setup
- AST parser for top 5 languages
- Graph builder (nodes + edges)
- Basic query engine

### Phase 2: Query (Week 2)
- explain()
- path()
- search()
- Query → compress integration

### Phase 3: Advanced (Week 3)
- impact() analysis
- incremental build
- git hook integration
- Natural language query

### Phase 4: Languages (Week 4)
- Add remaining 35+ languages
- Language-specific edge types
- Language tests

### Phase 5: Integration (Week 5)
- Cache integration
- Learn integration
- MCP tools (6 new)
- E2E tests

### Phase 6: Polish (Week 6)
- Performance optimization
- Error handling
- Documentation
- Release v1.4.0

## Risks

| Risk | Mitigation |
|------|------------|
| tree-sitter WASM slow | Use Worker threads |
| Too many languages | Start with top 5, add incrementally |
| Graph too large | Pagination, lazy loading |
| Memory usage | Stream processing for large files |

## Success Metrics

1. Query response time < 100ms
2. Graph build time < 5s for 10k LOC
3. Token savings > 50% vs reading full files
4. 40+ languages supported
5. 100% test coverage for core logic
