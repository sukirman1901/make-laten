# make-laten

[![npm version](https://img.shields.io/npm/v/make-laten.svg)](https://www.npmjs.com/package/make-laten)
[![license](https://img.shields.io/npm/l/make-laten.svg)](https://github.com/sukirman1901/make-laten/blob/main/LICENSE)
[![tests](https://img.shields.io/badge/tests-201%20passing-brightgreen)]()

Universal efficiency toolkit for AI coding agents — compress, cache, and optimize token usage across all platforms.

## What it does

make-laten reduces token consumption when working with AI coding agents by compressing outputs, caching results, and routing operations intelligently.

```
User → AI Agent → make-laten intercept → compress (60-90% savings) → return
```

**Token savings per command:**

| Command | Savings | Description |
|---------|---------|-------------|
| `read` | **65-92%** | Compressed file read — exports, classes, functions only |
| `grep` | **70%** | Grouped by file with line numbers |
| `git diff` | **61%** | Condensed hunks, only changes shown |
| `git status` | **50-65%** | Status summary |
| `fetch` | **75%** | Web content with semantic extraction |

## Quick Start

**One command to set up everything:**

```bash
npx make-laten init --all
```

This auto-detects your installed AI agents and configures MCP for each one.

**Or install globally first:**

```bash
npm install -g make-laten
make-laten init --all
```

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

## CLI Commands

```bash
# File operations
make-laten read src/index.ts         # 89% savings
make-laten grep "TODO" src/          # grouped by file
make-laten grep "export" . --ignore ts

# Git operations
make-laten git diff                  # 60% savings
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

## MCP Server

make-laten includes an MCP server that auto-compresses tool outputs for any MCP-compatible agent.

**Tools provided:**

| Tool | Description |
|------|-------------|
| `make-laten-read` | Compressed file read |
| `make-laten-grep` | Grouped grep results |
| `make-laten-git-diff` | Compressed git diff |
| `make-laten-git-status` | Git status summary |
| `make-laten-cache-stats` | Cache performance |

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
  RateLimiter,
  Logger,
  Pipeline
} from 'make-laten'

// Compress file reads
const compressor = new FileReadCompressor()
const result = await compressor.compress({
  content: readFile('src/main.ts'),
  filePath: 'src/main.ts',
  language: 'typescript'
})
// result.content → compressed output (89% smaller)
// result.metadata.savings → 0.89

// Semantic web search + fetch
const web = new WebRouter()
const results = await web.search('how to use async await')
const page = await web.fetch('https://example.com/docs')
// page.content → compressed (75% smaller)
// page.semantic → sections, code examples, key points

// Middleware pipeline
const pipeline = new Pipeline()
pipeline.use(async (ctx, next) => {
  ctx.metadata.enhanced = true
  return next(ctx)
})

// Rate limiting
const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 })
if (limiter.allow('user1')) { /* proceed */ }

// Structured logging
const logger = new Logger({ level: 'info', handler: (entry) => console.log(entry) })
logger.info('Processing', { file: 'src/main.ts' })
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
│              make-laten MCP Server                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Compress │  │  Cache   │  │   Web    │              │
│  │  Layer    │  │  L1/L2/L3│  │  Router  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│  ┌────▼──────────────▼──────────────▼─────┐             │
│  │           Knowledge Graph               │             │
│  │     (patterns, failures, learning)      │             │
│  └────────────────────────────────────────┘             │
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
| `compress` | File read, grep, git diff, output compressors |
| `cache` | L1 session cache, L2 cross-session, L3 semantic (cosine similarity) |
| `graph` | Knowledge graph for operation patterns |
| `route` | Smart routing between compression strategies |
| `tool` | Tool router with pattern matching |
| `adapter` | Agent adapters (9+ agents) |
| `learn` | Pattern mining and failure learning |
| `correct` | Auto-correction engine |
| `web` | Web search, fetch, semantic extraction |
| `middleware` | Middleware pipeline with chain execution |
| `plugin` | Plugin system with lifecycle |
| `security` | Rate limiter |
| `logging` | Structured logger |
| `error` | Error handler with suggestions |
| `metrics` | Counters, gauges, histograms |
| `session` | Session manager with timeout |
| `mcp` | MCP server for AI agent integration |

## Development

```bash
git clone https://github.com/sukirman1901/make-laten.git
cd make-laten
npm install
npm test              # 201 tests passing
npm run build         # Build CJS + ESM + MCP
npm run typecheck     # Type check
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing`)
3. Write tests first (`tests/`)
4. Implement feature (`src/`)
5. Run `npm test` — all 201 tests must pass
6. Run `npm run typecheck` — must be clean
7. Submit PR

## License

MIT © [Sukirman](https://github.com/sukirman1901)
