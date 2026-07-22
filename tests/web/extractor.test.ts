import { describe, it, expect } from 'vitest'
import { extractSemantic } from '../../src/web/extractor.js'

describe('SemanticExtractor', () => {
  const sampleHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head><title>Test Documentation</title></head>
    <body>
      <h1>Getting Started with TypeScript</h1>
      <p>Introduction to TypeScript programming language.</p>

      <h2>Installation</h2>
      <p>Install TypeScript using npm. Run npm install to get started.</p>

      <h2>Basic Types</h2>
      <p>TypeScript has several basic types including string, number, boolean.</p>

      <h3>Code Example</h3>
      <pre><code class="language-typescript">
        const x: number = 42;
        const y: string = "hello";
      </code></pre>

      <h2>Configuration</h2>
      <p>Configure your project with tsconfig.json file.</p>

      <meta name="author" content="Test Author">
      <meta name="keywords" content="typescript, programming, types">
    </body>
    </html>
  `

  it('should extract title', () => {
    const semantic = extractSemantic(sampleHTML, 'https://example.com')
    expect(semantic.title).toBe('Test Documentation')
  })

  it('should extract sections', () => {
    const semantic = extractSemantic(sampleHTML, 'https://example.com')
    expect(semantic.sections.length).toBeGreaterThan(0)
    expect(semantic.sections[0].heading).toBeDefined()
  })

  it('should classify purpose', () => {
    const semantic = extractSemantic(sampleHTML, 'https://example.com')
    expect(['documentation', 'tutorial']).toContain(semantic.purpose)
  })

  it('should extract code examples', () => {
    const semantic = extractSemantic(sampleHTML, 'https://example.com')
    expect(semantic.codeExamples.length).toBeGreaterThan(0)
    expect(semantic.codeExamples[0].language).toBe('typescript')
  })

  it('should extract metadata', () => {
    const semantic = extractSemantic(sampleHTML, 'https://example.com')
    expect(semantic.metadata.author).toBe('Test Author')
    expect(semantic.metadata.tags).toContain('typescript')
  })

  it('should set correct URL', () => {
    const semantic = extractSemantic(sampleHTML, 'https://example.com')
    expect(semantic.url).toBe('https://example.com')
  })
})
