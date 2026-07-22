# make-laten — Design Spec

**Date:** 2026-07-22
**Status:** Draft
**Author:** make-laten team

---

## Overview

**make-laten** is a universal all-in-one efficiency skill/plugin for 30+ AI coding agents. It reduces token usage, decreases latency, and improves reliability across the full developer workflow — coding, web search, file operations, terminal, and planning.

**Key differentiator:** Unlike existing tools that focus on one area (Ponytail = code output, RTK = CLI output, Caveman = agent speech, Headroom = context compression), make-laten combines all four optimization layers into a single composable architecture with a knowledge graph backend.

**Target agents:** Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Cline, Copilot, OpenCode, OpenClaw, Pi, Hermes, Devin, Amp, Jules, and 15+ others.

---

## Architecture

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
│  │                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│    │
│  │  │  COMPRESS   │  │   ROUTE     │  │   CACHE     ││    │
│  │  │  Layer      │  │   Layer     │  │   Layer     ││    │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤│    │
│  │  │ Input comp  │  │ Tool router │  │ L1: Session ││    │
│  │  │ Output comp │  │ Strategy    │  │ L2: Cross   ││    │
│  │  │ Reasoning   │  │ Semantic    │  │ L3: Semantic││    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘│    │
│  │                                                      │    │
│  │  ┌─────────────────────────────────────────────────┐│    │
│  │  │              LEARN Layer                         ││    │
│  │  ├─────────────────────────────────────────────────┤│    │
│  │  │ Pattern Mining | Failure Learning | Auto-Correct││    │
│  │  └─────────────────────────────────────────────────┘│    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│  ┌───────────────────────────┴─────────────────────────┐    │
│  │              Knowledge Graph (SQLite)                 │    │
│  │  Nodes: files, commands, patterns, failures, sessions│    │
│  │  Edges: compressed_to, depends_on, related_to, ...   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Compress Layer

**Goal:** Reduce tokens at every touchpoint — input, output, and reasoning.

### Input Compressors

| Tool Call | Before | After | Savings |
|-----------|--------|-------|---------|
| `cat file.ts` (2000 lines) | 2000 lines full | 200 lines (signatures + key logic) | 90% |
| `git diff` (500 lines) | 500 lines unified | 50 lines (condensed hunks) | 90% |
| `grep -r "TODO" .` (300 matches) | 300 matches | 30 grouped by file | 90% |
| `ls -la src/` (40 entries) | 40 entries | 10 lines (tree format) | 75% |
| Web fetch article (10k tokens) | 10000 tokens | 2000 tokens (summary) | 80% |

### Output Compressors

| Agent Says | Before | After | Savings |
|------------|--------|-------|---------|
| "Sure! I'd be happy to help..." | 69 tokens | 0 (drop) | 100% |
| Re-printing code just shown | 200 tokens | 0 (drop) | 100% |
| "Let me think about this..." | 50 tokens | 0 (drop) | 100% |
| Error explanation | 100 tokens | 30 tokens (terse) | 70% |

### Reasoning Compressors

| Pattern | Strategy |
|---------|----------|
| Agent re-reads same file | Return cached IR, skip re-parse |
| Agent re-runs same command | Return cached result |
| Agent re-plans same task | Skip, use existing plan |
| Subagent does overlapping work | Merge or cancel redundant subagent |

### Reversibility (CCR)

Every compressed output has a retrieval path:

```typescript
// Compressed output includes retrieval reference
"payment.ts: 380 lines. Exports: processPayment(), validateCard().
 [make-laten_retrieve src/payment.ts for full content]"

// Agent can retrieve on demand
make-laten_retrieve("src/payment.ts") → full 3000 lines
make-laten_retrieve("src/payment.ts", "processPayment") → 50 lines
```

**Confidence scoring:** Each compressed output has a confidence score. If confidence < 0.7, return original without compression.

---

## Layer 2: Route Layer

**Goal:** Select cheapest/fastest tool for each operation.

### Tool Router

| Agent Mau | Router Decision | Savings |
|-----------|----------------|---------|
| `cat file.ts` | → `make-laten read` | 90% |
| `grep "TODO" .` | → `make-laten grep` | 90% |
| `git diff` | → `make-laten git diff` | 90% |
| `cargo test` | → `make-laten test` | 90% |
| Web search | → `make-laten.search` (cached) | 80% |

### Strategy Router

```
Input arrives
    ↓
[1] Check graph cache → hit? return cached
    ↓ miss
[2] Detect content type → Code/JSON/Text/Binary
    ↓
[3] Check confidence → high? compress, low? return original
    ↓
[4] Apply compression → store in graph → return compressed
```

### Semantic Tool Abstraction

Unifies different agent tools into one semantic interface:

| Agent | Native Tool | make-laten Maps To |
|-------|------------|-------------------|
| Claude Code | `WebFetch` | `make-laten.fetch` |
| Claude Code | `WebSearch` | `make-laten.search` |
| Cursor | `@web_search` | `make-laten.search` |
| Gemini CLI | `web_search` | `make-laten.search` |
| Codex | `browser.search` | `make-laten.search` |
| Any (Exa) | `exa.search` | `make-laten.search` |

### Hybrid Web Mode

- **Inject Mode (default):** Intercept agent's existing tools, compress, cache
- **Own Mode (on-demand):** make-laten's own search/fetch with semantic extraction
- **Smart Router:** Auto-decide based on agent capabilities

---

## Layer 3: Cache Layer

**Goal:** Store reusable results, reduce redundant computation across sessions.

### 3-Tier Cache

| Tier | Scope | Storage | TTL | Use Case |
|------|-------|---------|-----|----------|
| **L1: Session** | 1 session | Memory (Map) | Session end | Same file read multiple times |
| **L2: Cross-Session** | All sessions | Graph (SQLite) | Configurable | Same file accessed from different sessions |
| **L3: Semantic** | Global | Graph + embeddings | Configurable | Similar content (not exact match) |

### Cache Decision Flow

```
Agent request
    ↓
L1 (session) hit? → return (0 tokens, <1ms)
    ↓ miss
L2 (cross-session) hit? → return (0 tokens, <5ms)
    ↓ miss
L3 (semantic) hit? → return (0 tokens, <50ms)
    ↓ miss
Compress + store in all tiers → return compressed
```

### Cache Invalidation

| Trigger | Action |
|---------|--------|
| File modified | Invalidate L1 + L2 for that file, keep L3 |
| Git commit | Invalidate L1 + L2 for changed files |
| Session end | Clear L1, keep L2 + L3 |
| TTL expired | Remove from all tiers |
| Manual | `make-laten cache clear` |

---

## Layer 4: Learn Layer

**Goal:** Mine patterns from usage, auto-correct, get smarter over time.

### Pattern Mining

Track command sequences, file access patterns, error→fix patterns:

| Pattern | Trigger | Action | Confidence |
|---------|---------|--------|------------|
| Commit workflow | `git status` | Pre-fetch `git diff` | 0.95 |
| Payment files | `Read("payment.ts")` | Pre-cache `stripe.ts` | 0.88 |
| Missing dep | `Cannot find module` | Suggest `npm install` | 0.92 |
| Test failure | `FAIL src/test.ts` | Pre-read test file | 0.85 |

### Failure Learning

Record failures, track resolutions, suggest fixes on recurrence:

```
Agent tries: "npm test"
  → Error: "Cannot find module 'vitest'"
  → Failure recorded in graph

Next time same error:
  → Graph lookup: failure pattern found
  → Suggestion: "Try: npm install vitest"
```

### Auto-Correction Engine

Based on patterns + failures, automatically:
- Update route rules
- Update compression strategies
- Update cache TTLs
- Add pre-fetch rules

---

## Agent Adapter Layer

**Goal:** One install, works across all agents.

### Adapter Types

| Type | How it works | Agents |
|------|-------------|--------|
| **Hook** | Intercept PreToolUse/PostToolUse events | Claude Code, Codex, Gemini CLI |
| **Plugin** | Native plugin API | OpenCode, OpenClaw |
| **Rules** | Inject into rules/config file | Cursor, Windsurf, Cline, Copilot |
| **Proxy** | HTTP proxy for API calls | Any agent with proxy support |
| **MCP** | MCP server tools | Any MCP-compatible agent |

### Universal Installer

```bash
# One command installs for all detected agents
curl -fsSL https://raw.githubusercontent.com/make-laten/make-laten/main/install.sh | bash

# Or via npm
npm install -g make-laten
```

### Per-Agent Installation

```bash
# Claude Code
/plugin marketplace add make-laten/make-laten
/plugin install make-laten@make-laten

# Codex
codex plugin marketplace add make-laten/make-laten

# Gemini CLI
gemini extensions install https://github.com/make-laten/make-laten

# Cursor / Windsurf / Cline
npx skills add make-laten/make-laten -a cursor

# OpenCode
{ "plugin": ["@make-laten/make-laten"] }
```

---

## Knowledge Graph

**Backend:** SQLite (via better-sqlite3) + custom graph queries

### Node Types

```typescript
interface GraphNode {
  id: string
  type: 'file' | 'command' | 'ir' | 'pattern' | 'session' | 'agent' | 'cache' | 'semantic'
  content: string
  original?: string
  embedding?: number[]  // for semantic search
  metadata: {
    createdAt: number
    accessedAt: number
    accessCount: number
    confidence: number
    source: string
    ttl?: number
  }
}
```

### Edge Types

```typescript
interface GraphEdge {
  target: string
  type: 'compressed_to' | 'depends_on' | 'related_to' | 
        'used_by' | 'followed_by' | 'pattern' | 'cached'
  weight: number
  metadata?: Record<string, any>
}
```

### Graph Queries

```typescript
// Direct retrieval
graph.get("file:payment.ts") → Node

// Relationship traversal
graph.traverse("file:payment.ts", "related_to") → [stripe.ts, validation.ts]

// Pattern discovery
graph.findPatterns("file:payment.ts") → ["payment-flow", "checkout-sequence"]

// Semantic search
graph.search("payment processing") → [payment.ts, stripe.ts, checkout-flow]

// Compression recommendation
graph.recommendCompression("file:payment.ts") → {
  strategy: "AST-signatures",
  confidence: 0.92,
  reason: "TypeScript file, previously compressed with 90% savings"
}
```

---

## Configuration

**File:** `~/.make-laten/config.toml`

```toml
[general]
default_mode = "balanced"  # aggressive | balanced | conservative
verbose = false

[compress]
input_enabled = true
output_enabled = true
reasoning_enabled = true
confidence_threshold = 0.7

[cache]
l1_enabled = true
l2_enabled = true
l3_enabled = true
l2_ttl = 86400  # 24 hours
l3_ttl = 21600  # 6 hours
max_size_mb = 500

[route]
auto_rewrite = true
smart_routing = true

[learn]
pattern_mining = true
failure_learning = true
auto_correction = true

[web]
search_backend = "duckduckgo"  # duckduckgo | exa | tavily | searxng
fetch_timeout = 10000
cache_freshness = "documentation:86400,api:43200,blog:3600"
```

---

## Estimated Savings

| Metric | Without make-laten | With make-laten | Savings |
|--------|-------------------|-----------------|---------|
| Input tokens (30-min session) | ~120,000 | ~50,000 | 58% |
| Output tokens (30-min session) | ~30,000 | ~15,000 | 50% |
| Total tokens | ~150,000 | ~65,000 | 57% |
| Latency (avg per operation) | 200ms | 80ms | 60% |
| Cost (per session, Opus) | ~$4.50 | ~$1.95 | 57% |

---

## Competitive Comparison

| Feature | make-laten | Ponytail | RTK | Caveman | Headroom |
|---------|-----------|---------|-----|---------|----------|
| Token savings (total) | 57% | 54% (code) | 80% (CLI) | 65% (output) | 50-70% |
| Latency reduction | 60% | Low | Low | Low | Medium |
| Knowledge graph | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cross-session memory | ✅ | ❌ | ❌ | ❌ | ✅ |
| Pattern learning | ✅ | ❌ | ❌ | ❌ | Basic |
| Web search optimization | ✅ | ❌ | ❌ | ❌ | ✅ |
| Reversible compression | ✅ | ❌ | ❌ | ❌ | ✅ |
| Agent count | 30+ | 20+ | 15+ | 30+ | 15+ |
| Install complexity | Low | Low | Low | Low | Medium |

---

## Implementation Phases

### Phase 1: Core (Week 1-2)
- [ ] Project setup (TypeScript, build, test)
- [ ] Compress Layer: input compressors (file read, grep, git)
- [ ] Cache Layer: L1 (session) + L2 (graph basic)
- [ ] Knowledge Graph: SQLite schema + basic CRUD

### Phase 2: Routing (Week 3-4)
- [ ] Route Layer: tool router + strategy router
- [ ] Semantic Tool Abstraction: unified interface
- [ ] Agent Adapters: Claude Code, Codex, Gemini CLI

### Phase 3: Intelligence (Week 5-6)
- [ ] Learn Layer: pattern mining + failure learning
- [ ] Auto-Correction Engine
- [ ] Cache Layer: L3 (semantic with embeddings)
- [ ] Output compressors

### Phase 4: Scale (Week 7-8)
- [ ] More agent adapters: Cursor, Windsurf, Cline, Copilot
- [ ] Web search/fetch integration
- [ ] Dashboard + analytics
- [ ] Performance optimization

---

## Success Criteria

1. **Token savings:** ≥50% total tokens per session
2. **Latency reduction:** ≥30% avg latency per operation
3. **Agent compatibility:** 30+ agents supported
4. **Install time:** <30 seconds
5. **Reliability:** 99.9% uptime, graceful degradation
6. **Learning:** Measurable improvement after 1 week of use

---

## Open Questions

1. ML model for text compression — bundle or use external API?
2. Embedding model for semantic cache — local (ONNX) or cloud?
3. Cross-device sync — support or not in v1?
4. Team features — shared graph across team members?
