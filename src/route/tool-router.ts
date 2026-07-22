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