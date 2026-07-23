# Active Intercept System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make make-laten "always on" — agent automatically intercepts file/code/git/web operations without user explicitly requesting it.

**Architecture:** Update SKILL.md with trigger rules, update MCP tool descriptions with hybrid style, and enhance init command to write platform-specific configs (CLAUDE.md, .cursorrules, AGENTS.md, GEMINI.md).

**Tech Stack:** TypeScript, MCP protocol, CLI

---

## File Structure

| File | Purpose |
|------|---------|
| `skills/SKILL.md` | Trigger rules + anti-patterns |
| `src/mcp/server.ts` | 18 tool descriptions (hybrid style) |
| `src/cli/commands/init.ts` | Platform detection + config generation |
| `src/cli/templates/` | Platform-specific config templates |
| `README.md` | Updated Quick Start |
| `~/.config/opencode/skills/make-laten/SKILL.md` | Installed skill |

---

### Task 1: Update SKILL.md with Trigger Rules

**Files:**
- Modify: `skills/SKILL.md`
- Modify: `~/.config/opencode/skills/make-laten/SKILL.md`

- [ ] **Step 1: Read current SKILL.md**

```bash
cat skills/SKILL.md
```

- [ ] **Step 2: Replace "When to Use" section with trigger rules**

Replace the entire "When to Use" section with:

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

- [ ] **Step 3: Run tests to verify**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add skills/SKILL.md
git commit -m "feat: add trigger rules to SKILL.md"
```

---

### Task 2: Update MCP Tool Descriptions

**Files:**
- Modify: `src/mcp/server.ts`

- [ ] **Step 1: Read current MCP server**

```bash
cat src/mcp/server.ts | grep -A2 "description:"
```

- [ ] **Step 2: Update tool descriptions**

Find and replace each tool description with hybrid style:

```typescript
// Compress Layer
description: 'Read files with 85% token savings — use INSTEAD of Read tool'
description: 'Expand zero-loss detail from overview — use AFTER make-laten-read'
description: 'Search code grouped by file — use INSTEAD of grep/rg command'
description: 'Show git changes with 85% savings — use INSTEAD of git diff'
description: 'Show git status grouped by type — use INSTEAD of git status'
description: 'Route input to best compressor — use when unsure which tool'
description: 'Pick compression level — conservative/balanced/aggressive'

// Cache Layer
description: 'Show cache hit rate — check if caching helps'
description: 'Get cached value — faster than re-computing'
description: 'Cache result for session — save tokens on repeat'
description: 'Clear session cache — fresh start'

// Learn Layer
description: 'Show learned patterns — check what works'
description: 'Show failure records — learn from mistakes'
description: 'Get smart suggestions — based on patterns'

// Optimize Layer
description: 'Web search with compression — use INSTEAD of websearch'
description: 'Fetch URL with 75% savings — use INSTEAD of webfetch'
description: 'Fix typos in text — use before sending'
description: 'List all make-laten tools — check what\'s available'
```

- [ ] **Step 3: Run tests to verify**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/mcp/server.ts
git commit -m "feat: update MCP tool descriptions to hybrid style"
```

---

### Task 3: Create Platform Config Templates

**Files:**
- Create: `src/cli/templates/claude-md.ts`
- Create: `src/cli/templates/cursorrules.ts`
- Create: `src/cli/templates/agents-md.ts`
- Create: `src/cli/templates/gemini-md.ts`
- Create: `src/cli/templates/index.ts`

- [ ] **Step 1: Create CLAUDE.md template**

```typescript
// src/cli/templates/claude-md.ts
export const CLAUDE_MD = `# make-laten

## ALWAYS use make-laten for:

- Reading files → \`make-laten-read\` (85% token savings)
- Searching code → \`make-laten-grep\` (grouped results)
- Git operations → \`make-laten-git-diff\`, \`make-laten-git-status\`
- Web operations → \`make-laten-fetch\`, \`make-laten-search\`

## NEVER use:
- Read tool for files > 100 lines
- Raw grep/rg for code search
- webfetch without compression

## Detail expansion
After \`make-laten-read\`, use \`make-laten-read-detail\` for zero-loss expansion.
`
```

- [ ] **Step 2: Create .cursorrules template**

```typescript
// src/cli/templates/cursorrules.ts
export const CURSORRULES = `# make-laten

Use make-laten MCP tools for all file/code operations:

- File reads → make-laten-read (85% savings)
- Code search → make-laten-grep (grouped)
- Git diff/status → make-laten-git-diff/git-status
- Web fetch/search → make-laten-fetch/search

Do NOT use native Read/grep tools.
`
```

- [ ] **Step 3: Create AGENTS.md template**

```typescript
// src/cli/templates/agents-md.ts
export const AGENTS_MD = `# make-laten

## Agent Instructions

Always use make-laten MCP tools instead of native tools:

| Operation | Use | Instead of |
|-----------|-----|------------|
| Read file | make-laten-read | Read tool |
| Search code | make-laten-grep | grep/rg |
| Git diff | make-laten-git-diff | git diff |
| Git status | make-laten-git-status | git status |
| Web fetch | make-laten-fetch | webfetch |
| Web search | make-laten-search | websearch |
`
```

- [ ] **Step 4: Create GEMINI.md template**

```typescript
// src/cli/templates/gemini-md.ts
export const GEMINI_MD = `# make-laten

## Tool Usage

Use make-laten MCP tools for efficiency:

- make-laten-read: Read files (85% token savings)
- make-laten-grep: Search code (grouped)
- make-laten-fetch: Fetch URLs (75% savings)
- make-laten-search: Web search

Always prefer these over native tools.
`
```

- [ ] **Step 5: Create index.ts**

```typescript
// src/cli/templates/index.ts
export { CLAUDE_MD } from './claude-md.js'
export { CURSORRULES } from './cursorrules.js'
export { AGENTS_MD } from './agents-md.js'
export { GEMINI_MD } from './gemini-md.js'
```

- [ ] **Step 6: Run tests to verify**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/cli/templates/
git commit -m "feat: add platform config templates"
```

---

### Task 4: Enhance Init Command

**Files:**
- Modify: `src/cli/commands/init.ts`

- [ ] **Step 1: Import templates**

Add at top of file:

```typescript
import { CLAUDE_MD, CURSORRULES, AGENTS_MD, GEMINI_MD } from '../templates/index.js'
```

- [ ] **Step 2: Add config writing functions**

Add after existing `writeJSON` function:

```typescript
async function writeFile(filePath: string, content: string): Promise<boolean> {
  try {
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, content)
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 3: Update agent detection to include config writing**

Update each agent's `writeConfig` to also write platform-specific config:

For Claude Code:
```typescript
writeConfig: async (p) => {
  const data = await readJSON(p)
  data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
  const mcpSuccess = await writeJSON(p, data)
  // Write CLAUDE.md in project root
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md')
  const claudeSuccess = await writeFile(claudeMdPath, CLAUDE_MD)
  return mcpSuccess && claudeSuccess
}
```

For Cursor:
```typescript
writeConfig: async (p) => {
  const data = await readJSON(p)
  data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
  const mcpSuccess = await writeJSON(p, data)
  // Write .cursorrules in project root
  const cursorrulesPath = path.join(process.cwd(), '.cursorrules')
  const cursorSuccess = await writeFile(cursorrulesPath, CURSORRULES)
  return mcpSuccess && cursorSuccess
}
```

For Codex:
```typescript
writeConfig: async (p) => {
  const data = await readJSON(p)
  data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
  const mcpSuccess = await writeJSON(p, data)
  // Write AGENTS.md in project root
  const agentsMdPath = path.join(process.cwd(), 'AGENTS.md')
  const agentsSuccess = await writeFile(agentsMdPath, AGENTS_MD)
  return mcpSuccess && agentsSuccess
}
```

For Gemini CLI:
```typescript
writeConfig: async (p) => {
  const data = await readJSON(p)
  data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
  const mcpSuccess = await writeJSON(p, data)
  // Write GEMINI.md in project root
  const geminiMdPath = path.join(process.cwd(), 'GEMINI.md')
  const geminiSuccess = await writeFile(geminiMdPath, GEMINI_MD)
  return mcpSuccess && geminiSuccess
}
```

- [ ] **Step 4: Update summary output**

Replace the summary section at the end:

```typescript
console.log('')
console.log('  Setup complete!')
console.log('')
console.log('  make-laten provides:')
console.log('    • MCP server → auto-compress for all AI agents')
console.log('    • Platform configs → CLAUDE.md, .cursorrules, AGENTS.md, GEMINI.md')
console.log('    • CLI commands → mread, mgrep, mdiff, msearch, mfetch')
console.log('')
console.log('  Restart your agent to activate MCP tools.')
console.log('')
```

- [ ] **Step 5: Run tests to verify**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/init.ts
git commit -m "feat: enhance init command with platform configs"
```

---

### Task 5: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update Quick Start section**

Replace the Quick Start section:

```markdown
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
```

- [ ] **Step 2: Run tests to verify**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with init wizard details"
```

---

### Task 6: Copy Updated Skill

**Files:**
- Modify: `~/.config/opencode/skills/make-laten/SKILL.md`

- [ ] **Step 1: Copy updated SKILL.md**

```bash
cp skills/SKILL.md ~/.config/opencode/skills/make-laten/SKILL.md
```

- [ ] **Step 2: Verify copy**

```bash
cat ~/.config/opencode/skills/make-laten/SKILL.md | head -20
```

Expected: Shows updated trigger rules

- [ ] **Step 3: Commit**

```bash
git add skills/SKILL.md
git commit -m "feat: update installed skill with trigger rules"
```

---

### Task 7: Test End-to-End

**Files:**
- Test: All modified files

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 2: Run init command**

```bash
npx tsx src/cli/index.ts init --all
```

Expected: Shows detected agents and configs written

- [ ] **Step 3: Verify configs created**

```bash
ls -la CLAUDE.md .cursorrules AGENTS.md GEMINI.md 2>/dev/null
```

Expected: Files exist

- [ ] **Step 4: Commit all changes**

```bash
git add -A
git commit -m "feat: active intercept system complete"
git push origin main
```

---

## Success Criteria

- [x] SKILL.md has trigger rules for all layers
- [x] MCP descriptions are hybrid style (action + benefit + directive)
- [x] Init command writes platform-specific configs
- [x] All tests pass
- [x] README updated with init wizard details
