# RFC 005: Web Search & Fetch Integration

**Status:** Draft
**Author:** make-laten team
**Date:** 2026-07-22
**Depends on:** [RFC 001: Architecture](./001-architecture.md), [RFC 003: Knowledge Graph](./003-knowledge-graph.md)

---

## Summary

Define the web search and fetch integration with hybrid mode (inject + own), semantic extraction, and caching.

---

## Motivation

AI coding agents frequently need to:
1. **Search documentation** — find how to use APIs, libraries, frameworks
2. **Fetch web content** — read articles, docs, examples
3. **Check references** — verify versions, configurations, best practices

Current problems:
- Each agent has different web tools (WebFetch, WebSearch, Exa, Tavily)
- No caching across sessions
- No semantic extraction (raw HTML/markdown)
- No compression (full content sent to LLM)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Web Integration                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Semantic Tool Abstraction                 │    │
│  │  make-laten.search() / make-laten.fetch()         │    │
│  └───────────────────┬─────────────────────────────┘    │
│                      │                                    │
│  ┌───────────────────┴─────────────────────────────┐    │
│  │              Smart Router                         │    │
│  │  Inject Mode ←→ Own Mode                          │    │
│  └───────────────────┬─────────────────────────────┘    │
│                      │                                    │
│  ┌───────────────────┴─────────────────────────────┐    │
│  │         Web Backends                             │    │
│  │  DuckDuckGo | Exa | Tavily | SearxNG             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Semantic Tool Abstraction

### Unified Interface

```typescript
interface WebInterface {
  // Search with semantic extraction
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
  
  // Fetch with semantic extraction
  fetch(url: string, options?: FetchOptions): Promise<FetchResult>
  
  // Extract specific content
  extract(url: string, schema: ExtractionSchema): Promise<ExtractionResult>
  
  // Summarize content
  summarize(content: string, options?: SummaryOptions): Promise<string>
}

interface SearchOptions {
  maxResults?: number        // default: 5
  freshness?: string         // "day" | "week" | "month" | "year"
  type?: string              // "web" | "news" | "images"
  backend?: string           // "duckduckgo" | "exa" | "tavily"
}

interface FetchOptions {
  format?: string            // "text" | "markdown" | "html"
  extract?: boolean          // semantic extraction (default: true)
  compress?: boolean         // compress output (default: true)
  cache?: boolean            // use cache (default: true)
}

interface SearchResult {
  title: string
  url: string
  snippet: string
  score: number              // relevance score 0-1
  semantic?: SemanticIR      // if extract=true
}

interface FetchResult {
  url: string
  title: string
  content: string
  semantic: SemanticIR
  metadata: {
    fetchTime: number
    originalSize: number
    compressedSize: number
    savings: number
  }
}
```

### Semantic IR for Web Content

```typescript
interface SemanticIR {
  type: 'webpage'
  url: string
  title: string
  purpose: string           // "documentation" | "blog" | "reference" | "tutorial"
  
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

interface SectionIR {
  heading: string
  level: number             // 1-6
  content: string
  importance: 'primary' | 'secondary' | 'tertiary'
  codeExample?: CodeExample
}

interface CodeExample {
  language: string
  code: string
  description?: string
}
```

---

## Hybrid Web Mode

### Inject Mode

Intercept agent's existing web tools:

```typescript
class InjectMode {
  async intercept(toolCall: ToolCall): Promise<ToolCall | null> {
    // 1. Check if this is a web tool
    if (!this.isWebTool(toolCall)) return null
    
    // 2. Check cache
    const cached = await this.cache.get(toolCall)
    if (cached) {
      return { ...toolCall, result: cached }
    }
    
    // 3. Let original tool execute
    return toolCall
  }
  
  async postProcess(result: ToolResult): Promise<ToolResult> {
    // 1. Compress result
    const compressed = await this.compress(result)
    
    // 2. Store in cache
    await this.cache.set(result, compressed)
    
    // 3. Return compressed
    return { ...result, content: compressed }
  }
  
  private isWebTool(toolCall: ToolCall): boolean {
    const webTools = [
      'WebFetch', 'WebSearch',      // Claude Code
      '@web_fetch', '@web_search',   // Cursor
      'web_search', 'web_fetch',     // Gemini CLI
      'browser.search',              // Codex
      'exa.search', 'tavily.search'  // Others
    ]
    
    return webTools.some(tool => toolCall.name.includes(tool))
  }
}
```

### Own Mode

make-laten's own search/fetch:

```typescript
class OwnMode {
  private backends: Map<string, WebBackend>
  
  constructor() {
    this.backends = new Map([
      ['duckduckgo', new DuckDuckGoBackend()],
      ['exa', new ExaBackend()],
      ['tavily', new TavilyBackend()],
      ['searxng', new SearxngBackend()]
    ])
  }
  
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // 1. Check cache
    const cached = await this.cache.search(query)
    if (cached && this.isFresh(cached)) {
      return cached.results
    }
    
    // 2. Select backend
    const backend = this.selectBackend(options?.backend)
    
    // 3. Execute search
    const results = await backend.search(query, options)
    
    // 4. Semantic extraction
    const extracted = await this.extractSemantics(results)
    
    // 5. Store in cache
    await this.cache.store(query, extracted)
    
    // 6. Return
    return extracted
  }
  
  async fetch(url: string, options?: FetchOptions): Promise<FetchResult> {
    // 1. Check cache
    const cached = await this.cache.get(`fetch:${url}`)
    if (cached && this.isFresh(cached)) {
      return cached
    }
    
    // 2. Fetch content
    const response = await fetch(url)
    const html = await response.text()
    
    // 3. Parse HTML
    const parsed = await this.parseHTML(html)
    
    // 4. Semantic extraction
    const semantic = await this.extractSemantic(parsed)
    
    // 5. Compress
    const compressed = await this.compress(semantic)
    
    // 6. Store in cache
    await this.cache.store(`fetch:${url}`, compressed)
    
    // 7. Return
    return compressed
  }
  
  private selectBackend(preferred?: string): WebBackend {
    if (preferred && this.backends.has(preferred)) {
      return this.backends.get(preferred)!
    }
    
    // Auto-select based on availability
    for (const [name, backend] of this.backends) {
      if (backend.isAvailable()) return backend
    }
    
    throw new Error('No web backend available')
  }
}
```

### Smart Router

```typescript
class WebRouter {
  async route(toolCall: ToolCall): Promise<ToolCall | null> {
    const context = this.analyzeContext(toolCall)
    
    // 1. Check if agent has web tools
    if (context.hasWebTools) {
      // Use inject mode
      return await this.injectMode.intercept(toolCall)
    }
    
    // 2. Check if make-laten web is available
    if (context.makeLatenWebAvailable) {
      // Use own mode
      return await this.ownMode.route(toolCall)
    }
    
    // 3. Fallback to agent's native tool
    return toolCall
  }
  
  private analyzeContext(toolCall: ToolCall): RouteContext {
    return {
      hasWebTools: this.detectWebTools(),
      makeLatenWebAvailable: this.isOwnModeAvailable(),
      queryType: this.classifyQuery(toolCall),
      freshnessRequired: this.requiresFreshness(toolCall)
    }
  }
  
  private detectWebTools(): boolean {
    // Detect which web tools the agent has
    const agentTools = this.getAgentTools()
    return agentTools.some(tool => 
      ['WebFetch', 'WebSearch', '@web_fetch', '@web_search'].includes(tool)
    )
  }
}
```

---

## Semantic Extraction

### HTML Parser

```typescript
class SemanticExtractor {
  async extract(html: string, url: string): Promise<SemanticIR> {
    // 1. Parse HTML
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // 2. Extract metadata
    const metadata = this.extractMetadata(document)
    
    // 3. Extract title
    const title = this.extractTitle(document)
    
    // 4. Extract sections
    const sections = this.extractSections(document)
    
    // 5. Extract code examples
    const codeExamples = this.extractCodeExamples(document)
    
    // 6. Extract key points
    const keyPoints = this.extractKeyPoints(sections)
    
    // 7. Classify purpose
    const purpose = this.classifyPurpose(metadata, sections)
    
    return {
      type: 'webpage',
      url,
      title,
      purpose,
      sections,
      keyPoints,
      codeExamples,
      metadata
    }
  }
  
  private extractSections(document: Document): SectionIR[] {
    const sections: SectionIR[] = []
    
    // Extract headings and their content
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    
    for (const heading of headings) {
      const level = parseInt(heading.tagName[1])
      const headingText = heading.textContent?.trim() || ''
      
      // Get content until next heading
      let content = ''
      let sibling = heading.nextElementSibling
      while (sibling && !sibling.tagName.match(/^H[1-6]$/)) {
        content += sibling.textContent?.trim() + '\n'
        sibling = sibling.nextElementSibling
      }
      
      // Determine importance
      const importance = this.determineImportance(level, headingText, content)
      
      sections.push({
        heading: headingText,
        level,
        content: content.trim(),
        importance
      })
    }
    
    return sections
  }
  
  private extractCodeExamples(document: Document): CodeExample[] {
    const examples: CodeExample[] = []
    
    // Extract code blocks
    const codeBlocks = document.querySelectorAll('pre code, code')
    
    for (const block of codeBlocks) {
      const code = block.textContent?.trim() || ''
      const language = this.detectLanguage(block)
      
      if (code.length > 10) { // Skip tiny code snippets
        examples.push({
          language,
          code,
          description: this.findDescription(block)
        })
      }
    }
    
    return examples
  }
  
  private classifyPurpose(
    metadata: Metadata, 
    sections: SectionIR[]
  ): string {
    // Heuristic classification
    const text = sections.map(s => s.content).join(' ').toLowerCase()
    
    if (text.includes('api reference') || text.includes('endpoint')) {
      return 'reference'
    }
    if (text.includes('tutorial') || text.includes('step by step')) {
      return 'tutorial'
    }
    if (text.includes('blog') || text.includes('post')) {
      return 'blog'
    }
    if (text.includes('install') || text.includes('getting started')) {
      return 'documentation'
    }
    
    return 'documentation'
  }
}
```

---

## Caching Strategy

### Cache Keys

```typescript
function generateCacheKey(toolCall: ToolCall): string {
  if (toolCall.name.includes('search')) {
    // For search: hash query + options
    const query = toolCall.params.query || ''
    const options = JSON.stringify(toolCall.params.options || {})
    return `search:${hash(query + options)}`
  }
  
  if (toolCall.name.includes('fetch')) {
    // For fetch: URL + format
    const url = toolCall.params.url || ''
    const format = toolCall.params.format || 'markdown'
    return `fetch:${url}:${format}`
  }
  
  // Generic
  return `web:${hash(JSON.stringify(toolCall))}`
}
```

### Freshness Policy

```typescript
interface FreshnessPolicy {
  contentType: string
  ttl: number               // seconds
  strategy: 'exact' | 'semantic'
}

const defaultPolicies: FreshnessPolicy[] = [
  { contentType: 'documentation', ttl: 86400, strategy: 'semantic' },  // 24h
  { contentType: 'api_reference', ttl: 43200, strategy: 'semantic' },  // 12h
  { contentType: 'blog', ttl: 3600, strategy: 'exact' },               // 1h
  { contentType: 'news', ttl: 1800, strategy: 'exact' },               // 30min
  { contentType: 'tutorial', ttl: 86400, strategy: 'semantic' },       // 24h
  { contentType: 'stackoverflow', ttl: 604800, strategy: 'semantic' }  // 7 days
]

function isFresh(cached: CachedContent, policy: FreshnessPolicy): boolean {
  const age = Date.now() - cached.timestamp
  return age < policy.ttl * 1000
}
```

---

## Compression

### Web Content Compression

```typescript
class WebCompressor {
  async compress(semantic: SemanticIR): Promise<string> {
    const lines: string[] = []
    
    // Header
    lines.push(`# ${semantic.title}`)
    lines.push(`URL: ${semantic.url}`)
    lines.push(`Purpose: ${semantic.purpose}`)
    lines.push('')
    
    // Key points
    if (semantic.keyPoints.length > 0) {
      lines.push('## Key Points')
      for (const point of semantic.keyPoints) {
        lines.push(`- ${point}`)
      }
      lines.push('')
    }
    
    // Primary sections only
    const primarySections = semantic.sections.filter(
      s => s.importance === 'primary'
    )
    
    for (const section of primarySections) {
      lines.push(`## ${section.heading}`)
      lines.push(this.truncateContent(section.content, 500))
      lines.push('')
    }
    
    // Code examples (top 3)
    const topExamples = semantic.codeExamples.slice(0, 3)
    if (topExamples.length > 0) {
      lines.push('## Code Examples')
      for (const example of topExamples) {
        lines.push(`\`\`\`${example.language}`)
        lines.push(example.code)
        lines.push('```')
        lines.push('')
      }
    }
    
    return lines.join('\n')
  }
  
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }
}
```

---

## Error Handling

```typescript
class WebError extends Error {
  constructor(
    public type: 'fetch' | 'parse' | 'extract' | 'cache',
    message: string,
    public url?: string,
    public cause?: Error
  ) {
    super(`[Web ${type}] ${message}`)
  }
}

// Fallback strategy
async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.warn('Primary failed, trying fallback:', error)
    return await fallback()
  }
}
```

---

## Performance Targets

| Operation | Target Latency | Target Savings |
|-----------|---------------|----------------|
| Web search | < 2000ms | 70-85% |
| Web fetch | < 3000ms | 75-90% |
| Semantic extraction | < 500ms | — |
| Cache lookup | < 50ms | — |

---

## Open Questions

1. How to handle JavaScript-rendered pages?
2. Should we support login/auth for fetching protected content?
3. How to handle rate limiting from web backends?
4. Should we provide a web UI for cache management?
