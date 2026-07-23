# make-laten Phase 4: Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Production Readiness layer with middleware pipeline, plugin system, rate limiting, structured logging, error handling, metrics collection, session management, and dynamic plugin loading.

**Architecture:** Middleware chain processes requests through handlers. Plugin system enables extensibility. Rate limiter prevents abuse. Logger provides structured output. Error handler centralizes error management. Metrics collector tracks performance. Session manager persists state.

**Tech Stack:** TypeScript, Vitest, tsup, Node.js 22+

---

## File Structure

```
make-laten/
├── src/
│   ├── middleware/
│   │   ├── types.ts               # Middleware types
│   │   ├── pipeline.ts            # Middleware pipeline
│   │   └── index.ts               # Middleware exports
│   ├── plugin/
│   │   ├── types.ts               # Plugin types
│   │   ├── loader.ts              # Plugin loader
│   │   └── index.ts               # Plugin exports
│   ├── security/
│   │   ├── rate-limiter.ts        # Rate limiting
│   │   └── index.ts               # Security exports
│   ├── logging/
│   │   ├── logger.ts              # Structured logger
│   │   └── index.ts               # Logging exports
│   ├── error/
│   │   ├── handler.ts             # Error handler
│   │   └── index.ts               # Error exports
│   ├── metrics/
│   │   ├── collector.ts           # Metrics collector
│   │   └── index.ts               # Metrics exports
│   ├── session/
│   │   ├── manager.ts             # Session manager
│   │   └── index.ts               # Session exports
│   └── index.ts                   # Main exports (updated)
├── tests/
│   ├── middleware/
│   │   └── pipeline.test.ts
│   ├── plugin/
│   │   └── loader.test.ts
│   ├── security/
│   │   └── rate-limiter.test.ts
│   ├── logging/
│   │   └── logger.test.ts
│   ├── error/
│   │   └── handler.test.ts
│   ├── metrics/
│   │   └── collector.test.ts
│   ├── session/
│   │   └── manager.test.ts
│   └── integration-phase4.test.ts
```

---

## Task 1: Middleware Types

**Files:**
- Create: `src/middleware/types.ts`
- Test: `tests/middleware/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import type { Middleware, MiddlewareContext, MiddlewareResult } from '../../src/middleware/types.js'

describe('Middleware Types', () => {
  it('should define Middleware type', () => {
    const middleware: Middleware = async (ctx, next) => {
      return next(ctx)
    }
    expect(typeof middleware).toBe('function')
  })

  it('should define MiddlewareContext type', () => {
    const ctx: MiddlewareContext = {
      input: { test: 'value' },
      metadata: { timestamp: Date.now() }
    }
    expect(ctx.input).toBeDefined()
  })

  it('should define MiddlewareResult type', () => {
    const result: MiddlewareResult = {
      output: { result: 'success' },
      metadata: {}
    }
    expect(result.output).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/middleware/types.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export interface MiddlewareContext {
  input: any
  metadata: Record<string, any>
}

export interface MiddlewareResult {
  output: any
  metadata: Record<string, any>
}

export type Next = (ctx: MiddlewareContext) => Promise<MiddlewareResult>
export type Middleware = (ctx: MiddlewareContext, next: Next) => Promise<MiddlewareResult>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/middleware/types.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/middleware/types.ts tests/middleware/types.test.ts
git commit -m "feat: middleware types for pipeline chain"
```

---

## Task 2: Middleware Pipeline

**Files:**
- Create: `src/middleware/pipeline.ts`
- Test: `tests/middleware/pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Pipeline } from '../../src/middleware/pipeline.js'
import type { Middleware } from '../../src/middleware/types.js'

describe('Pipeline', () => {
  let pipeline: Pipeline

  beforeEach(() => {
    pipeline = new Pipeline()
  })

  it('should add middleware', () => {
    const mw: Middleware = async (ctx, next) => next(ctx)
    pipeline.use(mw)
    expect(pipeline.size()).toBe(1)
  })

  it('should execute middleware chain', async () => {
    const order: number[] = []

    pipeline.use(async (ctx, next) => {
      order.push(1)
      const result = await next(ctx)
      order.push(3)
      return result
    })

    pipeline.use(async (ctx, next) => {
      order.push(2)
      return next(ctx)
    })

    await pipeline.execute({ input: {}, metadata: {} })
    expect(order).toEqual([1, 2, 3])
  })

  it('should pass context through chain', async () => {
    pipeline.use(async (ctx, next) => {
      ctx.metadata.enhanced = true
      return next(ctx)
    })

    const result = await pipeline.execute({ input: {}, metadata: {} })
    expect(result.metadata.enhanced).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/middleware/pipeline.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Middleware, MiddlewareContext, MiddlewareResult } from './types.js'

export class Pipeline {
  private middlewares: Middleware[] = []

  use(middleware: Middleware): this {
    this.middlewares.push(middleware)
    return this
  }

  size(): number {
    return this.middlewares.length
  }

  async execute(ctx: MiddlewareContext): Promise<MiddlewareResult> {
    let index = 0

    const next = async (ctx: MiddlewareContext): Promise<MiddlewareResult> => {
      if (index >= this.middlewares.length) {
        return { output: ctx.input, metadata: ctx.metadata }
      }

      const middleware = this.middlewares[index++]
      return middleware(ctx, next)
    }

    return next(ctx)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/middleware/pipeline.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/middleware/pipeline.ts tests/middleware/pipeline.test.ts
git commit -m "feat: middleware pipeline with chain execution"
```

---

## Task 3: Middleware Module Index

**Files:**
- Create: `src/middleware/index.ts`
- Test: `tests/middleware/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { Pipeline } from '../../src/middleware/index.js'

describe('Middleware Module Index', () => {
  it('should export Pipeline', () => {
    expect(Pipeline).toBeDefined()
  })

  it('should create a pipeline', () => {
    const pipeline = new Pipeline()
    expect(pipeline.size()).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/middleware/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export { Pipeline } from './pipeline.js'
export type { Middleware, MiddlewareContext, MiddlewareResult, Next } from './types.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/middleware/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/middleware/index.ts tests/middleware/index.test.ts
git commit -m "feat: middleware module exports"
```

---

## Task 4: Plugin Types

**Files:**
- Create: `src/plugin/types.ts`
- Test: `tests/plugin/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import type { Plugin, PluginContext, PluginResult } from '../../src/plugin/types.js'

describe('Plugin Types', () => {
  it('should define Plugin type', () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      initialize: async () => {},
      execute: async (input) => ({ output: input })
    }
    expect(plugin.name).toBe('test-plugin')
  })

  it('should define PluginContext type', () => {
    const ctx: PluginContext = {
      config: { key: 'value' },
      logger: console
    }
    expect(ctx.config).toBeDefined()
  })

  it('should define PluginResult type', () => {
    const result: PluginResult = {
      success: true,
      data: { result: 'ok' }
    }
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/plugin/types.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export interface PluginContext {
  config: Record<string, any>
  logger: Console
}

export interface PluginResult {
  success: boolean
  data?: any
  error?: string
}

export interface Plugin {
  name: string
  version: string
  initialize: (ctx: PluginContext) => Promise<void>
  execute: (input: any) => Promise<PluginResult>
  destroy?: () => Promise<void>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/plugin/types.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/plugin/types.ts tests/plugin/types.test.ts
git commit -m "feat: plugin types for extensible architecture"
```

---

## Task 5: Plugin Loader

**Files:**
- Create: `src/plugin/loader.ts`
- Test: `tests/plugin/loader.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PluginLoader } from '../../src/plugin/loader.js'
import type { Plugin } from '../../src/plugin/types.js'

describe('PluginLoader', () => {
  let loader: PluginLoader

  beforeEach(() => {
    loader = new PluginLoader()
  })

  it('should register plugins', () => {
    const plugin: Plugin = {
      name: 'test',
      version: '1.0.0',
      initialize: async () => {},
      execute: async (input) => ({ output: input })
    }

    loader.register(plugin)
    expect(loader.has('test')).toBe(true)
  })

  it('should initialize plugins', async () => {
    let initialized = false
    const plugin: Plugin = {
      name: 'test',
      version: '1.0.0',
      initialize: async () => { initialized = true },
      execute: async (input) => ({ output: input })
    }

    loader.register(plugin)
    await loader.initializeAll({ config: {}, logger: console })
    expect(initialized).toBe(true)
  })

  it('should get plugins by name', () => {
    const plugin: Plugin = {
      name: 'test',
      version: '1.0.0',
      initialize: async () => {},
      execute: async (input) => ({ output: input })
    }

    loader.register(plugin)
    expect(loader.get('test')).toBe(plugin)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/plugin/loader.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Plugin, PluginContext } from './types.js'

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map()

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin)
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }

  has(name: string): boolean {
    return this.plugins.has(name)
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  async initializeAll(ctx: PluginContext): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.initialize(ctx)
    }
  }

  async destroyAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) {
        await plugin.destroy()
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/plugin/loader.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/plugin/loader.ts tests/plugin/loader.test.ts
git commit -m "feat: plugin loader with lifecycle management"
```

---

## Task 6: Plugin Module Index

**Files:**
- Create: `src/plugin/index.ts`
- Test: `tests/plugin/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { PluginLoader } from '../../src/plugin/index.js'

describe('Plugin Module Index', () => {
  it('should export PluginLoader', () => {
    expect(PluginLoader).toBeDefined()
  })

  it('should create a loader', () => {
    const loader = new PluginLoader()
    expect(loader.getAll().length).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/plugin/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export { PluginLoader } from './loader.js'
export type { Plugin, PluginContext, PluginResult } from './types.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/plugin/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/plugin/index.ts tests/plugin/index.test.ts
git commit -m "feat: plugin module exports"
```

---

## Task 7: Rate Limiter

**Files:**
- Create: `src/security/rate-limiter.ts`
- Test: `tests/security/rate-limiter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter } from '../../src/security/rate-limiter.js'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 })
  })

  it('should allow requests within limit', () => {
    expect(limiter.allow('user1')).toBe(true)
    expect(limiter.allow('user1')).toBe(true)
    expect(limiter.allow('user1')).toBe(true)
  })

  it('should reject requests over limit', () => {
    for (let i = 0; i < 3; i++) {
      limiter.allow('user1')
    }
    expect(limiter.allow('user1')).toBe(false)
  })

  it('should track usage per key', () => {
    limiter.allow('user1')
    limiter.allow('user2')
    expect(limiter.getUsage('user1')).toBe(1)
    expect(limiter.getUsage('user2')).toBe(1)
  })

  it('should reset usage', () => {
    limiter.allow('user1')
    limiter.allow('user1')
    limiter.reset('user1')
    expect(limiter.getUsage('user1')).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/security/rate-limiter.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
interface RateLimiterConfig {
  maxRequests: number
  windowMs: number
}

interface RequestRecord {
  count: number
  resetAt: number
}

export class RateLimiter {
  private config: RateLimiterConfig
  private records: Map<string, RequestRecord> = new Map()

  constructor(config: RateLimiterConfig) {
    this.config = config
  }

  allow(key: string): boolean {
    const now = Date.now()
    const record = this.records.get(key)

    if (!record || now > record.resetAt) {
      this.records.set(key, { count: 1, resetAt: now + this.config.windowMs })
      return true
    }

    if (record.count >= this.config.maxRequests) {
      return false
    }

    record.count++
    return true
  }

  getUsage(key: string): number {
    const record = this.records.get(key)
    if (!record || Date.now() > record.resetAt) {
      return 0
    }
    return record.count
  }

  reset(key: string): void {
    this.records.delete(key)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/security/rate-limiter.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/security/rate-limiter.ts tests/security/rate-limiter.test.ts
git commit -m "feat: rate limiter with sliding window"
```

---

## Task 8: Security Module Index

**Files:**
- Create: `src/security/index.ts`
- Test: `tests/security/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../../src/security/index.js'

describe('Security Module Index', () => {
  it('should export RateLimiter', () => {
    expect(RateLimiter).toBeDefined()
  })

  it('should create a limiter', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 })
    expect(limiter.allow('test')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/security/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export { RateLimiter } from './rate-limiter.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/security/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/security/index.ts tests/security/index.test.ts
git commit -m "feat: security module exports"
```

---

## Task 9: Structured Logger

**Files:**
- Create: `src/logging/logger.ts`
- Test: `tests/logging/logger.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Logger } from '../../src/logging/logger.js'

describe('Logger', () => {
  let logger: Logger
  let logs: any[]

  beforeEach(() => {
    logs = []
    logger = new Logger({
      level: 'info',
      handler: (entry) => logs.push(entry)
    })
  })

  it('should log info messages', () => {
    logger.info('test message')
    expect(logs.length).toBe(1)
    expect(logs[0].level).toBe('info')
  })

  it('should filter by level', () => {
    const debugLogger = new Logger({
      level: 'warn',
      handler: (entry) => logs.push(entry)
    })

    debugLogger.debug('debug message')
    debugLogger.warn('warn message')
    expect(logs.length).toBe(1)
  })

  it('should include metadata', () => {
    logger.info('test', { key: 'value' })
    expect(logs[0].metadata.key).toBe('value')
  })

  it('should include timestamp', () => {
    logger.info('test')
    expect(logs[0].timestamp).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/logging/logger.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  timestamp: number
}

interface LoggerConfig {
  level: LogLevel
  handler: (entry: LogEntry) => void
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

export class Logger {
  private config: LoggerConfig

  constructor(config: LoggerConfig) {
    this.config = config
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata)
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata)
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata)
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata)
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (LOG_LEVELS[level] >= LOG_LEVELS[this.config.level]) {
      this.config.handler({
        level,
        message,
        metadata,
        timestamp: Date.now()
      })
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/logging/logger.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/logging/logger.ts tests/logging/logger.test.ts
git commit -m "feat: structured logger with level filtering"
```

---

## Task 10: Logging Module Index

**Files:**
- Create: `src/logging/index.ts`
- Test: `tests/logging/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { Logger } from '../../src/logging/index.js'

describe('Logging Module Index', () => {
  it('should export Logger', () => {
    expect(Logger).toBeDefined()
  })

  it('should create a logger', () => {
    const logger = new Logger({
      level: 'info',
      handler: () => {}
    })
    expect(logger).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/logging/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export { Logger } from './logger.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/logging/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/logging/index.ts tests/logging/index.test.ts
git commit -m "feat: logging module exports"
```

---

## Task 11: Error Handler

**Files:**
- Create: `src/error/handler.ts`
- Test: `tests/error/handler.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ErrorHandler } from '../../src/error/handler.js'

describe('ErrorHandler', () => {
  let handler: ErrorHandler

  beforeEach(() => {
    handler = new ErrorHandler()
  })

  it('should handle errors', () => {
    const error = new Error('test error')
    const result = handler.handle(error)
    expect(result.handled).toBe(true)
  })

  it('should categorize errors', () => {
    const error = new Error('not found')
    error.name = 'NotFoundError'
    const result = handler.handle(error)
    expect(result.category).toBe('not-found')
  })

  it('should provide recovery suggestions', () => {
    const error = new Error('permission denied')
    const result = handler.handle(error)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('should track error counts', () => {
    handler.handle(new Error('error 1'))
    handler.handle(new Error('error 2'))
    expect(handler.getStats().total).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/error/handler.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
interface ErrorResult {
  handled: boolean
  category: string
  suggestions: string[]
}

interface ErrorStats {
  total: number
  byCategory: Record<string, number>
}

export class ErrorHandler {
  private errors: Error[] = []

  handle(error: Error): ErrorResult {
    this.errors.push(error)

    const category = this.categorize(error)
    const suggestions = this.getSuggestions(error)

    return {
      handled: true,
      category,
      suggestions
    }
  }

  getStats(): ErrorStats {
    const byCategory: Record<string, number> = {}
    for (const error of this.errors) {
      const cat = this.categorize(error)
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }
    return { total: this.errors.length, byCategory }
  }

  private categorize(error: Error): string {
    if (error.message.includes('not found')) return 'not-found'
    if (error.message.includes('permission')) return 'permission'
    if (error.message.includes('timeout')) return 'timeout'
    return 'unknown'
  }

  private getSuggestions(error: Error): string[] {
    const suggestions: string[] = []
    if (error.message.includes('not found')) {
      suggestions.push('check if file or resource exists')
    }
    if (error.message.includes('permission')) {
      suggestions.push('verify access permissions')
    }
    if (error.message.includes('timeout')) {
      suggestions.push('increase timeout or retry')
    }
    return suggestions
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/error/handler.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/error/handler.ts tests/error/handler.test.ts
git commit -m "feat: error handler with categorization and suggestions"
```

---

## Task 12: Error Module Index

**Files:**
- Create: `src/error/index.ts`
- Test: `tests/error/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { ErrorHandler } from '../../src/error/index.js'

describe('Error Module Index', () => {
  it('should export ErrorHandler', () => {
    expect(ErrorHandler).toBeDefined()
  })

  it('should create a handler', () => {
    const handler = new ErrorHandler()
    expect(handler.getStats().total).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/error/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export { ErrorHandler } from './handler.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/error/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/error/index.ts tests/error/index.test.ts
git commit -m "feat: error module exports"
```

---

## Task 13: Metrics Collector

**Files:**
- Create: `src/metrics/collector.ts`
- Test: `tests/metrics/collector.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MetricsCollector } from '../../src/metrics/collector.js'

describe('MetricsCollector', () => {
  let collector: MetricsCollector

  beforeEach(() => {
    collector = new MetricsCollector()
  })

  it('should record counters', () => {
    collector.increment('requests')
    collector.increment('requests')
    expect(collector.getCounter('requests')).toBe(2)
  })

  it('should record gauges', () => {
    collector.setGauge('connections', 5)
    expect(collector.getGauge('connections')).toBe(5)
  })

  it('should record histograms', () => {
    collector.record('latency', 100)
    collector.record('latency', 200)
    collector.record('latency', 300)
    
    const stats = collector.getHistogram('latency')
    expect(stats.avg).toBe(200)
    expect(stats.min).toBe(100)
    expect(stats.max).toBe(300)
  })

  it('should reset metrics', () => {
    collector.increment('requests')
    collector.reset()
    expect(collector.getCounter('requests')).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/metrics/collector.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
interface HistogramStats {
  avg: number
  min: number
  max: number
  count: number
}

export class MetricsCollector {
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()

  increment(name: string, value: number = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value)
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value)
  }

  getGauge(name: string): number {
    return this.gauges.get(name) || 0
  }

  record(name: string, value: number): void {
    const values = this.histograms.get(name) || []
    values.push(value)
    this.histograms.set(name, values)
  }

  getHistogram(name: string): HistogramStats {
    const values = this.histograms.get(name) || []
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 }
    }

    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }
  }

  reset(): void {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/metrics/collector.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/metrics/collector.ts tests/metrics/collector.test.ts
git commit -m "feat: metrics collector with counters, gauges, histograms"
```

---

## Task 14: Metrics Module Index

**Files:**
- Create: `src/metrics/index.ts`
- Test: `tests/metrics/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { MetricsCollector } from '../../src/metrics/index.js'

describe('Metrics Module Index', () => {
  it('should export MetricsCollector', () => {
    expect(MetricsCollector).toBeDefined()
  })

  it('should create a collector', () => {
    const collector = new MetricsCollector()
    expect(collector.getCounter('test')).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/metrics/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export { MetricsCollector } from './collector.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/metrics/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/metrics/index.ts tests/metrics/index.test.ts
git commit -m "feat: metrics module exports"
```

---

## Task 15: Session Manager

**Files:**
- Create: `src/session/manager.ts`
- Test: `tests/session/manager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { SessionManager } from '../../src/session/manager.js'

describe('SessionManager', () => {
  let manager: SessionManager

  beforeEach(() => {
    manager = new SessionManager({ timeoutMs: 1000 })
  })

  it('should create sessions', () => {
    const session = manager.create('user1')
    expect(session.id).toBeDefined()
    expect(session.userId).toBe('user1')
  })

  it('should get active sessions', () => {
    manager.create('user1')
    manager.create('user2')
    expect(manager.getActive().length).toBe(2)
  })

  it('should expire sessions', async () => {
    const shortManager = new SessionManager({ timeoutMs: 10 })
    shortManager.create('user1')
    
    await new Promise(resolve => setTimeout(resolve, 20))
    
    expect(shortManager.getActive().length).toBe(0)
  })

  it('should destroy sessions', () => {
    const session = manager.create('user1')
    manager.destroy(session.id)
    expect(manager.get(session.id)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/session/manager.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
interface Session {
  id: string
  userId: string
  createdAt: number
  lastAccessedAt: number
}

interface SessionManagerConfig {
  timeoutMs: number
}

export class SessionManager {
  private config: SessionManagerConfig
  private sessions: Map<string, Session> = new Map()

  constructor(config: SessionManagerConfig) {
    this.config = config
  }

  create(userId: string): Session {
    const session: Session = {
      id: `s${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    }
    this.sessions.set(session.id, session)
    return session
  }

  get(id: string): Session | undefined {
    const session = this.sessions.get(id)
    if (session && Date.now() - session.lastAccessedAt > this.config.timeoutMs) {
      this.sessions.delete(id)
      return undefined
    }
    if (session) {
      session.lastAccessedAt = Date.now()
    }
    return session
  }

  destroy(id: string): void {
    this.sessions.delete(id)
  }

  getActive(): Session[] {
    const now = Date.now()
    return Array.from(this.sessions.values()).filter(
      s => now - s.lastAccessedAt <= this.config.timeoutMs
    )
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/session/manager.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/session/manager.ts tests/session/manager.test.ts
git commit -m "feat: session manager with timeout expiration"
```

---

## Task 16: Session Module Index

**Files:**
- Create: `src/session/index.ts`
- Test: `tests/session/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { SessionManager } from '../../src/session/index.js'

describe('Session Module Index', () => {
  it('should export SessionManager', () => {
    expect(SessionManager).toBeDefined()
  })

  it('should create a manager', () => {
    const manager = new SessionManager({ timeoutMs: 60000 })
    expect(manager.getActive().length).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/session/index.test.ts
```

- [ ] **Step 3: Write minimal implementation**

```typescript
export { SessionManager } from './manager.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/session/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/session/index.ts tests/session/index.test.ts
git commit -m "feat: session module exports"
```

---

## Task 17: Update Main Index

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update main exports**

```typescript
export * from './graph/index.js'
export * from './compress/index.js'
export * from './cache/index.js'
export * from './route/index.js'
export * from './tool/index.js'
export * from './adapter/index.js'
export * from './learn/index.js'
export * from './correct/index.js'
export * from './middleware/index.js'
export * from './plugin/index.js'
export * from './security/index.js'
export * from './logging/index.js'
export * from './error/index.js'
export * from './metrics/index.js'
export * from './session/index.js'
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: update main exports with Phase 4 modules"
```

---

## Task 18: Phase 4 Integration Test

**Files:**
- Create: `tests/integration-phase4.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, it, expect } from 'vitest'
import { Pipeline } from '../src/middleware/index.js'
import { PluginLoader } from '../src/plugin/index.js'
import { RateLimiter } from '../src/security/index.js'
import { Logger } from '../src/logging/index.js'
import { ErrorHandler } from '../src/error/index.js'
import { MetricsCollector } from '../src/metrics/index.js'
import { SessionManager } from '../src/session/index.js'

describe('Phase 4 Integration', () => {
  it('should chain middleware pipeline', async () => {
    const pipeline = new Pipeline()
    pipeline.use(async (ctx, next) => {
      ctx.metadata.enhanced = true
      return next(ctx)
    })

    const result = await pipeline.execute({ input: {}, metadata: {} })
    expect(result.metadata.enhanced).toBe(true)
  })

  it('should load and execute plugins', async () => {
    const loader = new PluginLoader()
    loader.register({
      name: 'test',
      version: '1.0.0',
      initialize: async () => {},
      execute: async (input) => ({ success: true, data: input })
    })

    await loader.initializeAll({ config: {}, logger: console })
    const plugin = loader.get('test')
    const result = await plugin!.execute({ test: true })
    expect(result.success).toBe(true)
  })

  it('should rate limit requests', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 })
    expect(limiter.allow('user1')).toBe(true)
    expect(limiter.allow('user1')).toBe(true)
    expect(limiter.allow('user1')).toBe(false)
  })

  it('should collect metrics', () => {
    const metrics = new MetricsCollector()
    metrics.increment('requests')
    metrics.increment('requests')
    metrics.setGauge('connections', 5)
    
    expect(metrics.getCounter('requests')).toBe(2)
    expect(metrics.getGauge('connections')).toBe(5)
  })

  it('should manage sessions', () => {
    const sessionManager = new SessionManager({ timeoutMs: 60000 })
    const session = sessionManager.create('user1')
    expect(sessionManager.get(session.id)).toBeDefined()
  })

  it('should handle errors with suggestions', () => {
    const handler = new ErrorHandler()
    const result = handler.handle(new Error('file not found'))
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('should log structured messages', () => {
    const logs: any[] = []
    const logger = new Logger({
      level: 'info',
      handler: (entry) => logs.push(entry)
    })
    
    logger.info('test message', { key: 'value' })
    expect(logs.length).toBe(1)
    expect(logs[0].message).toBe('test message')
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run tests/integration-phase4.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration-phase4.test.ts
git commit -m "test: Phase 4 integration test for production features"
```

---

## Task 19: Final Build & Verify

- [ ] **Step 1: Run all tests**

```bash
npm test
```

- [ ] **Step 2: Build project**

```bash
npm run build
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: Phase 4 production readiness complete"
```

---

## Summary

Phase 4 delivers:

1. **Middleware Pipeline** — Chain handlers with context passing
2. **Plugin System** — Extensible architecture with lifecycle
3. **Rate Limiter** — Prevent abuse with sliding window
4. **Structured Logger** — Level filtering with metadata
5. **Error Handler** — Categorization with recovery suggestions
6. **Metrics Collector** — Counters, gauges, histograms
7. **Session Manager** — Timeout-based session expiration
