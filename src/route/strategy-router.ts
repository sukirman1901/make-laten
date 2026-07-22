import type { RouteContext, StrategyRoute, StrategyType } from './types.js'

export class StrategyRouter {
  private thresholds = {
    small: 500,
    large: 5000
  }

  select(context: RouteContext): StrategyRoute {
    if (context.userPreference) {
      return {
        strategy: context.userPreference,
        reason: `User preference: ${context.userPreference}`,
        savings: this.estimateSavings(context.userPreference)
      }
    }

    const fileSize = context.fileSize || 0

    if (fileSize >= this.thresholds.large) {
      return {
        strategy: 'aggressive',
        reason: `large file (${fileSize} bytes)`,
        savings: 0.6
      }
    }

    if (fileSize <= this.thresholds.small) {
      return {
        strategy: 'conservative',
        reason: `small file (${fileSize} bytes)`,
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
