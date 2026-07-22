export function smartTruncate(content: string, maxTokens: number): string {
  const lines = content.split('\n')
  const estimatedTokens = Math.ceil(content.length / 4)

  if (estimatedTokens <= maxTokens) return content

  const targetLines = Math.round(maxTokens * 4 / (content.length / lines.length))
  const headerLines = Math.floor(targetLines * 0.3)
  const footerLines = Math.floor(targetLines * 0.3)
  const omitted = lines.length - headerLines - footerLines

  const header = lines.slice(0, headerLines)
  const footer = lines.slice(-footerLines)

  return [...header, `\n... [${omitted} lines omitted] ...\n`, ...footer].join('\n')
}

export function truncateByTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text

  const truncated = text.slice(0, maxChars)
  const lastNewline = truncated.lastIndexOf('\n')

  return truncated.slice(0, lastNewline > 0 ? lastNewline : maxChars) + '\n\n... (truncated)'
}

export function preserveContext(lines: string[], targetIndex: number, before: number, after: number): string[] {
  const start = Math.max(0, targetIndex - before)
  const end = Math.min(lines.length, targetIndex + after + 1)
  return lines.slice(start, end)
}
