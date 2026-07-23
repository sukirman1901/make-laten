import { createHash } from 'crypto'

export type SymbolKind = 'export' | 'class' | 'method' | 'function' | 'type'

export interface IrSymbol {
  name: string
  kind: SymbolKind
  parent?: string
  startLine: number
  endLine: number
}

export interface SymbolIR {
  id: string
  filePath: string
  mtimeMs: number
  symbols: IrSymbol[]
}

function lineAt(content: string, index: number): number {
  if (index <= 0) return 1
  let line = 1
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++
  }
  return line
}

function findMatchingBrace(content: string, openIdx: number): number {
  let depth = 0
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return content.length - 1
}

export function buildSymbolIR(content: string, filePath: string, mtimeMs: number): SymbolIR {
  const symbols: IrSymbol[] = []

  const classRe = /\bclass\s+(\w+)\s*[^{]*\{/g
  let m: RegExpExecArray | null
  while ((m = classRe.exec(content)) !== null) {
    const name = m[1]
    const openIdx = m.index + m[0].length - 1
    const closeIdx = findMatchingBrace(content, openIdx)
    const startLine = lineAt(content, m.index)
    const endLine = lineAt(content, closeIdx)
    symbols.push({ name, kind: 'class', startLine, endLine })

    const body = content.slice(openIdx + 1, closeIdx)
    const methodRe = /(?:public|private|protected|static|async|abstract|\s)*\b([A-Za-z_][\w]*)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g
    let mm: RegExpExecArray | null
    while ((mm = methodRe.exec(body)) !== null) {
      const methodName = mm[1]
      if (methodName === 'constructor' || methodName === 'if' || methodName === 'for' || methodName === 'while' || methodName === 'switch') continue
      const absOpen = openIdx + 1 + mm.index + mm[0].length - 1
      const absClose = findMatchingBrace(content, absOpen)
      symbols.push({
        name: methodName,
        kind: 'method',
        parent: name,
        startLine: lineAt(content, openIdx + 1 + mm.index),
        endLine: lineAt(content, absClose)
      })
    }
  }

  const fnRe = /\b(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g
  while ((m = fnRe.exec(content)) !== null) {
    const openIdx = m.index + m[0].length - 1
    const closeIdx = findMatchingBrace(content, openIdx)
    symbols.push({
      name: m[1],
      kind: 'function',
      startLine: lineAt(content, m.index),
      endLine: lineAt(content, closeIdx)
    })
  }

  const typeRe = /\b(?:export\s+)?(interface|type)\s+(\w+)\b/g
  while ((m = typeRe.exec(content)) !== null) {
    const kindWord = m[1]
    const name = m[2]
    let endLine = lineAt(content, m.index)
    const after = content.slice(m.index)
    const brace = after.indexOf('{')
    const eq = after.indexOf('=')
    if (kindWord === 'interface' || (brace >= 0 && (eq < 0 || brace < eq))) {
      const openIdx = m.index + brace
      const closeIdx = findMatchingBrace(content, openIdx)
      endLine = lineAt(content, closeIdx)
    } else {
      const semi = content.indexOf(';', m.index)
      endLine = lineAt(content, semi >= 0 ? semi : m.index)
    }
    symbols.push({
      name,
      kind: 'type',
      startLine: lineAt(content, m.index),
      endLine
    })
  }

  const id = createHash('sha256')
    .update(`${filePath}|${mtimeMs}|${content.length}`)
    .digest('hex')
    .slice(0, 12)

  return { id, filePath, mtimeMs, symbols }
}

export function findSymbolsByName(ir: SymbolIR, name: string): IrSymbol[] {
  if (name.includes('.')) {
    const [parent, child] = name.split('.', 2)
    return ir.symbols.filter(s => s.parent === parent && s.name === child)
  }
  return ir.symbols.filter(s => s.name === name)
}
