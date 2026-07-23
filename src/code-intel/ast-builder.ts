import { Parser } from 'web-tree-sitter'

export interface ASTResult {
  functions: Array<{ name: string; params: string[]; returnType?: string; line: number }>
  classes: Array<{ name: string; methods: Array<{ name: string; params: string[]; returnType?: string; line: number }>; line: number }>
  exports: string[]
  imports: string[]
}

export class ASTBuilder {
  private parser: Parser | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return
    await Parser.init()
    this.parser = new Parser()
    this.initialized = true
  }

  async parse(code: string, language: string): Promise<ASTResult> {
    if (!this.parser) throw new Error('ASTBuilder not initialized')
    
    // For now, use regex-based parsing as fallback
    // Full tree-sitter integration comes in Task 3
    return this.parseWithRegex(code)
  }

  private parseWithRegex(code: string): ASTResult {
    const functions: ASTResult['functions'] = []
    const classes: ASTResult['classes'] = []
    const exports: string[] = []
    const imports: string[] = []

    // Parse functions
    const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/g
    let match
    while ((match = funcRegex.exec(code)) !== null) {
      functions.push({
        name: match[1],
        params: match[2].split(',').map(p => p.trim()).filter(Boolean),
        returnType: match[3],
        line: code.substring(0, match.index).split('\n').length
      })
      exports.push(match[1])
    }

    // Parse classes
    const classRegex = /export\s+class\s+(\w+)/g
    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1]
      const methods: ASTResult['classes'][0]['methods'] = []
      
      // Find class body - extract content between first { and matching }
      const classStart = match.index
      const bodyStart = code.indexOf('{', classStart)
      if (bodyStart !== -1) {
        let depth = 1
        let bodyEnd = bodyStart + 1
        while (depth > 0 && bodyEnd < code.length) {
          if (code[bodyEnd] === '{') depth++
          else if (code[bodyEnd] === '}') depth--
          bodyEnd++
        }
        
        const classBody = code.substring(bodyStart, bodyEnd)
        
        // Find method signatures and check if they're at depth 1
        const methodRegex = /(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/g
        let methodMatch
        while ((methodMatch = methodRegex.exec(classBody)) !== null) {
          const methodName = methodMatch[1]
          
          // Skip constructors and the class name itself
          if (methodName === className || methodName === 'constructor') continue
          
          // Check if this method signature is at depth 1 (not inside nested blocks)
          // Count braces before this match position
          let depth = 0
          for (let i = 0; i < methodMatch.index; i++) {
            if (classBody[i] === '{') depth++
            else if (classBody[i] === '}') depth--
          }
          
          // Only include if at depth 1 (directly in class body)
          if (depth === 1) {
            methods.push({
              name: methodName,
              params: methodMatch[2].split(',').map(p => p.trim()).filter(Boolean),
              returnType: methodMatch[3],
              line: code.substring(0, bodyStart).split('\n').length + classBody.substring(0, methodMatch.index).split('\n').length
            })
          }
        }
      }
      
      classes.push({
        name: className,
        methods,
        line: code.substring(0, classStart).split('\n').length
      })
      exports.push(className)
    }

    // Parse imports
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1])
    }

    return { functions, classes, exports, imports }
  }
}
