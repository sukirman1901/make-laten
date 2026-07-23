# make-laten Phase 2: Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Route Layer with tool router, strategy router, semantic tool abstraction, and agent adapters for Claude Code, Codex, and Gemini CLI.

**Architecture:** Tool Router automatically selects the right compressor based on input type. Strategy Router chooses compression strategy based on context (file size, token budget, etc.). Semantic Tool Abstraction provides a unified interface for all tools. Agent Adapters integrate with specific AI coding agents.

**Tech Stack:** TypeScript, SQLite (better-sqlite3), Vitest, tsup, Node.js 22+

---

## File Structure

```
make-laten/
├── src/
│   ├── route/
│   │   ├── index.ts                # Route module exports
│   │   ├── tool-router.ts          # Tool router (input → compressor)
│   │   ├── strategy-router.ts      # Strategy router (context → strategy)
│   │   └── types.ts                # Router types
│   ├── tool/
│   │   ├── index.ts                # Tool module exports
│   │   ├── semantic-tool.ts        # Unified tool interface
│   │   └── registry.ts             # Tool registry
│   ├── adapter/
│   │   ├── index.ts                # Adapter module exports
│   │   ├── claude-code.ts          # Claude Code adapter
│   │   ├── codex.ts                # Codex adapter
│   │   ├── gemini-cli.ts           # Gemini CLI adapter
│   │   └── types.ts                # Adapter types
│   └── index.ts                    # Main exports (updated)
├── tests/
│   ├── route/
│   │   ├── tool-router.test.ts
│   │   └── strategy-router.test.ts
│   ├── tool/
│   │   └── semantic-tool.test.ts
│   └── adapter/
│       ├── claude-code.test.ts
│       ├── codex.test.ts
│       └── gemini-cli.test.ts
```

---

## Task 1: Router Types

**Files:**
- Create: `src/route/types.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/route/types.test.ts
import { describe, it, expect } from 'vitest'
import type { ToolRoute, StrategyRoute, RouteInput } from '../../src/route/types.js'

describe('Router Types', () => {
  it('should define ToolRoute type', () => {
    // Type-level test - just checking types compile
    const route: ToolRoute = {
      tool: 'compress',
      compressor: 'file-read',
      confidence: 0.9
    }
    expect(route.tool).toBe('compress')
  })

  it('should define StrategyRoute type', () => {
    const route: StrategyRoute = {
      strategy: 'aggressive',
      reason: 'large-file',
      savings: 0.5
    }
    expect(route.strategy).toBe('aggressive')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/route/types.test.ts
```

Expected: FAIL with "Cannot find module '../../src/route/types.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/route/types.ts
export type ToolType = 'compress' | 'cache' | 'graph' | 'search'
export type CompressorType = 'file-read' | 'grep' | 'git-diff'
export type StrategyType = 'aggressive' | 'balanced' | 'conservative'

export interface ToolRoute {
  tool: ToolType
  compressor?: CompressorType
  confidence: number
  reason?: string
}

export interface StrategyRoute {
  strategy: StrategyType
  reason: string
  savings: number
}

export interface RouteInput {
  type: 'file' | 'grep' | 'git-diff' | 'unknown'
  content: string
  metadata?: Record<string, any>
}

export interface RouteContext {
  fileSize?: number
  tokenBudget?: number
  previousRoutes?: ToolRoute[]
  userPreference?: StrategyType
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/route/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/route/types.ts tests/route/types.test.ts
git commit -m "feat: router types for tool and strategy routing"
```

---

## Task 2: Tool Router

**Files:**
- Create: `src/route/tool-router.ts`
- Test: `tests/route/tool-router.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/route/tool-router.test.ts
import { describe, it, expect } from 'vitest'
import { ToolRouter } from '../../src/route/tool-router.js'

describe('ToolRouter', () => {
  const router = new ToolRouter()

  it('should route file reads to file-read compressor', () => {
    const route = router.route({
      type: 'file',
      content: 'const x = 1',
      metadata: { filePath: 'src/main.ts' }
    })
    expect(route.compressor).toBe('file-read')
    expect(route.confidence).toBeGreaterThan(0.8)
  })

  it('should route grep results to grep compressor', () => {
    const route = router.route({
      type: 'grep',
      content: 'src/a.ts:1:TODO fix this',
      metadata: { pattern: 'TODO' }
    })
    expect(route.compressor).toBe('grep')
    expect(route.confidence).toBeGreaterThan(0.8)
  })

  it('should route git diffs to git-diff compressor', () => {
    const route = router.route({
      type: 'git-diff',
      content: 'diff --git a/src/main.ts b/src/main.ts',
      metadata: { repo: '/path/to/repo' }
    })
    expect(route.compressor).toBe('git-diff')
    expect(route.confidence).toBeGreaterThan(0.8)
  })

  it('should return low confidence for unknown types', () => {
    const route = router.route({
      type: 'unknown',
      content: 'some random content'
    })
    expect(route.confidence).toBeLessThan(0.5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/route/tool-router.test.ts
```

Expected: FAIL with "Cannot find module '../../src/route/tool-router.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/route/tool-router.ts
import type { RouteInput, ToolRoute, CompressorType } from './types.js'

export class ToolRouter {
  private rules: RouteRule[] = [
    {
      matcher: (input) => input.type === 'file',
      compressor: 'file-read',
      confidence: 0.95,
      reason: 'File read detected'
    },
    {
      matcher: (input) => input.type === 'grep',
      compressor: 'grep',
      confidence: 0.95,
      reason: 'Grep results detected'
    },
    {
      matcher: (input) => input.type === 'git-diff',
      compressor: 'git-diff',
      confidence: 0.95,
      reason: 'Git diff detected'
    }
  ]

  route(input: RouteInput): ToolRoute {
    for (const rule of this.rules) {
      if (rule.matcher(input)) {
        return {
          tool: 'compress',
          compressor: rule.compressor,
          confidence: rule.confidence,
          reason: rule.reason
        }
      }
    }

    return {
      tool: 'compress',
      confidence: 0.1,
      reason: 'No matching route found'
    }
  }

  addRule(rule: RouteRule): void {
    this.rules.push(rule)
  }
}

interface RouteRule {
  matcher: (input: RouteInput) => boolean
  compressor: CompressorType
  confidence: number
  reason: string
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/route/tool-router.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/route/tool-router.ts tests/route/tool-router.test.ts
git commit -m "feat: tool router with input type detection"
```

---

## Task 3: Strategy Router

**Files:**
- Create: `src/route/strategy-router.ts`
- Test: `tests/route/strategy-router.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/route/strategy-router.test.ts
import { describe, it, expect } from 'vitest'
import { StrategyRouter } from '../../src/route/strategy-router.js'

describe('StrategyRouter', () => {
  const router = new StrategyRouter()

  it('should select aggressive strategy for large files', () => {
    const strategy = router.select({
      fileSize: 10000,
      tokenBudget: 4000
    })
    expect(strategy.strategy).toBe('aggressive')
    expect(strategy.reason).toContain('large')
  })

  it('should select conservative strategy for small files', () => {
    const strategy = router.select({
      fileSize: 100,
      tokenBudget: 4000
    })
    expect(strategy.strategy).toBe('conservative')
    expect(strategy.reason).toContain('small')
  })

  it('should select balanced strategy for medium files', () => {
    const strategy = router.select({
      fileSize: 1000,
      tokenBudget: 4000
    })
    expect(strategy.strategy).toBe('balanced')
  })

  it('should respect user preference', () => {
    const strategy = router.select({
      fileSize: 10000,
      tokenBudget: 4000,
      userPreference: 'conservative'
    })
    expect(strategy.strategy).toBe('conservative')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/route/strategy-router.test.ts
```

Expected: FAIL with "Cannot find module '../../src/route/strategy-router.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/route/strategy-router.ts
import type { RouteContext, StrategyRoute, StrategyType } from './types.js'

export class StrategyRouter {
  private thresholds = {
    small: 500,
    large: 5000
  }

  select(context: RouteContext): StrategyRoute {
    // Respect user preference if set
    if (context.userPreference) {
      return {
        strategy: context.userPreference,
        reason: `User preference: ${context.userPreference}`,
        savings: this.estimateSavings(context.userPreference)
      }
    }

    const fileSize = context.fileSize || 0

    // Select strategy based on file size
    if (fileSize >= this.thresholds.large) {
      return {
        strategy: 'aggressive',
        reason: `Large file (${fileSize} bytes)`,
        savings: 0.6
      }
    }

    if (fileSize <= this.thresholds.small) {
      return {
        strategy: 'conservative',
        reason: `Small file (${fileSize} bytes)`,
        savings: 0.2
      }
    }

    return {
      strategy: 'balanced',
      reason: `Medium file (${fileSize} bytes)`,
      savings: 0.4
    }
  }

  private estimateSavings(strategy: StrategyType): number {
    switch (strategy) {
      case 'aggressive': return 0.6
      case 'balanced': return 0.4
      case 'conservative': return 0.2
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/route/strategy-router.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/route/strategy-router.ts tests/route/strategy-router.test.ts
git commit -m "feat: strategy router with file size detection"
```

---

## Task 4: Router Index

**Files:**
- Create: `src/route/index.ts`
- Test: `tests/route/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/route/index.test.ts
import { describe, it, expect } from 'vitest'
import { createRouter } from '../../src/route/index.js'

describe('Router Index', () => {
  it('should create a router with tool and strategy', () => {
    const router = createRouter()
    expect(router.tool).toBeDefined()
    expect(router.strategy).toBeDefined()
  })

  it('should route and select strategy', () => {
    const router = createRouter()
    
    const route = router.route({
      type: 'file',
      content: 'const x = 1',
      metadata: { filePath: 'src/main.ts' }
    })
    
    expect(route.compressor).toBe('file-read')
    
    const strategy = router.selectStrategy({
      fileSize: 10000
    })
    
    expect(strategy.strategy).toBe('aggressive')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/route/index.test.ts
```

Expected: FAIL with "Cannot find module '../../src/route/index.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/route/index.ts
import { ToolRouter } from './tool-router.js'
import { StrategyRouter } from './strategy-router.js'
import type { RouteInput, RouteContext, ToolRoute, StrategyRoute } from './types.js'

export function createRouter() {
  const tool = new ToolRouter()
  const strategy = new StrategyRouter()

  return {
    tool,
    strategy,
    route: (input: RouteInput): ToolRoute => tool.route(input),
    selectStrategy: (context: RouteContext): StrategyRoute => strategy.select(context)
  }
}

export type { ToolRoute, StrategyRoute, RouteInput, RouteContext }
export { ToolRouter } from './tool-router.js'
export { StrategyRouter } from './strategy-router.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/route/index.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/route/index.ts tests/route/index.test.ts
git commit -m "feat: router index with unified createRouter function"
```

---

## Task 5: Tool Registry

**Files:**
- Create: `src/tool/registry.ts`
- Test: `tests/tool/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tool/registry.test.ts
import { describe, it, expect } from 'vitest'
import { ToolRegistry } from '../../src/tool/registry.js'

describe('ToolRegistry', () => {
  const registry = new ToolRegistry()

  it('should register and get tools', () => {
    registry.register('compress', {
      name: 'compress',
      description: 'Compress content',
      execute: async (input) => ({ content: 'compressed', confidence: 0.9 })
    })

    const tool = registry.get('compress')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('compress')
  })

  it('should list all tools', () => {
    registry.register('cache', {
      name: 'cache',
      description: 'Cache content',
      execute: async (input) => ({ content: 'cached', confidence: 1.0 })
    })

    const tools = registry.list()
    expect(tools.length).toBeGreaterThanOrEqual(2)
  })

  it('should return undefined for unknown tools', () => {
    const tool = registry.get('unknown')
    expect(tool).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tool/registry.test.ts
```

Expected: FAIL with "Cannot find module '../../src/tool/registry.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/tool/registry.ts
export interface Tool {
  name: string
  description: string
  execute: (input: any) => Promise<any>
}

export class ToolRegistry {
  private tools = new Map<string, Tool>()

  register(name: string, tool: Tool): void {
    this.tools.set(name, tool)
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  list(): Tool[] {
    return Array.from(this.tools.values())
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  unregister(name: string): boolean {
    return this.tools.delete(name)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tool/registry.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tool/registry.ts tests/tool/registry.test.ts
git commit -m "feat: tool registry with register/get/list"
```

---

## Task 6: Semantic Tool Interface

**Files:**
- Create: `src/tool/semantic-tool.ts`
- Test: `tests/tool/semantic-tool.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tool/semantic-tool.test.ts
import { describe, it, expect } from 'vitest'
import { SemanticTool } from '../../src/tool/semantic-tool.js'

describe('SemanticTool', () => {
  it('should create a semantic tool with intent', () => {
    const tool = new SemanticTool('compress', {
      intent: 'Reduce token usage',
      inputTypes: ['file', 'grep', 'git-diff'],
      outputType: 'compressed'
    })

    expect(tool.name).toBe('compress')
    expect(tool.intent).toBe('Reduce token usage')
  })

  it('should validate input types', () => {
    const tool = new SemanticTool('compress', {
      intent: 'Reduce token usage',
      inputTypes: ['file', 'grep'],
      outputType: 'compressed'
    })

    expect(tool.supportsInput('file')).toBe(true)
    expect(tool.supportsInput('git-diff')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tool/semantic-tool.test.ts
```

Expected: FAIL with "Cannot find module '../../src/tool/semantic-tool.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/tool/semantic-tool.ts
export interface SemanticToolConfig {
  intent: string
  inputTypes: string[]
  outputType: string
}

export class SemanticTool {
  public readonly name: string
  public readonly intent: string
  private inputTypes: Set<string>
  public readonly outputType: string

  constructor(name: string, config: SemanticToolConfig) {
    this.name = name
    this.intent = config.intent
    this.inputTypes = new Set(config.inputTypes)
    this.outputType = config.outputType
  }

  supportsInput(inputType: string): boolean {
    return this.inputTypes.has(inputType)
  }

  describe(): string {
    return `${this.name}: ${this.intent} (${Array.from(this.inputTypes).join(', ')} → ${this.outputType})`
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tool/semantic-tool.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tool/semantic-tool.ts tests/tool/semantic-tool.test.ts
git commit -m "feat: semantic tool with intent and input validation"
```

---

## Task 7: Tool Module Index

**Files:**
- Create: `src/tool/index.ts`
- Test: `tests/tool/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tool/index.test.ts
import { describe, it, expect } from 'vitest'
import { createToolRegistry, SemanticTool } from '../../src/tool/index.js'

describe('Tool Module Index', () => {
  it('should create a pre-populated registry', () => {
    const registry = createToolRegistry()
    expect(registry.has('compress')).toBe(true)
    expect(registry.has('cache')).toBe(true)
    expect(registry.has('graph')).toBe(true)
  })

  it('should include semantic tools', () => {
    const tools = getSemanticTools()
    expect(tools.length).toBe(3)
    expect(tools[0].name).toBe('compress')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tool/index.test.ts
```

Expected: FAIL with "Cannot find module '../../src/tool/index.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/tool/index.ts
import { ToolRegistry, type Tool } from './registry.js'
import { SemanticTool } from './semantic-tool.js'

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry()

  registry.register('compress', {
    name: 'compress',
    description: 'Compress content to reduce tokens',
    execute: async (input) => ({ content: 'compressed', confidence: 0.9 })
  })

  registry.register('cache', {
    name: 'cache',
    description: 'Cache content for reuse',
    execute: async (input) => ({ content: 'cached', confidence: 1.0 })
  })

  registry.register('graph', {
    name: 'graph',
    description: 'Store in knowledge graph',
    execute: async (input) => ({ stored: true })
  })

  return registry
}

export function getSemanticTools(): SemanticTool[] {
  return [
    new SemanticTool('compress', {
      intent: 'Reduce token usage',
      inputTypes: ['file', 'grep', 'git-diff'],
      outputType: 'compressed'
    }),
    new SemanticTool('cache', {
      intent: 'Store for reuse',
      inputTypes: ['compressed', 'original'],
      outputType: 'cached'
    }),
    new SemanticTool('graph', {
      intent: 'Build knowledge base',
      inputTypes: ['any'],
      outputType: 'stored'
    })
  ]
}

export { ToolRegistry } from './registry.js'
export { SemanticTool } from './semantic-tool.js'
export type { Tool } from './registry.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tool/index.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tool/index.ts tests/tool/index.test.ts
git commit -m "feat: tool module with pre-populated registry"
```

---

## Task 8: Adapter Types

**Files:**
- Create: `src/adapter/types.ts`
- Test: `tests/adapter/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/adapter/types.test.ts
import { describe, it, expect } from 'vitest'
import type { AgentAdapter, AdapterConfig, AdapterOutput } from '../../src/adapter/types.js'

describe('Adapter Types', () => {
  it('should define AgentAdapter type', () => {
    const adapter: AgentAdapter = {
      name: 'claude-code',
      version: '1.0.0',
      format: (input) => ({ output: 'formatted', format: 'claude' })
    }
    expect(adapter.name).toBe('claude-code')
  })

  it('should define AdapterConfig type', () => {
    const config: AdapterConfig = {
      maxTokens: 4000,
      supportsStreaming: true
    }
    expect(config.maxTokens).toBe(4000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/adapter/types.test.ts
```

Expected: FAIL with "Cannot find module '../../src/adapter/types.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapter/types.ts
export interface AgentAdapter {
  name: string
  version: string
  format: (input: any) => AdapterOutput
  parse?: (output: string) => any
}

export interface AdapterConfig {
  maxTokens?: number
  supportsStreaming?: boolean
  supportsImages?: boolean
  customHeaders?: Record<string, string>
}

export interface AdapterOutput {
  output: string
  format: string
  metadata?: Record<string, any>
}

export interface AdapterRequest {
  content: string
  context?: Record<string, any>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/adapter/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapter/types.ts tests/adapter/types.test.ts
git commit -m "feat: adapter types for agent integration"
```

---

## Task 9: Claude Code Adapter

**Files:**
- Create: `src/adapter/claude-code.ts`
- Test: `tests/adapter/claude-code.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/adapter/claude-code.test.ts
import { describe, it, expect } from 'vitest'
import { ClaudeCodeAdapter } from '../../src/adapter/claude-code.js'

describe('ClaudeCodeAdapter', () => {
  const adapter = new ClaudeCodeAdapter()

  it('should have correct name and version', () => {
    expect(adapter.name).toBe('claude-code')
    expect(adapter.version).toBeDefined()
  })

  it('should format output for Claude', () => {
    const result = adapter.format({
      content: 'test content',
      context: { filePath: 'src/main.ts' }
    })
    expect(result.format).toBe('claude')
    expect(result.output).toContain('test content')
  })

  it('should include metadata', () => {
    const result = adapter.format({
      content: 'test',
      context: { filePath: 'test.ts' }
    })
    expect(result.metadata).toBeDefined()
    expect(result.metadata?.filePath).toBe('test.ts')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/adapter/claude-code.test.ts
```

Expected: FAIL with "Cannot find module '../../src/adapter/claude-code.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapter/claude-code.ts
import type { AgentAdapter, AdapterOutput, AdapterRequest } from './types.js'

export class ClaudeCodeAdapter implements AgentAdapter {
  name = 'claude-code'
  version = '1.0.0'

  format(input: AdapterRequest): AdapterOutput {
    const { content, context } = input
    
    // Claude Code uses markdown-formatted output
    const formatted = this.formatForClaude(content, context)
    
    return {
      output: formatted,
      format: 'claude',
      metadata: {
        filePath: context?.filePath,
        timestamp: Date.now()
      }
    }
  }

  parse(output: string): any {
    // Parse Claude Code response
    return { content: output, parsed: true }
  }

  private formatForClaude(content: string, context?: Record<string, any>): string {
    const parts: string[] = []
    
    if (context?.filePath) {
      parts.push(`**File:** \`${context.filePath}\``)
    }
    
    parts.push(content)
    
    return parts.join('\n\n')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/adapter/claude-code.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapter/claude-code.ts tests/adapter/claude-code.test.ts
git commit -m "feat: Claude Code adapter with markdown formatting"
```

---

## Task 10: Codex Adapter

**Files:**
- Create: `src/adapter/codex.ts`
- Test: `tests/adapter/codex.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/adapter/codex.test.ts
import { describe, it, expect } from 'vitest'
import { CodexAdapter } from '../../src/adapter/codex.js'

describe('CodexAdapter', () => {
  const adapter = new CodexAdapter()

  it('should have correct name', () => {
    expect(adapter.name).toBe('codex')
  })

  it('should format output for Codex', () => {
    const result = adapter.format({
      content: 'test content',
      context: {}
    })
    expect(result.format).toBe('codex')
    expect(result.output).toContain('test content')
  })

  it('should handle JSON format', () => {
    const result = adapter.format({
      content: '{"key": "value"}',
      context: { expectJson: true }
    })
    expect(result.output).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/adapter/codex.test.ts
```

Expected: FAIL with "Cannot find module '../../src/adapter/codex.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapter/codex.ts
import type { AgentAdapter, AdapterOutput, AdapterRequest } from './types.js'

export class CodexAdapter implements AgentAdapter {
  name = 'codex'
  version = '1.0.0'

  format(input: AdapterRequest): AdapterOutput {
    const { content, context } = input
    
    // Codex prefers structured output
    const formatted = this.formatForCodex(content, context)
    
    return {
      output: formatted,
      format: 'codex',
      metadata: {
        timestamp: Date.now()
      }
    }
  }

  parse(output: string): any {
    try {
      return JSON.parse(output)
    } catch {
      return { content: output }
    }
  }

  private formatForCodex(content: string, context?: Record<string, any>): string {
    if (context?.expectJson) {
      return JSON.stringify({ content, timestamp: Date.now() })
    }
    return content
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/adapter/codex.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapter/codex.ts tests/adapter/codex.test.ts
git commit -m "feat: Codex adapter with JSON support"
```

---

## Task 11: Gemini CLI Adapter

**Files:**
- Create: `src/adapter/gemini-cli.ts`
- Test: `tests/adapter/gemini-cli.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/adapter/gemini-cli.test.ts
import { describe, it, expect } from 'vitest'
import { GeminiCliAdapter } from '../../src/adapter/gemini-cli.js'

describe('GeminiCliAdapter', () => {
  const adapter = new GeminiCliAdapter()

  it('should have correct name', () => {
    expect(adapter.name).toBe('gemini-cli')
  })

  it('should format output for Gemini', () => {
    const result = adapter.format({
      content: 'test content',
      context: {}
    })
    expect(result.format).toBe('gemini')
    expect(result.output).toContain('test content')
  })

  it('should support multimodal', () => {
    const result = adapter.format({
      content: 'test',
      context: { includeImage: true, imagePath: '/path/to/image.png' }
    })
    expect(result.metadata?.multimodal).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/adapter/gemini-cli.test.ts
```

Expected: FAIL with "Cannot find module '../../src/adapter/gemini-cli.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapter/gemini-cli.ts
import type { AgentAdapter, AdapterOutput, AdapterRequest } from './types.js'

export class GeminiCliAdapter implements AgentAdapter {
  name = 'gemini-cli'
  version = '1.0.0'

  format(input: AdapterRequest): AdapterOutput {
    const { content, context } = input
    
    const formatted = this.formatForGemini(content, context)
    const multimodal = context?.includeImage || false
    
    return {
      output: formatted,
      format: 'gemini',
      metadata: {
        multimodal,
        imagePath: context?.imagePath,
        timestamp: Date.now()
      }
    }
  }

  parse(output: string): any {
    return { content: output, parsed: true }
  }

  private formatForGemini(content: string, context?: Record<string, any>): string {
    const parts: string[] = [content]
    
    if (context?.includeImage && context?.imagePath) {
      parts.push(`[Image: ${context.imagePath}]`)
    }
    
    return parts.join('\n')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/adapter/gemini-cli.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapter/gemini-cli.ts tests/adapter/gemini-cli.test.ts
git commit -m "feat: Gemini CLI adapter with multimodal support"
```

---

## Task 12: Adapter Module Index

**Files:**
- Create: `src/adapter/index.ts`
- Test: `tests/adapter/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/adapter/index.test.ts
import { describe, it, expect } from 'vitest'
import { getAdapter, getAdapters, createAdapter } from '../../src/adapter/index.js'

describe('Adapter Module Index', () => {
  it('should get adapter by name', () => {
    const adapter = getAdapter('claude-code')
    expect(adapter).toBeDefined()
    expect(adapter.name).toBe('claude-code')
  })

  it('should list all adapters', () => {
    const adapters = getAdapters()
    expect(adapters.length).toBe(3)
  })

  it('should create adapter from config', () => {
    const adapter = createAdapter({
      name: 'custom',
      format: (input) => ({ output: 'custom', format: 'custom' })
    })
    expect(adapter.name).toBe('custom')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/adapter/index.test.ts
```

Expected: FAIL with "Cannot find module '../../src/adapter/index.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapter/index.ts
import { ClaudeCodeAdapter } from './claude-code.js'
import { CodexAdapter } from './codex.js'
import { GeminiCliAdapter } from './gemini-cli.js'
import type { AgentAdapter } from './types.js'

const adapters = new Map<string, AgentAdapter>()

// Register built-in adapters
adapters.set('claude-code', new ClaudeCodeAdapter())
adapters.set('codex', new CodexAdapter())
adapters.set('gemini-cli', new GeminiCliAdapter())

export function getAdapter(name: string): AgentAdapter | undefined {
  return adapters.get(name)
}

export function getAdapters(): AgentAdapter[] {
  return Array.from(adapters.values())
}

export function createAdapter(config: AgentAdapter): AgentAdapter {
  return config
}

export function registerAdapter(name: string, adapter: AgentAdapter): void {
  adapters.set(name, adapter)
}

export type { AgentAdapter, AdapterConfig, AdapterOutput } from './types.js'
export { ClaudeCodeAdapter } from './claude-code.js'
export { CodexAdapter } from './codex.js'
export { GeminiCliAdapter } from './gemini-cli.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/adapter/index.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapter/index.ts tests/adapter/index.test.ts
git commit -m "feat: adapter module with registry and get/create"
```

---

## Task 13: Update Main Index

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update main exports**

```typescript
// src/index.ts
export * from './graph/index.js'
export * from './compress/index.js'
export * from './cache/index.js'
export * from './route/index.js'
export * from './tool/index.js'
export * from './adapter/index.js'
```

- [ ] **Step 2: Build to verify no errors**

```bash
npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: update main exports with route, tool, adapter"
```

---

## Task 14: Phase 2 Integration Test

**Files:**
- Create: `tests/integration-phase2.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// tests/integration-phase2.test.ts
import { describe, it, expect } from 'vitest'
import { createRouter } from '../src/route/index.js'
import { createToolRegistry, getSemanticTools } from '../src/tool/index.js'
import { getAdapter, getAdapters } from '../src/adapter/index.js'

describe('Phase 2 Integration', () => {
  it('should route, select tool, and format output', async () => {
    // Create router
    const router = createRouter()
    
    // Route input
    const route = router.route({
      type: 'file',
      content: 'const x = 1',
      metadata: { filePath: 'src/main.ts' }
    })
    
    expect(route.compressor).toBe('file-read')
    
    // Select strategy
    const strategy = router.selectStrategy({
      fileSize: 10000
    })
    
    expect(strategy.strategy).toBe('aggressive')
    
    // Get tool
    const registry = createToolRegistry()
    const tool = registry.get('compress')
    expect(tool).toBeDefined()
    
    // Format for adapter
    const adapter = getAdapter('claude-code')
    expect(adapter).toBeDefined()
    
    const output = adapter!.format({
      content: 'compressed content',
      context: { filePath: 'src/main.ts' }
    })
    
    expect(output.format).toBe('claude')
    expect(output.output).toContain('compressed content')
  })

  it('should support all adapters', () => {
    const adapters = getAdapters()
    expect(adapters.length).toBe(3)
    
    const names = adapters.map(a => a.name)
    expect(names).toContain('claude-code')
    expect(names).toContain('codex')
    expect(names).toContain('gemini-cli')
  })

  it('should have semantic tools', () => {
    const tools = getSemanticTools()
    expect(tools.length).toBe(3)
    
    const compressTool = tools.find(t => t.name === 'compress')
    expect(compressTool).toBeDefined()
    expect(compressTool!.supportsInput('file')).toBe(true)
    expect(compressTool!.supportsInput('unknown')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run tests/integration-phase2.test.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration-phase2.test.ts
git commit -m "test: Phase 2 integration test for routing, tools, adapters"
```

---

## Task 15: Final Build & Verify

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 2: Build project**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: Phase 2 routing implementation complete"
```

---

## Summary

Phase 2 delivers:

1. **Tool Router** — Routes input to correct compressor based on type
2. **Strategy Router** — Selects compression strategy based on file size
3. **Tool Registry** — Register and retrieve tools
4. **Semantic Tools** — Tools with intent and input validation
5. **Agent Adapters** — Claude Code, Codex, Gemini CLI integration
6. **Integration** — Full routing → tool → adapter pipeline
