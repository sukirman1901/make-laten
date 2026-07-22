import type { WebBackend, SearchOptions, SearchResult } from '../types.js'

export class DuckDuckGoBackend implements WebBackend {
  name = 'duckduckgo'

  isAvailable(): boolean {
    return true
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const maxResults = options?.maxResults || 5

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; make-laten/0.1.0)'
      }
    })

    const html = await response.text()
    return this.parseResults(html, maxResults)
  }

  private parseResults(html: string, maxResults: number): SearchResult[] {
    const results: SearchResult[] = []
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
    let match: RegExpExecArray | null

    const urls: string[] = []
    const titles: string[] = []

    while ((match = resultRegex.exec(html)) !== null && urls.length < maxResults) {
      const rawUrl = match[1]
      const urlMatch = rawUrl.match(/uddg=([^&]+)/)
      const url = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl
      const title = this.stripTags(match[2]).trim()

      if (url && title) {
        urls.push(url)
        titles.push(title)
      }
    }

    const snippets: string[] = []
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
      snippets.push(this.stripTags(match[1]).trim())
    }

    for (let i = 0; i < urls.length; i++) {
      results.push({
        title: titles[i],
        url: urls[i],
        snippet: snippets[i] || '',
        score: 1 - (i * 0.1)
      })
    }

    return results
  }

  private stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
  }
}
