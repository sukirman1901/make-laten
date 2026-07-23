# Code Intelligence Layer

## Overview

The Code Intelligence Layer provides full code analysis capabilities across 40+ languages. It builds a graph representation of your codebase and enables powerful queries.

## Architecture

```
Source Code → AST Builder → Graph Builder → Query Engine
                                    ↓
                              Graph Storage (.make-laten/graph.json)
```

## Components

### ASTBuilder (`src/code-intel/ast-builder.ts`)
Parses source code into structured AST results containing functions, classes, exports, and imports. Currently uses regex-based parsing for speed.

### GraphBuilder (`src/code-intel/graph-builder.ts`)
Converts AST results into a graph of nodes (file, function, class, method, import) and edges (defines, calls, imports).

### QueryEngine (`src/code-intel/query-engine.ts`)
Provides three query operations:
- `explain(symbol)` — Find a symbol and its connections
- `path(source, target)` — BFS shortest path between symbols
- `search(query)` — Fuzzy search symbols by name

### ImpactAnalyzer (`src/code-intel/impact-analyzer.ts`)
Analyzes what breaks if a symbol changes:
- Direct impact — who calls this symbol
- Indirect impact — who calls the callers
- Risk level — low/medium/high based on impact count

### IncrementalBuilder (`src/code-intel/incremental.ts`)
Orchestrates building a code graph from a directory:
- `buildDirectory(path)` — Scan all supported files
- `updateDirectory(path, changedFiles)` — Incremental updates

### GraphStorage (`src/code-intel/storage.ts`)
JSON persistence for the code graph.

## Supported Languages

TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP

## MCP Tools

| Tool | Description |
|------|-------------|
| `build-graph` | Build or update code graph |
| `query` | Unified query (explain/path/search/impact) |
| `explain` | Explain a symbol |
| `path` | Find path between symbols |
| `impact` | Analyze change impact |
| `code-search` | Search symbols |

## Graph Storage

Graphs are saved to `.make-laten/graph.json` in the project root.
