import type { WebBackend, SearchOptions, SearchResult } from '../types.js'
import { DuckDuckGoBackend } from './duckduckgo.js'

export { DuckDuckGoBackend } from './duckduckgo.js'

export function selectBackend(preferred?: string): WebBackend {
  const backends: WebBackend[] = [
    new DuckDuckGoBackend()
  ]

  if (preferred) {
    const found = backends.find(b => b.name === preferred)
    if (found) return found
  }

  return backends.find(b => b.isAvailable()) || backends[0]
}
