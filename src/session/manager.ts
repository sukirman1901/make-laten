interface Session {
  id: string
  userId: string
  createdAt: number
  lastAccessedAt: number
}

interface SessionManagerConfig {
  timeoutMs: number
}

export class SessionManager {
  private config: SessionManagerConfig
  private sessions: Map<string, Session> = new Map()

  constructor(config: SessionManagerConfig) {
    this.config = config
  }

  create(userId: string): Session {
    const session: Session = {
      id: `s${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    }
    this.sessions.set(session.id, session)
    return session
  }

  get(id: string): Session | undefined {
    const session = this.sessions.get(id)
    if (session && Date.now() - session.lastAccessedAt > this.config.timeoutMs) {
      this.sessions.delete(id)
      return undefined
    }
    if (session) {
      session.lastAccessedAt = Date.now()
    }
    return session
  }

  destroy(id: string): void {
    this.sessions.delete(id)
  }

  getActive(): Session[] {
    const now = Date.now()
    return Array.from(this.sessions.values()).filter(
      s => now - s.lastAccessedAt <= this.config.timeoutMs
    )
  }
}