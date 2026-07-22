import type { Compressor, CompressedResult, FileReadInput } from './types.js'
import { calculateConfidence } from './confidence.js'
import { stripAll } from './strip.js'
import { extractExports, extractClassMethods, extractFunctionSignatures, extractTypeDefinitions } from './structure.js'
import { smartTruncate } from './truncate.js'

export class FileReadCompressor implements Compressor {
  async compress(input: unknown): Promise<CompressedResult> {
    const { content, filePath, language } = input as FileReadInput

    const stripped = stripAll(content)

    const exports = extractExports(stripped)
    const classes = extractClassMethods(stripped)
    const functions = extractFunctionSignatures(stripped)
    const types = extractTypeDefinitions(stripped)

    const sections = [
      `// ${filePath} (${content.split('\n').length} lines)`,
      '',
      '// Exports:',
      exports,
      '',
      '// Classes:',
      classes,
      '',
      '// Functions:',
      functions,
      '',
      '// Types:',
      types
    ].filter(l => l !== '' && !l.endsWith(':'))

    let compressed = sections.join('\n')

    const maxTokens = 2000
    compressed = smartTruncate(compressed, maxTokens)

    return {
      content: compressed,
      original: content,
      confidence: calculateConfidence(content, compressed),
      metadata: {
        strategy: 'hybrid',
        originalLines: content.split('\n').length,
        compressedLines: compressed.split('\n').length,
        savings: 1 - (compressed.length / content.length)
      }
    }
  }

  async decompress(compressed: CompressedResult): Promise<unknown> {
    return compressed.original
  }
}
