export function extractExports(content: string): string {
  const lines = content.split('\n')
  const exports: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^export\s+(default\s+)?/.test(trimmed)) {
      if (trimmed.includes('{') && !trimmed.includes('}')) {
        exports.push(trimmed.replace(/\{[\s\S]*$/, '{ ... }'))
      } else {
        exports.push(trimmed)
      }
    }
  }

  return exports.join('\n')
}

export function extractClassMethods(content: string): string {
  const classRegex = /class\s+\w+[^{]*\{([\s\S]*?)\n\}/g
  const methods: string[] = []

  let match
  while ((match = classRegex.exec(content)) !== null) {
    const classBody = match[1]
    const methodRegex = /(^\s*(?:public|private|protected|static|async|abstract|\s)*\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?)\s*\{/gm

    let methodMatch
    while ((methodMatch = methodRegex.exec(classBody)) !== null) {
      methods.push(methodMatch[1].trim())
    }
  }

  return methods.join('\n')
}

export function extractFunctionSignatures(content: string): string {
  const funcRegex = /(export\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{/g
  const signatures: string[] = []

  let match
  while ((match = funcRegex.exec(content)) !== null) {
    signatures.push(match[0].replace(/\{$/, ''))
  }

  return signatures.join('\n')
}

export function extractTypeDefinitions(content: string): string {
  const typeRegex = /(export\s+)?(interface|type)\s+\w+[^{]*\{[^}]*\}|(export\s+)?type\s+\w+\s*=[^;]+;?/g
  const types: string[] = []

  let match
  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[0].trim())
  }

  return types.join('\n')
}
