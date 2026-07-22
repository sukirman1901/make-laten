import type { Compressor, CompressedResult, GitDiffInput } from './types.js'
import { calculateConfidence } from './confidence.js'

export class GitDiffCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { diff } = input as GitDiffInput
    
    // Parse diff into hunks
    const hunks = this.parseDiff(diff)
    
    // Condense each hunk
    const condensed = hunks.map(hunk => ({
      file: hunk.file,
      changes: this.condenseHunk(hunk),
      stats: { additions: hunk.additions, deletions: hunk.deletions }
    }))
    
    // Format output
    const lines: string[] = []
    for (const hunk of condensed) {
      if (hunk.changes.length > 0) {
        lines.push(`${hunk.file} (+${hunk.stats.additions} -${hunk.stats.deletions})`)
        lines.push(...hunk.changes)
      }
    }
    
    const compressed = lines.join('\n')
    
    return {
      content: compressed,
      original: diff,
      confidence: calculateConfidence(diff, compressed),
      metadata: {
        strategy: 'condensed',
        filesChanged: condensed.length,
        savings: 1 - (compressed.length / diff.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }

  private parseDiff(diff: string): Hunk[] {
    const hunks: Hunk[] = []
    const lines = diff.split('\n')
    
    let currentHunk: Hunk | null = null
    
    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentHunk) hunks.push(currentHunk)
        const fileMatch = line.match(/b\/(.+)/)
        currentHunk = {
          file: fileMatch?.[1] || 'unknown',
          lines: [],
          additions: 0,
          deletions: 0
        }
      } else if (currentHunk) {
        if (line.startsWith('+')) {
          currentHunk.additions++
          currentHunk.lines.push({ type: 'addition', content: line.slice(1) })
        } else if (line.startsWith('-')) {
          currentHunk.deletions++
          currentHunk.lines.push({ type: 'deletion', content: line.slice(1) })
        }
      }
    }
    
    if (currentHunk) hunks.push(currentHunk)
    return hunks
  }

  private condenseHunk(hunk: Hunk): string[] {
    return hunk.lines
      .filter(l => l.type === 'addition' || l.type === 'deletion')
      .map(l => `${l.type === 'addition' ? '+' : '-'} ${l.content}`)
  }
}

interface Hunk {
  file: string
  lines: { type: string; content: string }[]
  additions: number
  deletions: number
}
