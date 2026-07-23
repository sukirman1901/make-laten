import type { Compressor, CompressedResult } from './types.js'
import { calculateConfidence } from './confidence.js'

export class GitStatusCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { status } = input as { status: string }

    const statusLines = status.split('\n').filter(Boolean).length
    const files = this.parseStatus(status)
    const grouped = this.groupByStatus(files)

    const lines: string[] = []

    for (const [statusType, statusFiles] of grouped) {
      const label = this.statusLabel(statusType)
      lines.push(`${label} (${statusFiles.length})`)

      const compressed = this.compressPaths(statusFiles.map(f => f.path))
      lines.push(...compressed)
      lines.push('')
    }

    const compressed = lines.join('\n')

    if (compressed.length >= status.length) {
      return {
        content: status,
        original: status,
        confidence: 1.0,
        metadata: {
          strategy: 'passthrough',
          totalFiles: files.length,
          savings: 0
        }
      }
    }

    return {
      content: compressed,
      original: status,
      confidence: calculateConfidence(status, compressed),
      metadata: {
        strategy: 'grouped',
        totalFiles: files.length,
        savings: 1 - (compressed.length / status.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }

  private parseStatus(status: string): { status: string; path: string }[] {
    return status.split('\n')
      .filter(Boolean)
      .map(line => {
        const match = line.match(/^(\?\?|[MADRC]+\s+)(.+)$/)
        if (match) {
          return { status: match[1].trim(), path: match[2] }
        }
        return { status: line[0], path: line.slice(3) }
      })
  }

  private groupByStatus(files: { status: string; path: string }[]): Map<string, { status: string; path: string }[]> {
    const grouped = new Map<string, { status: string; path: string }[]>()

    for (const file of files) {
      const existing = grouped.get(file.status) || []
      existing.push(file)
      grouped.set(file.status, existing)
    }

    return grouped
  }

  private statusLabel(status: string): string {
    const labels: Record<string, string> = {
      'M': 'Modified',
      'A': 'Added',
      'D': 'Deleted',
      '??': 'Untracked',
      'R': 'Renamed'
    }
    return labels[status] || `Status ${status}`
  }

  private compressPaths(paths: string[]): string[] {
    if (paths.length <= 3) return paths.map(p => `  ${p}`)

    const parts = paths.map(p => p.split('/'))
    const minLength = Math.min(...parts.map(p => p.length))

    let commonIndex = 0
    for (let i = 0; i < minLength; i++) {
      if (parts.every(p => p[i] === parts[0][i])) {
        commonIndex = i
      } else {
        break
      }
    }

    if (commonIndex > 0) {
      const prefix = parts[0].slice(0, commonIndex).join('/')
      const suffixes = paths.map(p => p.slice(prefix.length + 1))
      return [`  ${prefix}/`, ...suffixes.map(s => `    ${s}`)]
    }

    return paths.map(p => `  ${p}`)
  }
}
