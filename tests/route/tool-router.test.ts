import { describe, it, expect } from 'vitest'
import { ToolRouter } from '../../src/route/tool-router.js'

describe('ToolRouter', () => {
  const router = new ToolRouter()

  it('should route file reads to file-read compressor', () => {
    const route = router.route({
      type: 'file',
      content: 'const x = 1',
      metadata: { filePath: 'src/main.ts' }
    })
    expect(route.compressor).toBe('file-read')
    expect(route.confidence).toBeGreaterThan(0.8)
  })

  it('should route grep results to grep compressor', () => {
    const route = router.route({
      type: 'grep',
      content: 'src/a.ts:1:TODO fix this',
      metadata: { pattern: 'TODO' }
    })
    expect(route.compressor).toBe('grep')
    expect(route.confidence).toBeGreaterThan(0.8)
  })

  it('should route git diffs to git-diff compressor', () => {
    const route = router.route({
      type: 'git-diff',
      content: 'diff --git a/src/main.ts b/src/main.ts',
      metadata: { repo: '/path/to/repo' }
    })
    expect(route.compressor).toBe('git-diff')
    expect(route.confidence).toBeGreaterThan(0.8)
  })

  it('should return low confidence for unknown types', () => {
    const route = router.route({
      type: 'unknown',
      content: 'some random content'
    })
    expect(route.confidence).toBeLessThan(0.5)
  })
})