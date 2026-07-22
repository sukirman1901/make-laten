---
name: make-laten
description: Token optimization toolkit for AI coding agents — compress file reads, grep, git diff, web search/fetch, cache. Use when reading files, searching code, checking git status, or fetching web content to save 60-90% tokens.
---

# make-laten Skill

Efficiency toolkit that compresses outputs to save tokens. Use CLI commands for all file/code/git/web operations.

## When to Use

**ALWAYS use make-laten instead of raw tools when:**
- Reading files → `make-laten read <file>` (89% savings)
- Searching code → `make-laten grep <pattern>` (grouped by file)
- Git operations → `make-laten git diff` / `make-laten git status`
- Web search → `make-laten search <query>`
- Web fetch → `make-laten fetch <url>` (75% savings)

## CLI Commands

### File Read (89% savings)
```bash
make-laten read <file-path>
```
Returns compressed JSON with file summary, exports, classes, functions.

### Grep (grouped by file)
```bash
make-laten grep "<pattern>" [directory]
make-laten grep "TODO" src/
make-laten grep "export" . --ignore ts
```

### Git Operations
```bash
make-laten git diff              # unstaged changes
make-laten git diff --staged     # staged changes
make-laten git status            # status summary
```

### Web Search (via DuckDuckGo)
```bash
make-laten search "query"
make-laten search "react hooks" --max 10
```

### Web Fetch + Compress
```bash
make-laten fetch <url>
make-laten fetch https://docs.example.com
```

### Cache Management
```bash
make-laten cache stats           # show hit rate
make-laten cache clear           # reset
```

## Tool Mapping

Replace native tools with make-laten equivalents:

| Instead of | Use |
|-----------|-----|
| `Read` tool | `make-laten read <file>` |
| `Grep` tool | `make-laten grep "<pattern>"` |
| `Bash` with `git diff` | `make-laten git diff` |
| `Bash` with `git status` | `make-laten git status` |
| `WebSearch` tool | `make-laten search "<query>"` |
| `WebFetch` tool | `make-laten fetch <url>` |

## Output Format

All commands return JSON:
```json
{
  "compressed": "...",
  "confidence": 1,
  "metadata": { "savings": 0.89 }
}
```

## Integration

make-laten is installed globally. Works from any directory. No configuration needed.

```bash
# Verify installation
make-laten --version

# Check adapter status
make-laten install --status
```
