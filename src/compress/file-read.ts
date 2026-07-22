import type { Compressor, CompressedResult, FileReadInput } from './types.js'
import { calculateConfidence } from './confidence.js'

export class FileReadCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { content, filePath, language } = input as FileReadInput
    
    const signatures = this.extractSignatures(content, language)
    const exports = this.extractExports(content)
    
    const lines = [
      `// ${filePath} (${content.split('\n').length} lines)`,
      '',
      ...signatures,
      '',
      '// Exports:',
      ...exports
    ]
    
    const compressed = lines.join('\n')
    
    return {
      content: compressed,
      original: content,
      confidence: calculateConfidence(content, compressed),
      metadata: {
        strategy: 'signatures',
        originalLines: content.split('\n').length,
        compressedLines: lines.length,
        savings: 1 - (compressed.length / content.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }

  private extractSignatures(content: string, language?: string): string[] {
    const signatures: string[] = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (/^(export\s+)?(async\s+)?function\s+\w+/.test(trimmed)) {
        signatures.push(trimmed.replace(/\{[\s\S]*$/, '{ ... }'))
      }
      
      if (/^(export\s+)?class\s+\w+/.test(trimmed)) {
        signatures.push(trimmed)
      }
      
      if (/^(export\s+)?(type|interface)\s+\w+/.test(trimmed)) {
        signatures.push(trimmed)
      }
    }
    
    return signatures
  }

  private extractExports(content: string): string[] {
    const exports: string[] = []
    const exportRegex = /export\s+(default\s+)?(function|class|const|let|var|type|interface)\s+(\w+)/g
    let match
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(`  - ${match[3]} (${match[2]})`)
    }
    
    return exports
  }
}
