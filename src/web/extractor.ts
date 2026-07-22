import type { SemanticIR, SectionIR, CodeExample } from './types.js'

interface ParsedNode {
  tag: string
  text: string
  children: ParsedNode[]
}

function parseSimpleHTML(html: string): ParsedNode[] {
  const nodes: ParsedNode[] = []
  const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1]
    const content = match[3]

    if (['script', 'style', 'noscript'].includes(tag)) continue

    nodes.push({
      tag,
      text: stripTags(content).trim(),
      children: content.includes('<') ? parseSimpleHTML(content) : []
    })
  }

  return nodes
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch) return stripTags(titleMatch[1]).trim()

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1Match) return stripTags(h1Match[1]).trim()

  return 'Untitled'
}

function extractSections(html: string): SectionIR[] {
  const sections: SectionIR[] = []
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1])
    const heading = stripTags(match[2]).trim()

    const startPos = match.index + match[0].length
    const nextHeading = html.substring(startPos).match(/<h[1-6]/i)
    const endPos = nextHeading ? startPos + nextHeading.index! : html.length
    const content = stripTags(html.substring(startPos, endPos)).trim()

    if (!content) continue

    const importance = level <= 2 ? 'primary' : level <= 4 ? 'secondary' : 'tertiary'

    sections.push({ heading, level, content, importance })
  }

  return sections
}

function extractCodeExamples(html: string): CodeExample[] {
  const examples: CodeExample[] = []
  const codeRegex = /<(?:pre|code)[^>]*>[\s\S]*?<(?:code|\/pre)[^>]*>/gi
  const blockRegex = /<pre[^>]*><code[^>]*class="[^"]*language-(\w+)[^"]*"[^>]*>([\s\S]*?)<\/code><\/pre>/gi
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(html)) !== null) {
    const language = match[1]
    const code = stripTags(match[2]).trim()

    if (code.length > 10) {
      examples.push({ language, code })
    }
  }

  const inlineRegex = /<code[^>]*class="[^"]*language-(\w+)[^"]*"[^>]*>([\s\S]*?)<\/code>/gi
  while ((match = inlineRegex.exec(html)) !== null) {
    const language = match[1]
    const code = stripTags(match[2]).trim()

    if (code.length > 20 && !examples.some(e => e.code === code)) {
      examples.push({ language, code })
    }
  }

  return examples.slice(0, 10)
}

function extractKeyPoints(sections: SectionIR[]): string[] {
  const keyPoints: string[] = []

  for (const section of sections.filter(s => s.importance === 'primary')) {
    const sentences = section.content.split(/[.!?\n]+/).filter(s => s.trim().length > 10)
    if (sentences.length > 0) {
      keyPoints.push(sentences[0].trim())
    }
  }

  return keyPoints.slice(0, 5)
}

function classifyPurpose(html: string, sections: SectionIR[]): SemanticIR['purpose'] {
  const text = (html + ' ' + sections.map(s => s.heading).join(' ')).toLowerCase()

  if (text.includes('api reference') || text.includes('endpoint') || text.includes('parameters')) return 'reference'
  if (text.includes('tutorial') || text.includes('step by step') || text.includes('getting started')) return 'tutorial'
  if (text.includes('blog') || text.includes('published') || text.includes('author')) return 'blog'
  if (text.includes('install') || text.includes('quickstart') || text.includes('overview')) return 'documentation'

  return 'documentation'
}

export function extractSemantic(html: string, url: string): SemanticIR {
  const title = extractTitle(html)
  const sections = extractSections(html)
  const codeExamples = extractCodeExamples(html)
  const keyPoints = extractKeyPoints(sections)
  const purpose = classifyPurpose(html, sections)

  return {
    type: 'webpage',
    url,
    title,
    purpose,
    sections,
    keyPoints,
    codeExamples,
    metadata: {
      language: html.match(/lang="(\w+)"/)?.[1] || 'en',
      author: html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i)?.[1],
      tags: html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]+)"/i)?.[1]?.split(',').map(t => t.trim())
    }
  }
}
