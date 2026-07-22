import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../../src/security/index.js'

describe('Security Module Index', () => {
  it('should export RateLimiter', () => {
    expect(RateLimiter).toBeDefined()
  })

  it('should create a limiter', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 })
    expect(limiter.allow('test')).toBe(true)
  })
})