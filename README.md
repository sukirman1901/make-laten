# make-laten

[![npm version](https://img.shields.io/npm/v/make-laten.svg)](https://www.npmjs.com/package/make-laten)
[![license](https://img.shields.io/npm/l/make-laten.svg)](https://github.com/sukirman1901/make-laten/blob/main/LICENSE)
[![tests](https://img.shields.io/badge/tests-282%20passing-brightgreen)]()

Universal efficiency toolkit for AI coding agents — compress, cache, learn, and optimize token usage across all platforms.

## What it does

make-laten reduces token consumption when working with AI coding agents by compressing outputs, caching results, learning from patterns, and routing operations intelligently.

```
User → AI Agent → make-laten intercept → compress → learn → cache → return
```

**Benchmark results:**

| Command | Raw | Compressed | Savings |
|---------|-----|------------|---------|
| `read` (medium) | 3712 | 320 | **91%** |
| `read` (large) | 2077 | 6 | **100%** |
| `grep` | 603 | 521 | **14%** |
| `git diff` | 2635 | 991 | **62%** |
| **Total** | 11,922 | 1,775 | **85%** |

## Quick Start

**One command to set up everything:**

```bash
npx make-laten init --all
```

This auto-detects your installed AI agents and configures MCP + platform-specific configs (CLAUDE.md, .cursorrules, AGENTS.md, GEMINI.md).

**What gets configured:**

| Platform | Config File | What It Does |
|----------|-------------|--------------|
| Claude Code | CLAUDE.md | "Use make-laten INSTEAD of Read tool" |
| Cursor | .cursorrules | "Use make-laten MCP tools for all operations" |
| Codex | AGENTS.md | Agent instructions for make-laten |
| Gemini | GEMINI.md | Tool usage guidelines |
| opencode | SKILL.md | Auto-loaded skill |

## Setup Options

### Option 1: Init Wizard (Recommended)

```bash
# Auto-configure all detected agents
npx make-laten init --all

# Per-project only (creates .mcp.json)
npx make-laten init --project

# Interactive (choose agents one by one)
npx make-laten init
```

### Option 2: Global Install

```bash
npm install -g make-laten

# Install shell aliases
make-laten install

# Or configure MCP for agents
make-laten init --all
```

### Option 3: Shell Aliases Only

```bash
# Add to ~/.zshrc or ~/.bashrc
source $(npm root -g)/make-laten/shell/init.sh
```

This gives you short aliases:

| Alias | Command | Description |
|-------|---------|-------------|
| `mread` | `make-laten read` | Compressed file read |
| `mgrep` | `make-laten grep` | Grouped grep |
| `mdiff` | `make-laten git diff` | Compressed git diff |
| `mstatus` | `make-laten git status` | Git status summary |
| `msearch` | `make-laten search` | Web search |
| `mfetch` | `make-laten fetch` | Web fetch + compress |

## MCP Server (17 Tools)

make-laten includes an MCP server with **18 tools** across 6 layers.

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
| `make-laten-strategy` | Select compression strategy |

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

**Manual MCP config (if needed):**

```json
{
  "mcpServers": {
    "make-laten": {
      "command": "npx",
      "args": ["-y", "make-laten-mcp", "server"]
    }
  }
}
```

## CLI Commands

```bash
# File operations
make-laten read src/index.ts                 # overview
make-laten read src/index.ts --symbol main   # zero-loss detail
make-laten read src/index.ts --range 10-40   # zero-loss lines
make-laten grep "TODO" src/          # grouped by file
make-laten grep "export" . --ignore ts

# Git operations
make-laten git diff                  # 62% savings
make-laten git diff --staged
make-laten git status

# Web operations
make-laten search "typescript generics"
make-laten fetch https://docs.example.com

# Cache
make-laten cache stats
make-laten cache clear

# Setup
make-laten init --all               # detect + configure MCP
make-laten install                   # install shell aliases
make-laten install --status          # show what's installed
```

## Code Intelligence

make-laten now includes full code intelligence:

- **Query**: Ask about code without reading files
- **Explain**: Get symbol details and connections
- **Path**: Find shortest path between symbols
- **Impact**: Analyze what breaks when code changes
- **Search**: Find symbols across codebase

### Usage

```bash
# Build graph for current directory
npx make-laten build-graph

# Query the graph
npx make-laten query --type explain --symbol login
npx make-laten query --type path --source UserService --target Database
npx make-laten query --type impact --symbol AuthService
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `build-graph` | Build/update code graph for directory |
| `query` | Unified query interface (explain/path/search/impact) |
| `explain` | Explain a symbol — its purpose, connections, location |
| `path` | Find shortest path between two symbols |
| `impact` | Analyze what breaks if symbol changes |
| `code-search` | Search symbols in code graph |

## Dashboard

Visual dashboard for token usage, compression stats, and code graph.

```bash
make-laten dashboard        # open in browser
make-laten dashboard --port 8080  # custom port
make-laten stats            # quick text stats
```

### Features
- Overview: total requests, tokens, cost, compression
- Tokens: per-request table with model, input/output, timestamp
- Compress: per-tool compression ratios
- Learn: patterns, failures, corrections
- Cache: hit rate, cache size
- Graph: interactive force-directed code graph
- Activity: request timeline, error log

## Supported Agents

make-laten works with **9+ AI coding agents**:

| Agent | Integration | Setup |
|-------|-------------|-------|
| **Claude Code** | MCP + Hooks | `npx make-laten init --all` |
| **Cursor** | MCP + Rules | `npx make-laten init --all` |
| **Codex** | MCP + AGENTS.md | `npx make-laten init --all` |
| **OpenCode** | MCP + Skill | `npx make-laten init --all` |
| **Gemini CLI** | MCP | `npx make-laten init --all` |
| **Windsurf** | MCP | `npx make-laten init --all` |
| **Cline** | MCP | `npx make-laten init --all` |
| **GitHub Copilot** | MCP | `npx make-laten init --all` |
| **Any MCP client** | MCP | Add server config manually |

## Programmatic Usage

```typescript
import {
  FileReadCompressor,
  GrepCompressor,
  GitDiffCompressor,
  WebRouter,
  PatternMiner,
  FailureLearner,
  AutoCorrect,
  SessionCache,
  ToolRouter,
  StrategyRouter
} from 'make-laten'

// Compress file reads
const compressor = new FileReadCompressor()
const result = await compressor.compress({
  content: readFile('src/main.ts'),
  filePath: 'src/main.ts',
  language: 'typescript'
})
// result.content → compressed output (91% smaller)
// result.metadata.savings → 0.91

// Route to correct compressor
const router = new ToolRouter()
const route = router.route({ type: 'file', content: '...' })
// route.compressor → 'file-read'
// route.confidence → 0.95

// Learn from patterns
const miner = new PatternMiner()
miner.record({ type: 'file-read', input: { file: 'a.ts' }, success: true })
const patterns = miner.getPatterns() // persisted to disk

// Auto-correct text
const correct = new AutoCorrect()
const fixed = correct.correct('teh quick brown fox')
// fixed → 'the quick brown fox'

// Session caching
const cache = new SessionCache()
cache.set('key', { content: 'value', metadata: {} })
const hit = cache.get('key') // 75% hit rate

// Semantic web search + fetch
const web = new WebRouter()
const results = await web.search('how to use async await')
const page = await web.fetch('https://example.com/docs')
// page.content → compressed (75% smaller)
// page.semantic → sections, code examples, key points
```

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    User / AI Agent                        │
│                                                          │
│  "read src/index.ts"    "grep TODO"    "git diff"       │
└─────────────────┬────────────────────┬──────────────────┘
                  │                    │
┌─────────────────▼────────────────────▼──────────────────┐
│              make-laten MCP Server (18 tools)            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Compress │  │  Route   │  │  Cache   │  │ Learn  │ │
│  │ Layer    │  │  Layer   │  │  L1/L2   │  │ Layer  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │              │             │      │
│  ┌────▼──────────────▼──────────────▼─────────────▼───┐ │
│  │              Correct Layer                          │ │
│  │     (11 built-in rules + custom rules)             │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Web Layer                              │ │
│  │     (DuckDuckGo search + semantic fetch)           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│             Shell Aliases (terminal)                     │
│   mread | mgrep | mdiff | mstatus | msearch | mfetch   │
└─────────────────────────────────────────────────────────┘
```

## Modules

| Module | Description |
|--------|-------------|
| `compress` | File read, grep, git diff, git status compressors |
| `cache` | L1 session cache, L2 cross-session, L3 semantic |
| `graph` | Knowledge graph for operation patterns |
| `route` | Smart routing between compression strategies |
| `tool` | Tool router with pattern matching |
| `adapter` | Agent adapters (9+ agents) |
| `learn` | Pattern mining and failure learning (persisted) |
| `correct` | Auto-correction engine (11 default rules) |
| `web` | Web search, fetch, semantic extraction |
| `middleware` | Middleware pipeline with chain execution |
| `plugin` | Plugin system with lifecycle |
| `security` | Rate limiter |
| `logging` | Structured logger |
| `error` | Error handler with suggestions |
| `metrics` | Counters, gauges, histograms |
| `session` | Session manager with timeout |
| `mcp` | MCP server with 18 tools |

## Data Persistence

Learn and correct data persist to `~/.make-laten/`:

```
~/.make-laten/
├── patterns.json    # Usage patterns
├── failures.json    # Failure records + suggestions
└── corrections.json # Custom correction rules
```

## Development

```bash
git clone https://github.com/sukirman1901/make-laten.git
cd make-laten
npm install
npm test              # 223 tests passing
npm run build         # Build CJS + ESM + MCP
npm run typecheck     # Type check
npm run benchmark     # Run benchmark
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing`)
3. Write tests first (`tests/`)
4. Implement feature (`src/`)
5. Run `npm test` — all 223 tests must pass
6. Run `npm run typecheck` — must be clean
7. Submit PR

## License

MIT © [Sukirman](https://github.com/sukirman1901)
