export interface CacheEntry {
  content: string
  metadata: Record<string, any>
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

export class SessionCache {
  private store = new Map<string, CacheEntry>()
  private hits = 0
  private misses = 0

  get(key: string): CacheEntry | null {
    const entry = this.store.get(key)
    if (entry) {
      this.hits++
      return entry
    }
    this.misses++
    return null
  }

  set(key: string, value: CacheEntry): void {
    this.store.set(key, value)
  }

  clear(): void {
    this.store.clear()
    this.hits = 0
    this.misses = 0
  }

  stats(): CacheStats {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      hitRate: total > 0 ? this.hits / total : 0
    }
  }
}
