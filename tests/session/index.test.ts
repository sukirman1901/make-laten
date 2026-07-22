import { describe, it, expect } from 'vitest'
import { SessionManager } from '../../src/session/index.js'

describe('Session Module Index', () => {
  it('should export SessionManager', () => {
    expect(SessionManager).toBeDefined()
  })

  it('should create a manager', () => {
    const manager = new SessionManager({ timeoutMs: 60000 })
    expect(manager.getActive().length).toBe(0)
  })
})