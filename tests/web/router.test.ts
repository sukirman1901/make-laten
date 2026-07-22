import { describe, it, expect } from 'vitest'
import { WebRouter } from '../../src/web/router.js'

describe('WebRouter', () => {
  it('should create router', () => {
    const router = new WebRouter()
    expect(router).toBeDefined()
  })

  it('should manage cache stats', () => {
    const router = new WebRouter()
    const stats = router.getCacheStats()
    expect(stats.fetchSize).toBe(0)
    expect(stats.searchSize).toBe(0)
  })

  it('should clear cache', () => {
    const router = new WebRouter()
    router.clearCache()
    const stats = router.getCacheStats()
    expect(stats.fetchSize).toBe(0)
    expect(stats.searchSize).toBe(0)
  })

  it('should summarize content', async () => {
    const router = new WebRouter()
    const content = `# Title\n## Section\n- Point 1\n- Point 2\nSome other text here`
    const summary = await router.summarize(content)
    expect(summary).toContain('Title')
  })
})
