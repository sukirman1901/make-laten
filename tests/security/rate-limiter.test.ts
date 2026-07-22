import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter } from '../../src/security/rate-limiter.js'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 })
  })

  it('should allow requests within limit', () => {
    expect(limiter.allow('user1')).toBe(true)
    expect(limiter.allow('user1')).toBe(true)
    expect(limiter.allow('user1')).toBe(true)
  })

  it('should reject requests over limit', () => {
    for (let i = 0; i < 3; i++) {
      limiter.allow('user1')
    }
    expect(limiter.allow('user1')).toBe(false)
  })

  it('should track usage per key', () => {
    limiter.allow('user1')
    limiter.allow('user2')
    expect(limiter.getUsage('user1')).toBe(1)
    expect(limiter.getUsage('user2')).toBe(1)
  })

  it('should reset usage', () => {
    limiter.allow('user1')
    limiter.allow('user1')
    limiter.reset('user1')
    expect(limiter.getUsage('user1')).toBe(0)
  })
})