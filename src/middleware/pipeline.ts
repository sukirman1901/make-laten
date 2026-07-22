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
