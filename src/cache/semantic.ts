import type { SemanticCacheEntry, SemanticSearchResult } from './types.js'

export class SemanticCache {
  private entries: SemanticCacheEntry[] = []

  store(content: string, embedding: number[], metadata: Record<string, any> = {}): SemanticCacheEntry {
    const entry: SemanticCacheEntry = {
      id: `sc${this.entries.length + 1}`,
      content,
      embedding,
      metadata,
      createdAt: Date.now()
    }
    this.entries.push(entry)
    return entry
  }

  search(query: number[], minSimilarity: number = 0.8): SemanticSearchResult[] {
    const results: SemanticSearchResult[] = []

    for (const entry of this.entries) {
      const similarity = this.cosineSimilarity(query, entry.embedding)
      if (similarity >= minSimilarity) {
        results.push({ entry, similarity })
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity)
  }

  getAll(): SemanticCacheEntry[] {
    return this.entries
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}