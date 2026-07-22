import { describe, it, expect } from 'vitest'
import { StrategyRouter } from '../../src/route/strategy-router.js'

describe('StrategyRouter', () => {
  const router = new StrategyRouter()

  it('should select aggressive strategy for large files', () => {
    const strategy = router.select({
      fileSize: 10000,
      tokenBudget: 4000
    })
    expect(strategy.strategy).toBe('aggressive')
    expect(strategy.reason).toContain('large')
  })

  it('should select conservative strategy for small files', () => {
    const strategy = router.select({
      fileSize: 100,
      tokenBudget: 4000
    })
    expect(strategy.strategy).toBe('conservative')
    expect(strategy.reason).toContain('small')
  })

  it('should select balanced strategy for medium files', () => {
    const strategy = router.select({
      fileSize: 1000,
      tokenBudget: 4000
    })
    expect(strategy.strategy).toBe('balanced')
  })

  it('should respect user preference', () => {
    const strategy = router.select({
      fileSize: 10000,
      tokenBudget: 4000,
      userPreference: 'conservative'
    })
    expect(strategy.strategy).toBe('conservative')
  })
})
