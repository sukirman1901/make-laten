import { describe, it, expect, beforeEach } from 'vitest'
import { SessionManager } from '../../src/session/manager.js'

describe('SessionManager', () => {
  let manager: SessionManager

  beforeEach(() => {
    manager = new SessionManager({ timeoutMs: 1000 })
  })

  it('should create sessions', () => {
    const session = manager.create('user1')
    expect(session.id).toBeDefined()
    expect(session.userId).toBe('user1')
  })

  it('should get active sessions', () => {
    manager.create('user1')
    manager.create('user2')
    expect(manager.getActive().length).toBe(2)
  })

  it('should expire sessions', async () => {
    const shortManager = new SessionManager({ timeoutMs: 10 })
    shortManager.create('user1')
    
    await new Promise(resolve => setTimeout(resolve, 20))
    
    expect(shortManager.getActive().length).toBe(0)
  })

  it('should destroy sessions', () => {
    const session = manager.create('user1')
    manager.destroy(session.id)
    expect(manager.get(session.id)).toBeUndefined()
  })
})