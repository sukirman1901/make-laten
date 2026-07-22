import type { SemanticIR, SectionIR } from './types.js'

export interface CompressOptions {
  maxTokens?: number
  includeCode?: boolean
  includeSections?: 'all' | 'primary' | 'none'
}

export function compressWebContent(semantic: SemanticIR, options: CompressOptions = {}): string {
  const { maxTokens = 1000, includeCode = true, includeSections = 'all' } = options
  const lines: string[] = []

  lines.push(`# ${semantic.title}`)
  lines.push(`URL: ${semantic.url}`)
  lines.push(`Purpose: ${semantic.purpose}`)
  lines.push('')

  if (semantic.keyPoints.length > 0) {
    lines.push('## Key Points')
    for (const point of semantic.keyPoints) {
      lines.push(`- ${point}`)
    }
    lines.push('')
  }

  const filteredSections = filterSections(semantic.sections, includeSections)

  for (const section of filteredSections) {
    const content = truncateContent(section.content, 500)
    lines.push(`## ${section.heading}`)
    lines.push(content)
    lines.push('')
  }

  if (includeCode && semantic.codeExamples.length > 0) {
    const topExamples = semantic.codeExamples.slice(0, 3)
    lines.push('## Code Examples')
    for (const example of topExamples) {
      lines.push(`\`\`\`${example.language}`)
      lines.push(truncateContent(example.code, 300))
      lines.push('```')
      lines.push('')
    }
  }

  let result = lines.join('\n')

  const estimatedTokens = estimateTokens(result)
  if (estimatedTokens > maxTokens) {
    result = truncateByTokens(result, maxTokens)
  }

  return result
}

function filterSections(sections: SectionIR[], mode: 'all' | 'primary' | 'none'): SectionIR[] {
  if (mode === 'none') return []
  if (mode === 'primary') return sections.filter(s => s.importance === 'primary')
  return sections
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function truncateByTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text

  const truncated = text.slice(0, maxChars)
  const lastNewline = truncated.lastIndexOf('\n')

  return truncated.slice(0, lastNewline > 0 ? lastNewline : maxChars) + '\n\n... (truncated)'
}
