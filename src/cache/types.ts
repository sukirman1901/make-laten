export interface SemanticCacheEntry {
  id: string
  content: string
  embedding: number[]
  metadata: Record<string, any>
  createdAt: number
}

export interface SemanticSearchResult {
  entry: SemanticCacheEntry
  similarity: number
}
