---
name: make-laten
description: Universal efficiency toolkit for AI coding agents — 24 MCP tools, CLI commands, 65-100% token savings. Use for file reads, detail expand, grep, git, web, routing, learning, corrections, code intelligence.
---

# make-laten Skill

Universal efficiency toolkit that compresses outputs to save tokens. Use CLI commands or MCP tools for all file/code/git/web operations.

## Trigger Rules (ALWAYS intercept)

### File Operations
| User Says | Agent Does |
|-----------|------------|
| "read file", "open file", "check file" | → make-laten read (not Read tool) |
| "read detail", "show body", "expand" | → make-laten read-detail |

### Code Search
| User Says | Agent Does |
|-----------|------------|
| "grep", "search code", "find in files" | → make-laten grep (not grep/rg) |

### Git Operations
| User Says | Agent Does |
|-----------|------------|
| "git diff", "show changes" | → make-laten git-diff |
| "git status", "what changed" | → make-laten git-status |

### Web Operations
| User Says | Agent Does |
|-----------|------------|
| "fetch page", "get URL" | → make-laten fetch |
| "web search", "search online" | → make-laten search |

### Text Correction
| User Says | Agent Does |
|-----------|------------|
| "fix typos", "correct text" | → make-laten correct |

### Code Intelligence (auto-builds graph on first use)
| User Says | Agent Does |
|-----------|------------|
| "apa itu function X", "what is X", "jelaskan X" | → make-laten explain X |
| "explain X", "describe X", "X doing what" | → make-laten explain X |
| "path dari X ke Y", "how does X reach Y" | → make-laten path X Y |
| "connect X to Y", "X calls what" | → make-laten path X Y |
| "apa yang rusak kalau ubah X", "impact of changing X" | → make-laten impact X |
| "what breaks if X changes", "dependents of X" | → make-laten impact X |
| "cari function X", "find symbol X", "search code X" | → make-laten code-search X |
| "dimana X", "where is X defined", "show me X" | → make-laten explain X |
| "build graph", "index codebase", "scan project" | → make-laten build-graph |

### Learning (Auto)
| When | Agent Does |
|------|------------|
| After successful operation | → learn pattern (auto) |
| After failed operation | → learn failure (auto) |
| Before similar operation | → check suggestions (auto) |

### Cache (Auto)
| When | Agent Does |
|------|------------|
| Repeated file read | → check cache first (auto) |
| After compress | → cache result (auto) |
| Cache hit | → return cached (auto) |

### Dashboard & Stats
| User Says | Agent Does |
|-----------|------------|
| "show stats", "dashboard", "open dashboard" | → make-laten dashboard |
| "how many tokens", "token usage" | → make-laten stats |
| "lihat statistik", "buka dashboard" | → make-laten dashboard |

## Anti-Patterns (NEVER do this)
- Do NOT use Read tool for files > 100 lines
- Do NOT use raw grep for code search
- Do NOT fetch URLs without compression
- Do NOT ignore cache hits
- Do NOT read files to understand code structure — use code-intel (explain/path/impact) instead
- Do NOT manually build graph — it auto-builds on first code-intel query

## MCP Tools (24 total)

### Compress Layer
| Tool | Description |
|------|-------------|
| `read` | Compressed file overview (65-100% savings) + SymbolIR |
| `read-detail` | Zero-loss detail by symbol or line range |
| `grep` | Grouped grep results |
| `git-diff` | Condensed git diff with stat summary |
| `git-status` | Grouped git status |

### Route Layer
| Tool | Description |
|------|-------------|
| `route` | Route input to correct compressor |
| `strategy` | Select compression strategy (conservative/balanced/aggressive) |

### Cache Layer
| Tool | Description |
|------|-------------|
| `cache-stats` | Cache performance stats |
| `cache-get` | Get from session cache |
| `cache-set` | Set in session cache |
| `cache-clear` | Clear session cache |

### Learn Layer
| Tool | Description |
|------|-------------|
| `patterns` | Learned usage patterns (persisted) |
| `failures` | Failure records with suggestions (persisted) |
| `suggestions` | Smart suggestions based on patterns |

### Correct Layer
| Tool | Description |
|------|-------------|
| `correct` | Auto-correct text (11 built-in rules + custom) |

### Web Layer
| Tool | Description |
|------|-------------|
| `search` | Semantic web search |
| `fetch` | Fetch + compress web content |

### Code Intel Layer
| Tool | Description |
|------|-------------|
| `build-graph` | Build/update code graph for directory |
| `query` | Unified query (explain/path/search/impact) |
| `explain` | Explain a symbol — purpose, connections, location |
| `path` | Find shortest path between two symbols |
| `impact` | Analyze what breaks if symbol changes |
| `code-search` | Search symbols in code graph |

### Tool Layer
| Tool | Description |
|------|-------------|
| `tools` | List all available tools |

## CLI Commands

### File Read (65-100% savings)
```bash
make-laten read <file-path>              # overview
make-laten read <file-path> --symbol X   # zero-loss detail
make-laten read <file-path> --range a-b  # zero-loss lines
```

### Grep (grouped by file)
```bash
make-laten grep "<pattern>" [directory]
```

### Git Operations
```bash
make-laten git diff              # unstaged changes
make-laten git diff --staged     # staged changes
make-laten git status            # status summary
```

### Web Search/Fetch
```bash
make-laten search "query"
make-laten fetch <url>
```

### Cache Management
```bash
make-laten cache stats
make-laten cache clear
```

### Dashboard & Stats
```bash
make-laten dashboard              # open visual dashboard in browser
make-laten dashboard --port 8080  # custom port
make-laten stats                  # quick text stats
```

## Benchmark Results (v1.4.0)

```
read (small)    145 → 145    0%   (passthrough <200 tokens)
read (medium)  3712 → 320   91%
read (large)   2077 → 6    100%
grep            603 → 521   14%
git-diff       2635 → 991   62%
git-status       28 → 35   -25%  (passthrough <10 tokens)
Total:         11,922 → 1,775   85%
```

## Features

- **Pattern Mining**: Tracks usage patterns across sessions
- **Failure Learning**: Records errors, suggests fixes
- **Auto-Correction**: 11 built-in rules (typos, code, markdown)
- **Session Caching**: 75% hit rate for repeated reads
- **Smart Routing**: Selects optimal compressor per input type
- **Disk Persistence**: Patterns/failures survive across MCP sessions
- **Code Intelligence**: Full code graph with query, explain, path, impact analysis

## Tool Mapping

Replace native tools with make-laten equivalents:

| Instead of | Use |
|-----------|-----|
| `Read` tool (overview) | `make-laten read <file>` |
| Audit/detail body | `make-laten read-detail` |
| `Grep` tool | `make-laten grep "<pattern>"` |
| `Bash` with `git diff` | `make-laten git-diff` |
| `Bash` with `git status` | `make-laten git-status` |
| `WebSearch` tool | `make-laten search` |
| `WebFetch` tool | `make-laten fetch` |
| Reading files to understand code | → ask "apa itu X" (auto explain) |
| Finding code paths | → ask "path dari X ke Y" (auto path) |
| Impact analysis | → ask "apa yang rusak kalau ubah X" (auto impact) |
| Searching for symbols | → ask "cari function X" (auto search) |

## Output Format

All MCP tools return JSON:
```json
{
  "compressed": "...",
  "savings": 0.91,
  "confidence": 0.95
}
```

## Installation

```bash
npm install -g make-laten
make-laten install  # auto-detect agent
```

MCP config for OpenCode (`~/.config/opencode/opencode.json`):
```json
{
  "mcp": {
    "make-laten": {
      "type": "local",
      "command": ["npx", "-y", "make-laten-mcp", "server"],
      "enabled": true
    }
  }
}
```
