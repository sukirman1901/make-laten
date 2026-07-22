import { describe, it, expect } from 'vitest'
import type { ToolRoute, StrategyRoute, RouteInput } from '../../src/route/types.js'

describe('Router Types', () => {
  it('should define ToolRoute type', () => {
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
