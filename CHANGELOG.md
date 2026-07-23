# Changelog

## Unreleased

### Added
- Tiered file read: overview with SymbolIR + zero-loss `make-laten-read-detail` (MCP) and `make-laten read --symbol/--range/--export` (CLI)
- `SessionIRStore` for session IR pointers
- Graph helpers `upsertFileIR` / `invalidateFileIR` (`file` ↔ `ir`)
- Learn events: `overview_read`, `detail_expand`

### Fixed
- Learn layer tests isolated from `~/.make-laten` persistence
- CLI `benchmark` no longer auto-runs on every command import
- `FailureLearner.record` type misuse in MCP/benchmark
- `git-status` compressor: passthrough when grouped format doesn't save space

### Changed
- Benchmark now uses tiktoken (cl100k_base) for accurate token counting
- Benchmark savings: 85% tokens (was 78% chars estimate)

## 1.0.0 (2026-07-22)

### Features

**Core**
- Knowledge graph with SQLite persistence
- Compress layer: file-read, grep, git-diff, output compressors
- Cache system: L1 session, L2 cross-session, L3 semantic (cosine similarity)
- Smart routing between compression strategies
- Tool router with pattern matching

**Routing (Phase 2)**
- Strategy router with fallback chains
- Adapter system for Claude Code, Codex, Gemini CLI

**Intelligence (Phase 3)**
- Pattern miner for operation tracking
- Failure learner with recovery suggestions
- Auto-correction engine (regex + string rules)
- L3 semantic cache with embedding search
- Output compressor with section preservation

**Production (Phase 4)**
- Middleware pipeline with chain execution
- Plugin system with lifecycle management
- Rate limiter with sliding window
- Structured logger with level filtering
- Error handler with categorization and suggestions
- Metrics collector (counters, gauges, histograms)
- Session manager with timeout expiration

**Web Integration (RFC 005)**
- DuckDuckGo search backend
- Web fetch with semantic extraction
- HTML parser for sections, code examples, key points
- Web content compressor for LLM consumption
- Smart router with caching

**Agent Adapter Protocol (RFC 004)**
- Agent detector (Claude Code, Codex, Gemini, Cursor, Windsurf, Cline, Copilot)
- Hook adapter with PreToolUse/PostToolUse
- Rules adapter for Cursor/Windsurf/Cline/Copilot
- Auto-installer for detected agents

**CLI**
- `make-laten read <file>` — compressed file read
- `make-laten grep <pattern>` — compressed grep
- `make-laten git diff` — compressed git diff
- `make-laten git status` — git status summary
- `make-laten search <query>` — web search
- `make-laten fetch <url>` — web fetch + compress
- `make-laten cache stats/clear` — cache management
- `make-laten install` — adapter installation

### Testing

- 201 tests across 61 test files
- TypeScript strict mode
- CJS + ESM dual build
