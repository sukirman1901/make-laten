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
