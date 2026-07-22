export interface Compressor {
  compress(input: unknown, context?: CompressContext): Promise<CompressedResult>
  decompress(compressed: CompressedResult): Promise<unknown>
}

export interface CompressContext {
  filePath?: string
  language?: string
  strategy?: string
}

export interface CompressedResult {
  content: string
  original: string | null
  confidence: number
  metadata: Record<string, any>
}

export interface FileReadInput {
  content: string
  filePath: string
  language?: string
}

export interface GrepInput {
  results: GrepMatch[]
  pattern: string
  directory: string
}

export interface GrepMatch {
  file: string
  line: number
  content: string
}

export interface GitDiffInput {
  diff: string
}
