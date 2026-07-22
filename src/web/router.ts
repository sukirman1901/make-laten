import type { SearchOptions, SearchResult, FetchOptions, FetchResult } from './types.js'
import { selectBackend } from './backends/index.js'
import { extractSemantic } from './extractor.js'
import { compressWebContent } from './compressor.js'

export class WebRouter {
  private fetchCache: Map<string, FetchResult> = new Map()
  private searchCache: Map<string, SearchResult[]> = new Map()
  private cacheTtl: number

  constructor(options?: { cacheTtlMs?: number }) {
    this.cacheTtl = options?.cacheTtlMs || 60 * 60 * 1000
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const cacheKey = `search:${query}:${JSON.stringify(options || {})}`

    const cached = this.searchCache.get(cacheKey)
    if (cached && this.isFresh(cacheKey)) {
      return cached
    }

    const backend = selectBackend(options?.backend)
    const results = await backend.search(query, options)

    this.searchCache.set(cacheKey, results)
    this.storeFreshness(cacheKey)

    return results
  }

  async fetch(url: string, options?: FetchOptions): Promise<FetchResult> {
    const cacheKey = `fetch:${url}:${options?.format || 'text'}`

    if (options?.cache !== false) {
      const cached = this.fetchCache.get(cacheKey)
      if (cached && this.isFresh(cacheKey)) {
        return cached
      }
    }

    const startTime = Date.now()
    const response = await fetch(url)
    const html = await response.text()
    const originalSize = html.length

    let content: string
    let semantic = undefined

    if (options?.extract !== false) {
      semantic = extractSemantic(html, url)
      content = compressWebContent(semantic, {
        includeCode: true,
        includeSections: options?.format === 'html' ? 'all' : 'primary'
      })
    } else {
      content = html
    }

    const compressedSize = content.length
    const result: FetchResult = {
      url,
      title: semantic?.title || extractSimpleTitle(html),
      content,
      semantic,
      metadata: {
        fetchTime: Date.now() - startTime,
        originalSize,
        compressedSize,
        savings: 1 - (compressedSize / originalSize)
      }
    }

    if (options?.cache !== false) {
      this.fetchCache.set(cacheKey, result)
      this.storeFreshness(cacheKey)
    }

    return result
  }

  async extract(url: string): Promise<FetchResult> {
    return this.fetch(url, { extract: true, compress: true })
  }

  async summarize(content: string, options?: { maxTokens?: number }): Promise<string> {
    const lines = content.split('\n')
    const summaryLines: string[] = []
    let tokenCount = 0
    const maxTokens = options?.maxTokens || 200

    for (const line of lines) {
      const lineTokens = Math.ceil(line.length / 4)
      if (tokenCount + lineTokens > maxTokens) break

      if (line.startsWith('#') || line.startsWith('-') || line.startsWith('*')) {
        summaryLines.push(line)
        tokenCount += lineTokens
      }
    }

    if (summaryLines.length === 0 && lines.length > 0) {
      for (const line of lines.slice(0, 5)) {
        const lineTokens = Math.ceil(line.length / 4)
        if (tokenCount + lineTokens > maxTokens) break
        summaryLines.push(line)
        tokenCount += lineTokens
      }
    }

    return summaryLines.join('\n')
  }

  clearCache(): void {
    this.fetchCache.clear()
    this.searchCache.clear()
  }

  getCacheStats(): { fetchSize: number; searchSize: number } {
    return {
      fetchSize: this.fetchCache.size,
      searchSize: this.searchCache.size
    }
  }

  private isFresh(key: string): boolean {
    const timestamp = this.freshness.get(key)
    if (!timestamp) return false
    return Date.now() - timestamp < this.cacheTtl
  }

  private storeFreshness(key: string): void {
    this.freshness.set(key, Date.now())
  }

  private freshness: Map<string, number> = new Map()
}

function extractSimpleTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Untitled'
}
