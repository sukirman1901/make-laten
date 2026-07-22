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
