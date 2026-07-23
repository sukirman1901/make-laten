# Dashboard Design

**Goal:** Visual dashboard for make-laten — token usage, compression stats, code graph, activity feed. Accessed via `make-laten dashboard` → opens localhost in browser.

**Approach:** Standalone CLI + Browser. MCP server auto-logs stats, dashboard reads them.

---

## Architecture

```
MCP Server (stdio) → auto-log to ~/.make-laten/stats.json
                          ↓
make-laten dashboard → HTTP server localhost:3456
                    ← reads stats.json + patterns.json + graph.json
                    ← serves single-page HTML dashboard
                    ← opens browser automatically
```

## Data Collection

### stats.json (new)

MCP server logs every tool call:

```json
{
  "requests": [
    {
      "id": "req_123",
      "tool": "read",
      "timestamp": 1784800000000,
      "inputTokens": 4500,
      "outputTokens": 320,
      "cachedTokens": 0,
      "compressionRatio": 0.91,
      "savings": 4180,
      "model": "mimo-v2.5",
      "success": true
    }
  ],
  "summary": {
    "totalRequests": 442,
    "totalInputTokens": 45923907,
    "totalOutputTokens": 168936,
    "totalCachedTokens": 39165630,
    "estimatedCost": 13.14,
    "avgCompression": 0.85,
    "toolUsage": { "read": 150, "grep": 80 }
  }
}
```

### Token counting

Use tiktoken (cl100k_base) already in project. Count tokens from request/response JSON.

### Cost estimation

| Model | Input/1M | Output/1M |
|-------|----------|-----------|
| mimo-v2.5 | $0.07 | $0.28 |
| glm-5.1 | $0.14 | $0.56 |

### Existing data sources

| File | Content |
|------|---------|
| `~/.make-laten/patterns.json` | Operation patterns, counts |
| `~/.make-laten/failures.json` | Error records |
| `~/.make-laten/corrections.json` | Custom rules |
| `.make-laten/graph.json` | Code graph nodes/edges |

## UI Design

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  make-laten dashboard                          v1.4.1  │
├──────────────┬──────────────────────────────────────────┤
│  SIDEBAR     │   MAIN CONTENT                          │
│              │                                          │
│  📊 Overview │   Summary cards + charts                 │
│  📈 Tokens   │   Token usage table + filters            │
│  🗜️ Compress │   Per-tool compression stats             │
│  🧠 Learn    │   Patterns, failures, corrections        │
│  📉 Cache    │   Hit rate, cache stats                  │
│  🔗 Graph    │   Force-directed code graph (d3-force)   │
│  📋 Activity │   Request timeline + error log           │
└──────────────┴──────────────────────────────────────────┘
```

### Pages

1. **Overview** — Summary cards (total requests, saved tokens, cost), token usage area chart, tool usage bar chart
2. **Tokens** — Per-request table: model, input/output/cached tokens, timestamp. Filter by model, date
3. **Compress** — Per-tool compression ratios, before/after comparison
4. **Learn** — Patterns list (type, count, confidence), failure records, correction rules
5. **Cache** — Hit rate gauge, cache size, recent hits/misses
6. **Graph** — Force-directed graph with d3-force. Nodes = files/functions/classes. Edges = defines/calls/imports. Click to expand, search symbols
7. **Activity** — Timeline of recent requests, error log

### Tech Stack

- Single HTML file (inline CSS/JS, no build step)
- Chart.js (CDN) for charts
- d3-force (CDN) for graph visualization
- CSS variables for dark mode (default) + light mode toggle
- Responsive layout (CSS Grid + Flexbox)

## CLI Commands

```bash
make-laten dashboard              # start server + open browser
make-laten dashboard --port 8080  # custom port
make-laten dashboard --no-open    # don't auto-open browser
make-laten stats                  # quick text stats (no browser)
```

## Implementation Tasks

| Task | Files | Description |
|------|-------|-------------|
| 1 | `src/stats/collector.ts` | StatsCollector — log tool calls to stats.json |
| 2 | `src/stats/types.ts` | Types for stats data |
| 3 | `src/mcp/server.ts` | Add stats logging to all handlers |
| 4 | `src/dashboard/server.ts` | HTTP server — serve HTML + API endpoints |
| 5 | `src/dashboard/index.html` | Single-page dashboard UI |
| 6 | `src/cli/commands/dashboard.ts` | CLI command for `make-laten dashboard` |
| 7 | `src/cli/commands/stats.ts` | CLI command for `make-laten stats` |
| 8 | Integration test | End-to-end test |
| 9 | Documentation + release | README, SKILL.md update |
