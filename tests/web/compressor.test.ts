import { describe, it, expect } from 'vitest'
import { compressWebContent } from '../../src/web/compressor.js'
import type { SemanticIR } from '../../src/web/types.js'

describe('WebCompressor', () => {
  const sampleSemantic: SemanticIR = {
    type: 'webpage',
    url: 'https://example.com',
    title: 'Test Page',
    purpose: 'documentation',
    sections: [
      { heading: 'Intro', level: 1, content: 'This is the introduction content.', importance: 'primary' },
      { heading: 'Details', level: 2, content: 'More detailed information here.', importance: 'secondary' }
    ],
    keyPoints: ['Point 1', 'Point 2'],
    codeExamples: [
      { language: 'typescript', code: 'const x = 42' }
    ],
    metadata: { language: 'en' }
  }

  it('should compress to readable format', () => {
    const result = compressWebContent(sampleSemantic)
    expect(result).toContain('# Test Page')
    expect(result).toContain('URL: https://example.com')
  })

  it('should include key points', () => {
    const result = compressWebContent(sampleSemantic)
    expect(result).toContain('Point 1')
    expect(result).toContain('Point 2')
  })

  it('should include sections', () => {
    const result = compressWebContent(sampleSemantic)
    expect(result).toContain('Intro')
  })

  it('should include code examples', () => {
    const result = compressWebContent(sampleSemantic)
    expect(result).toContain('```typescript')
  })

  it('should respect maxTokens', () => {
    const result = compressWebContent(sampleSemantic, { maxTokens: 50 })
    expect(result.length).toBeLessThanOrEqual(250)
  })

  it('should filter sections by primary only', () => {
    const result = compressWebContent(sampleSemantic, { includeSections: 'primary' })
    expect(result).toContain('Intro')
    expect(result).not.toContain('Details')
  })

  it('should exclude code when disabled', () => {
    const result = compressWebContent(sampleSemantic, { includeCode: false })
    expect(result).not.toContain('```')
  })
})
