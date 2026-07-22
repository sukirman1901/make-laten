# make-laten

Universal efficiency toolkit for AI coding agents — compress, cache, route, and optimize token usage.

## What it does

make-laten reduces token consumption when working with AI coding agents by compressing outputs, caching results, and routing operations intelligently.

**Token savings:** 60-90% reduction across file reads, grep, git diff, and web fetches.

## Install

```bash
npm install -g make-laten
```

## CLI Commands

```bash
# Compressed file read (89% savings)
make-laten read src/index.ts

# Compressed grep with file grouping
make-laten grep "TODO" src/

# Compressed git diff
make-laten git diff
make-laten git diff --staged
make-laten git status

# Web search (via DuckDuckGo)
make-laten search "typescript generics"

# Web fetch + semantic extraction + compression
make-laten fetch https://docs.example.com

# Cache management
make-laten cache stats
make-laten cache clear

# Install adapters for detected agents
make-laten install
make-laten install --status
make-laten install --uninstall
```

## Programmatic Usage

```typescript
import {
  FileReadCompressor,
  GrepCompressor,
  GitDiffCompressor,
  SemanticCache,
  WebRouter,
  getAdapter,
  createInstaller
} from 'make-laten'

// Compress file reads
const compressor = new FileReadCompressor()
const result = await compressor.compress({
  content: readFile('src/main.ts'),
  filePath: 'src/main.ts',
  language: 'typescript'
})

// Semantic web search
const web = new WebRouter()
const results = await web.search('how to use async await')
const page = await web.fetch('https://example.com/docs')

// Cache with cosine similarity
const cache = new SemanticCache()
cache.set('key1', { content: 'docs', embedding: [0.1, 0.2], metadata: {} })
const similar = cache.search([0.1, 0.2], 0.8)

// Agent adapters
const installer = createInstaller()
await installer.install()
```

## Modules

| Module | Description |
|--------|-------------|
| `compress` | File read, grep, git diff, output compressors |
| `cache` | L1 session cache, L2 cross-session, L3 semantic (cosine similarity) |
| `graph` | Knowledge graph for operation patterns |
| `route` | Smart routing between compression strategies |
| `tool` | Tool router with pattern matching |
| `adapter` | Agent adapters (Claude Code, Codex, Gemini, Cursor, etc.) |
| `learn` | Pattern mining and failure learning |
| `correct` | Auto-correction engine |
| `web` | Web search, fetch, semantic extraction |
| `middleware` | Middleware pipeline |
| `plugin` | Plugin system with lifecycle |
| `security` | Rate limiter |
| `logging` | Structured logger |
| `error` | Error handler with suggestions |
| `metrics` | Counters, gauges, histograms |
| `session` | Session manager with timeout |

## Supported Agents

make-laten works with 7+ AI coding agents:

- **Claude Code** — hook-based interception
- **Codex** — hook-based interception
- **Gemini CLI** — hook-based interception
- **Cursor** — rules injection
- **Windsurf** — rules injection
- **Cline** — rules injection
- **GitHub Copilot** — rules injection

```bash
# Auto-detect and configure
make-laten install
```

## Development

```bash
npm install
npm test              # Run 201 tests
npm run build         # Build CJS + ESM
npm run typecheck     # Type check
```

## License

MIT
