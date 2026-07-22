# RFC 001: make-laten Architecture Overview

**Status:** Draft
**Author:** make-laten team
**Date:** 2026-07-22
**Related:** [Design Spec](../specs/2026-07-22-make-laten-design.md)

---

## Summary

Propose a layered composable architecture for make-laten — a universal efficiency skill/plugin for 30+ AI coding agents that reduces token usage, decreases latency, and improves reliability.

---

## Motivation

Current efficiency tools focus on single areas:

| Tool | Focus | Limitation |
|------|-------|-----------|
| Ponytail | Code output minimization | Only affects what agent writes |
| RTK | CLI output compression | Only affects shell commands |
| Caveman | Agent speech compression | Only affects output text |
| Headroom | Context compression | No knowledge graph, limited learning |

**Problem:** Developers using AI agents face:
1. **High token costs** — verbose agent output + large file reads + redundant operations
2. **High latency** — repeated file reads, web fetches, command executions
3. **No learning** — agent doesn't remember past sessions or patterns
4. **Fragmented tools** — need multiple tools for different optimization areas

**Solution:** make-laten combines all optimization strategies into one composable architecture with a knowledge graph backend.

---

## Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    make-laten Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Agent Adapter Layer                      │    │
│  │  Claude Code | Codex | Gemini | Cursor | 30+ others  │    │
│  └───────────────────────────┬─────────────────────────┘    │
│                              │                               │
│  ┌───────────────────────────┴─────────────────────────┐    │
│  │                    make-laten core                    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│    │
│  │  │  COMPRESS   │  │   ROUTE     │  │   CACHE     ││    │
│  │  │  Layer      │  │   Layer     │  │   Layer     ││    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘│    │
│  │  ┌─────────────────────────────────────────────────┐│    │
│  │  │              LEARN Layer                         ││    │
│  │  └─────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│  ┌───────────────────────────┴─────────────────────────┐    │
│  │              Knowledge Graph (SQLite)                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Composable:** Each layer can be enabled/disabled independently
2. **Reversible:** All compression is reversible via retrieval
3. **Persistent:** Knowledge graph survives across sessions
4. **Agent-agnostic:** Works with any AI coding agent
5. **Local-first:** No cloud dependency for core functionality

---

## Layer Specifications

### 1. Compress Layer

**Responsibility:** Reduce tokens at input, output, and reasoning touchpoints.

**Components:**
- Input Compressors: file read, grep, git, web fetch
- Output Compressors: drop ceremony, terse errors, skip code reprint
- Reasoning Compressors: skip redundant reads, reuse plans

**Key interface:**
```typescript
interface Compressor {
  compress(input: unknown, context: CompressContext): Promise<CompressedResult>
  decompress(compressed: CompressedResult): Promise<unknown>
  confidence(input: unknown): number
}
```

### 2. Route Layer

**Responsibility:** Select cheapest/fastest tool for each operation.

**Components:**
- Tool Router: maps agent commands to make-laten equivalents
- Strategy Router: selects compression strategy per content type
- Semantic Abstraction: unifies different agent tools into one interface

**Key interface:**
```typescript
interface Router {
  route(command: string, context: RouteContext): Promise<RouteDecision>
  registerRule(rule: RouteRule): void
  getStats(): RouteStats
}
```

### 3. Cache Layer

**Responsibility:** Store reusable results across sessions.

**Components:**
- L1 Session Cache: in-memory, ephemeral
- L2 Cross-Session Cache: graph-based, persistent
- L3 Semantic Cache: embedding similarity, fuzzy matching

**Key interface:**
```typescript
interface Cache {
  get(key: string): Promise<CacheEntry | null>
  set(key: string, value: CacheEntry, options?: CacheOptions): Promise<void>
  invalidate(pattern: string): Promise<void>
  stats(): CacheStats
}
```

### 4. Learn Layer

**Responsibility:** Mine patterns, learn from failures, auto-correct.

**Components:**
- Pattern Mining: track command sequences, file access patterns
- Failure Learning: record errors, track resolutions
- Auto-Correction: update rules based on patterns

**Key interface:**
```typescript
interface Learner {
  track(event: LearningEvent): Promise<void>
  predict(context: PredictContext): Promise<Prediction | null>
  correct(rule: CorrectionRule): Promise<void>
}
```

### 5. Knowledge Graph

**Responsibility:** Store all knowledge in a queryable graph structure.

**Backend:** SQLite via better-sqlite3

**Schema:**
```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  original TEXT,
  embedding BLOB,
  metadata JSON NOT NULL,
  created_at INTEGER NOT NULL,
  accessed_at INTEGER NOT NULL,
  access_count INTEGER DEFAULT 0
);

CREATE TABLE edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  type TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  metadata JSON,
  FOREIGN KEY (source) REFERENCES nodes(id),
  FOREIGN KEY (target) REFERENCES nodes(id)
);

CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_edges_source ON edges(source);
CREATE INDEX idx_edges_target ON edges(target);
CREATE INDEX idx_edges_type ON edges(type);
```

### 6. Agent Adapter Layer

**Responsibility:** Intercept agent tool calls and apply optimizations.

**Adapter types:**
- Hook: PreToolUse/PostToolUse events (Claude Code, Codex, Gemini)
- Plugin: Native plugin API (OpenCode, OpenClaw)
- Rules: Inject into rules file (Cursor, Windsurf, Cline, Copilot)
- Proxy: HTTP proxy (any agent with proxy support)
- MCP: MCP server tools (any MCP-compatible agent)

**Key interface:**
```typescript
interface AgentAdapter {
  name: string
  type: 'hook' | 'plugin' | 'rules' | 'proxy' | 'mcp'
  install(agentPath: string): Promise<void>
  uninstall(agentPath: string): Promise<void>
  intercept(toolCall: ToolCall): Promise<ToolCall | null>
}
```

---

## Data Flow

### Tool Call Interception

```
Agent calls: Read("src/payment.ts")
    │
    ▼
[Adapter] intercepts tool call
    │
    ▼
[Route Layer] check cache
    │ hit? → return cached
    │ miss? → continue
    ▼
[Compress Layer] compress input
    │
    ▼
[Cache Layer] store in graph (L1 + L2 + L3)
    │
    ▼
[Learn Layer] track pattern
    │
    ▼
[Adapter] return compressed to agent
```

### Cross-Session Learning

```
Session 1: Agent reads payment.ts → stripe.ts
    │
    ▼
[Learn Layer] detect pattern: payment → stripe
    │
    ▼
[Graph] store pattern node + edges
    │
    ▼
Session 2: Agent reads payment.ts
    │
    ▼
[Learn Layer] predict: stripe.ts will be needed
    │
    ▼
[Cache Layer] pre-fetch stripe.ts
    │
    ▼
[Agent] stripe.ts already cached (0 tokens)
```

---

## Non-Goals

1. **Replace agent's reasoning** — make-laten optimizes I/O, not thinking
2. **Modify agent's output** — make-laten compresses input, agent controls output
3. **Provide LLM API** — make-laten is a tool, not a model
4. **Centralized deployment** — local-first, optional team features

---

## Alternatives Considered

### Alternative 1: Hook-Only (RTK-style)

**Approach:** Binary proxy that intercepts shell commands only.

**Pros:** Simple, transparent, zero config
**Cons:** Only optimizes shell output, no learning, no web optimization

**Rejected because:** Too narrow scope. Doesn't cover full workflow.

### Alternative 2: Skill-Only (Caveman-style)

**Approach:** Skill file that tells agent to be terse.

**Pros:** Simple install, works everywhere
**Cons:** Only optimizes output text, no input optimization, no caching

**Rejected because:** Too narrow scope. Doesn't optimize input or caching.

### Alternative 3: Proxy-Only (Headroom-style)

**Approach:** Full proxy with ML compression.

**Pros:** Comprehensive input/output optimization
**Cons:** Complex, requires ML model, no learning layer

**Rejected because:** Missing learning and knowledge graph. Closest alternative but lacks intelligence.

---

## Implementation Plan

See [Design Spec - Implementation Phases](../specs/2026-07-22-make-laten-design.md#implementation-phases)

---

## Open Questions

1. Should the knowledge graph support real-time sync across devices?
2. How to handle conflicting patterns from different agents?
3. What embedding model to use for semantic cache? (local ONNX vs cloud API)
4. Should we bundle an ML model for text compression or use external API?

---

## References

- [Ponytail](https://github.com/DietrichGebert/ponytail) — code output minimization
- [RTK](https://github.com/rtk-ai/rtk) — CLI output compression
- [Caveman](https://github.com/JuliusBrussee/caveman) — agent speech compression
- [Headroom](https://github.com/headroomlabs-ai/headroom) — context compression
- [BrowserIR](https://github.com/BrowserIR/BrowserIR) — semantic browser understanding
