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
