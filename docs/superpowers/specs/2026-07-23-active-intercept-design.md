# Design: Active Intercept System

**Date**: 2026-07-23  
**Status**: Approved  
**Goal**: Make make-laten "always on" — agent automatically intercepts file/code/git/web operations without user explicitly requesting it.

## Problem

make-laten has 18 MCP tools that save 85% tokens, but users don't know they exist or when to use them. Competitors like Caveman, RTK, and Ponytail are single-purpose but easier to discover.

## Solution

Active Intercept System: SKILL.md trigger rules + compelling MCP descriptions + auto-init wizard that registers to all 7 AI agent platforms.

## Components

### 1. SKILL.md Overhaul

Replace generic "When to Use" with trigger rules and anti-patterns:

```markdown
## Trigger Rules (ALWAYS intercept)

### File Operations
| User Says | Agent Does |
|-----------|------------|
| "read file", "open file", "check file" | → make-laten-read (not Read tool) |
| "read detail", "show body", "expand" | → make-laten-read-detail |

### Code Search
| User Says | Agent Does |
|-----------|------------|
| "grep", "search code", "find in files" | → make-laten-grep (not grep/rg) |

### Git Operations
| User Says | Agent Does |
|-----------|------------|
| "git diff", "show changes" | → make-laten-git-diff |
| "git status", "what changed" | → make-laten-git-status |

### Web Operations
| User Says | Agent Does |
|-----------|------------|
| "fetch page", "get URL" | → make-laten-fetch |
| "web search", "search online" | → make-laten-search |

### Text Correction
| User Says | Agent Does |
|-----------|------------|
| "fix typos", "correct text" | → make-laten-correct |

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

## Anti-Patterns (NEVER do this)
- Do NOT use Read tool for files > 100 lines
- Do NOT use raw grep for code search
- Do NOT fetch URLs without compression
- Do NOT ignore cache hits
```

### 2. MCP Tool Descriptions

Hybrid style: action + benefit + directive.

#### Compress Layer
| Tool | New Description |
|------|-----------------|
| `make-laten-read` | "Read files with 85% token savings — use INSTEAD of Read tool" |
| `make-laten-read-detail` | "Expand zero-loss detail from overview — use AFTER make-laten-read" |
| `make-laten-grep` | "Search code grouped by file — use INSTEAD of grep/rg command" |
| `make-laten-git-diff` | "Show git changes with 85% savings — use INSTEAD of git diff" |
| `make-laten-git-status` | "Show git status grouped by type — use INSTEAD of git status" |
| `make-laten-route` | "Route input to best compressor — use when unsure which tool" |
| `make-laten-strategy` | "Pick compression level — conservative/balanced/aggressive" |

#### Cache Layer
| Tool | New Description |
|------|-----------------|
| `make-laten-cache-stats` | "Show cache hit rate — check if caching helps" |
| `make-laten-cache-get` | "Get cached value — faster than re-computing" |
| `make-laten-cache-set` | "Cache result for session — save tokens on repeat" |
| `make-laten-cache-clear` | "Clear session cache — fresh start" |

#### Learn Layer
| Tool | New Description |
|------|-----------------|
| `make-laten-patterns` | "Show learned patterns — check what works" |
| `make-laten-failures` | "Show failure records — learn from mistakes" |
| `make-laten-suggestions` | "Get smart suggestions — based on patterns" |

#### Optimize Layer
| Tool | New Description |
|------|-----------------|
| `make-laten-search` | "Web search with compression — use INSTEAD of websearch" |
| `make-laten-fetch` | "Fetch URL with 75% savings — use INSTEAD of webfetch" |
| `make-laten-correct` | "Fix typos in text — use before sending" |
| `make-laten-tools` | "List all make-laten tools — check what's available" |

### 3. Auto-Init Wizard

`make-laten init --all` detects and registers to all platforms:

```
Platform Detection:
├── Claude Code    → writes CLAUDE.md (skill hooks)
├── opencode       → copies SKILL.md + registers MCP
├── Cursor         → writes .cursorrules
├── Copilot CLI    → registers MCP server
├── Codex          → writes AGENTS.md
├── Gemini CLI     → writes GEMINI.md
└── Windsurf       → writes .windsurfrules
```

**Init flow:**
1. Detect installed agents (check PATH, config dirs)
2. For each detected agent:
   - Generate platform-specific config
   - Add "ALWAYS use make-laten" directive
   - Register MCP server
3. Print summary: "Configured for: Claude Code, opencode"

**Platform-specific configs:**

- **CLAUDE.md**: "When reading files, use make-laten-read INSTEAD of Read tool..."
- **.cursorrules**: "Use make-laten MCP tools for all file/code operations..."
- **MCP config**: `"make-laten": { "command": "npx", "args": ["-y", "make-laten-mcp", "server"] }`

## Files to Change

1. `skills/SKILL.md` — trigger rules + anti-patterns (all layers)
2. `src/mcp/server.ts` — 18 tool descriptions (hybrid style)
3. `src/cli/commands/init.ts` — platform detection + config generation
4. `README.md` — update Quick Start to show init wizard
5. `~/.config/opencode/skills/make-laten/SKILL.md` — copy updated skill

## Layers Integration

| Layer | Tools | Trigger |
|-------|-------|---------|
| **Compress** | read, read-detail, grep, git-diff, git-status | User action (explicit) |
| **Cache** | cache-stats, cache-get, cache-set, cache-clear | Auto (transparent) |
| **Learn** | patterns, failures, suggestions | Auto (after operations) |
| **Optimize** | search, fetch, correct, tools | User action (explicit) |

**Auto layers** (cache, learn) work transparently — agent doesn't need to call them explicitly. They fire automatically when compress tools are used.

## Success Criteria

- Agent automatically uses make-laten-read when user says "read file"
- Agent automatically uses make-laten-grep when user says "search code"
- `make-laten init --all` configures all detected platforms
- MCP descriptions are compelling enough that agent chooses make-laten over native tools
