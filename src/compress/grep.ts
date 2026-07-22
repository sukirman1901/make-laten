import type { Compressor, CompressedResult, GrepInput } from './types.js'
import { calculateConfidence } from './confidence.js'

export class GrepCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { results } = input as GrepInput
    
    // Group by file
    const grouped = this.groupByFile(results)
    
    // Format output
    const lines: string[] = []
    for (const [file, matches] of grouped) {
      lines.push(`${file} (${matches.length} matches)`)
      const unique = this.deduplicate(matches)
      for (const match of unique) {
        lines.push(`  L${match.line}: ${match.content}`)
      }
    }
    
    const compressed = lines.join('\n')
    const original = results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n')
    
    return {
      content: compressed,
      original,
      confidence: calculateConfidence(original, compressed),
      metadata: {
        strategy: 'grouped',
        totalMatches: results.length,
        uniqueFiles: grouped.size,
        savings: 1 - (compressed.length / original.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }

  private groupByFile(results: GrepInput['results']): Map<string, GrepInput['results']> {
    const grouped = new Map<string, GrepInput['results']>()
    
    for (const result of results) {
      const existing = grouped.get(result.file) || []
      existing.push(result)
      grouped.set(result.file, existing)
    }
    
    return grouped
  }

  private deduplicate(matches: GrepInput['results']): GrepInput['results'] {
    const seen = new Set<string>()
    return matches.filter(match => {
      const key = match.content.trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}
