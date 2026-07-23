---
name: make-laten
description: Universal efficiency toolkit for AI coding agents — 18 MCP tools, CLI commands, 65-100% token savings. Use for file reads, detail expand, grep, git, web, routing, learning, corrections.
---

# make-laten Skill

Universal efficiency toolkit that compresses outputs to save tokens. Use CLI commands or MCP tools for all file/code/git/web operations.

## When to Use

**ALWAYS use make-laten instead of raw tools when:**
- Reading files (overview) → `make-laten read <file>` or `make-laten-read` MCP tool (65-100% savings)
- Audit/detail file body → `make-laten read --symbol` or `make-laten-read-detail` (zero-loss)
- Searching code → `make-laten grep <pattern>` or `make-laten-grep` MCP tool (grouped by file)
- Git operations → `make-laten git diff/status` or MCP equivalents
- Web search → `make-laten search <query>` or `make-laten-search` MCP tool
- Web fetch → `make-laten fetch <url>` or `make-laten-fetch` MCP tool (75% savings)

## MCP Tools (18 total)

### Compress Layer
| Tool | Description |
|------|-------------|
| `make-laten-read` | Compressed file overview (65-100% savings) + SymbolIR |
| `make-laten-read-detail` | Zero-loss detail by symbol or line range |
| `make-laten-grep` | Grouped grep results |
| `make-laten-git-diff` | Condensed git diff with stat summary |
| `make-laten-git-status` | Grouped git status |

### Route Layer
| Tool | Description |
|------|-------------|
| `make-laten-route` | Route input to correct compressor |
| `make-laten-strategy` | Select compression strategy (conservative/balanced/aggressive) |

### Cache Layer
| Tool | Description |
|------|-------------|
| `make-laten-cache-stats` | Cache performance stats |
| `make-laten-cache-get` | Get from session cache |
| `make-laten-cache-set` | Set in session cache |
| `make-laten-cache-clear` | Clear session cache |

### Learn Layer
| Tool | Description |
|------|-------------|
| `make-laten-patterns` | Learned usage patterns (persisted) |
| `make-laten-failures` | Failure records with suggestions (persisted) |
| `make-laten-suggestions` | Smart suggestions based on patterns |

### Correct Layer
| Tool | Description |
|------|-------------|
| `make-laten-correct` | Auto-correct text (11 built-in rules + custom) |

### Web Layer
| Tool | Description |
|------|-------------|
| `make-laten-search` | Semantic web search |
| `make-laten-fetch` | Fetch + compress web content |

### Tool Layer
| Tool | Description |
|------|-------------|
| `make-laten-tools` | List all available tools |

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

## Benchmark Results (v1.2.3)

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

## Tool Mapping

Replace native tools with make-laten equivalents:

| Instead of | Use |
|-----------|-----|
| `Read` tool (overview) | `make-laten read <file>` or `make-laten-read` |
| Audit/detail body | `make-laten-read-detail` or `make-laten read --symbol` |
| `Grep` tool | `make-laten grep "<pattern>"` or `make-laten-grep` |
| `Bash` with `git diff` | `make-laten git diff` or `make-laten-git-diff` |
| `Bash` with `git status` | `make-laten git status` or `make-laten-git-status` |
| `WebSearch` tool | `make-laten search` or `make-laten-search` |
| `WebFetch` tool | `make-laten fetch` or `make-laten-fetch` |

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
