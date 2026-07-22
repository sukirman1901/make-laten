export function stripImports(content: string): string {
  return content
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .split('\n')
    .filter(l => l.trim() !== '')
    .join('\n')
}

export function stripComments(content: string): string {
  let result = content.replace(/(?<!["'`])\/\/.*$/gm, '')
  result = result.replace(/\/\*[\s\S]*?\*\//g, '')
  return result
    .split('\n')
    .filter(l => l.trim() !== '')
    .join('\n')
}

export function stripBlankLines(content: string): string {
  return content.replace(/\n{3,}/g, '\n\n')
}

export function stripWhitespace(content: string): string {
  return content.replace(/[ \t]+$/gm, '')
}

export function stripAll(content: string): string {
  let result = content
  result = stripImports(result)
  result = stripComments(result)
  result = stripBlankLines(result)
  result = stripWhitespace(result)
  return result.trim()
}
