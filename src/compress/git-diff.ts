import type { Compressor, CompressedResult, GitDiffInput } from './types.js'
import { calculateConfidence } from './confidence.js'

export class GitDiffCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { diff } = input as GitDiffInput

    const files = this.parseDiff(diff)

    const lines: string[] = []

    const totalAdd = files.reduce((s, f) => s + f.additions, 0)
    const totalDel = files.reduce((s, f) => s + f.deletions, 0)
    lines.push(`# ${files.length} files changed: +${totalAdd} -${totalDel}`)
    lines.push('')

    for (const file of files) {
      lines.push(`${file.path} (+${file.additions} -${file.deletions})`)

      const changes = file.lines
        .filter(l => l.type === 'add' || l.type === 'del')
        .map(l => `${l.type === 'add' ? '+' : '-'}${l.content}`)

      const limited = changes.slice(0, 20)
      lines.push(...limited)

      if (changes.length > 20) {
        lines.push(`... [${changes.length - 20} more changes]`)
      }

      lines.push('')
    }

    const compressed = lines.join('\n')

    return {
      content: compressed,
      original: diff,
      confidence: calculateConfidence(diff, compressed),
      metadata: {
        strategy: 'condensed',
        filesChanged: files.length,
        savings: 1 - (compressed.length / diff.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }

  private parseDiff(diff: string): FileDiff[] {
    const files: FileDiff[] = []
    const lines = diff.split('\n')

    let current: FileDiff | null = null

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (current) files.push(current)
        const match = line.match(/b\/(.+)/)
        current = {
          path: match?.[1] || 'unknown',
          additions: 0,
          deletions: 0,
          lines: []
        }
      } else if (current) {
        if (line.startsWith('+')) {
          current.additions++
          current.lines.push({ type: 'add', content: line.slice(1) })
        } else if (line.startsWith('-')) {
          current.deletions++
          current.lines.push({ type: 'del', content: line.slice(1) })
        }
      }
    }

    if (current) files.push(current)
    return files
  }
}

interface FileDiff {
  path: string
  additions: number
  deletions: number
  lines: { type: string; content: string }[]
}
