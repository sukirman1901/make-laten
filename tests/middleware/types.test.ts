import { describe, it, expect } from 'vitest'
import * as MiddlewareTypes from '../../src/middleware/types.js'

describe('Middleware Types', () => {
  it('should define Middleware type', () => {
    expect(MiddlewareTypes).toBeDefined()
    const middleware: MiddlewareTypes.Middleware = async (ctx, next) => {
      return next(ctx)
    }
    expect(typeof middleware).toBe('function')
  })

  it('should define MiddlewareContext type', () => {
    const ctx: MiddlewareTypes.MiddlewareContext = {
      input: { test: 'value' },
      metadata: { timestamp: Date.now() }
    }
    expect(ctx.input).toBeDefined()
  })

  it('should define MiddlewareResult type', () => {
    const result: MiddlewareTypes.MiddlewareResult = {
      output: { result: 'success' },
      metadata: {}
    }
    expect(result.output).toBeDefined()
  })
})