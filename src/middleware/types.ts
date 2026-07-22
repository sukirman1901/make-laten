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
