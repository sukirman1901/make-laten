export interface SearchOptions {
  maxResults?: number
  freshness?: 'day' | 'week' | 'month' | 'year'
  type?: 'web' | 'news' | 'images'
  backend?: string
}

export interface FetchOptions {
  format?: 'text' | 'markdown' | 'html'
  extract?: boolean
  compress?: boolean
  cache?: boolean
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  score: number
  semantic?: SemanticIR
}

export interface FetchResult {
  url: string
  title: string
  content: string
  semantic?: SemanticIR
  metadata: {
    fetchTime: number
    originalSize: number
    compressedSize: number
    savings: number
  }
}

export interface SemanticIR {
  type: 'webpage'
  url: string
  title: string
  purpose: 'documentation' | 'blog' | 'reference' | 'tutorial' | 'other'
  sections: SectionIR[]
  keyPoints: string[]
  codeExamples: CodeExample[]
  metadata: {
    language: string
    lastModified?: string
    author?: string
    tags?: string[]
  }
}

export interface SectionIR {
  heading: string
  level: number
  content: string
  importance: 'primary' | 'secondary' | 'tertiary'
}

export interface CodeExample {
  language: string
  code: string
  description?: string
}

export interface WebBackend {
  name: string
  isAvailable(): boolean
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
}

export interface ExtractionSchema {
  selectors?: Record<string, string>
  keys?: string[]
}
