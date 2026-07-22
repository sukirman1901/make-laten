import { WebRouter } from '../../web/router.js'

export async function searchCommand(query: string, options: { backend?: string; max?: number }): Promise<void> {
  try {
    const router = new WebRouter()

    const results = await router.search(query, {
      maxResults: options.max || 5,
      backend: options.backend
    })

    console.log(JSON.stringify({
      query,
      total: results.length,
      results: results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        score: r.score
      }))
    }, null, 2))
  } catch (error: any) {
    console.error(`Error search:`, error.message)
    process.exit(1)
  }
}

export async function fetchCommand(url: string, options: { compress?: boolean; extract?: boolean }): Promise<void> {
  try {
    const router = new WebRouter()

    const result = await router.fetch(url, {
      compress: options.compress !== false,
      extract: options.extract !== false,
      cache: true
    })

    console.log(JSON.stringify({
      url: result.url,
      title: result.title,
      content: result.content,
      metadata: result.metadata
    }, null, 2))
  } catch (error: any) {
    console.error(`Error fetch:`, error.message)
    process.exit(1)
  }
}
