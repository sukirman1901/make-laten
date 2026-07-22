interface RateLimiterConfig {
  maxRequests: number
  windowMs: number
}

interface RequestRecord {
  count: number
  resetAt: number
}

export class RateLimiter {
  private config: RateLimiterConfig
  private records: Map<string, RequestRecord> = new Map()

  constructor(config: RateLimiterConfig) {
    this.config = config
  }

  allow(key: string): boolean {
    const now = Date.now()
    const record = this.records.get(key)

    if (!record || now > record.resetAt) {
      this.records.set(key, { count: 1, resetAt: now + this.config.windowMs })
      return true
    }

    if (record.count >= this.config.maxRequests) {
      return false
    }

    record.count++
    return true
  }

  getUsage(key: string): number {
    const record = this.records.get(key)
    if (!record || Date.now() > record.resetAt) {
      return 0
    }
    return record.count
  }

  reset(key: string): void {
    this.records.delete(key)
  }
}