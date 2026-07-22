import { describe, it, expect, vi } from 'vitest'
import { DuckDuckGoBackend } from '../../src/web/backends/duckduckgo.js'

describe('DuckDuckGoBackend', () => {
  const backend = new DuckDuckGoBackend()

  it('should have correct name', () => {
    expect(backend.name).toBe('duckduckgo')
  })

  it('should be available', () => {
    expect(backend.isAvailable()).toBe(true)
  })

  it('should parse HTML results', () => {
    const html = `
      <a class="result__a" href="https://example.com?uddg=https%3A%2F%2Fdocs.example.com">TypeScript Docs</a>
      <a class="result__snippet">Official TypeScript documentation and guides.</a>
    `

    const results = (backend as any).parseResults(html, 5)
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('TypeScript Docs')
    expect(results[0].url).toContain('docs.example.com')
  })

  it('should strip HTML tags', () => {
    const result = (backend as any).stripTags('<b>bold</b> and <i>italic</i>')
    expect(result).toBe('bold and italic')
  })
})
