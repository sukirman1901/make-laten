import type { ASTResult } from './ast-builder.js'

export interface GraphNode {
  id: string
  type: 'file' | 'function' | 'class' | 'method' | 'type' | 'export' | 'import'
  name: string
  filePath: string
  line: number
  metadata: Record<string, any>
}

export interface GraphEdge {
  source: string
  target: string
  type: 'defines' | 'calls' | 'extends' | 'implements' | 'imports' | 'uses'
  metadata: Record<string, any>
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export class GraphBuilder {
  async build(ast: ASTResult, filePath: string): Promise<Graph> {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []

    const fileNodeId = `file:${filePath}`
    nodes.push({
      id: fileNodeId,
      type: 'file',
      name: filePath,
      filePath,
      line: 1,
      metadata: { language: this.detectLanguage(filePath) }
    })

    for (const func of ast.functions) {
      const nodeId = `function:${func.name}`
      nodes.push({
        id: nodeId,
        type: 'function',
        name: func.name,
        filePath,
        line: func.line,
        metadata: { params: func.params, returnType: func.returnType }
      })
      edges.push({
        source: fileNodeId,
        target: nodeId,
        type: 'defines',
        metadata: {}
      })
    }

    for (const cls of ast.classes) {
      const classNodeId = `class:${cls.name}`
      nodes.push({
        id: classNodeId,
        type: 'class',
        name: cls.name,
        filePath,
        line: cls.line,
        metadata: {}
      })
      edges.push({
        source: fileNodeId,
        target: classNodeId,
        type: 'defines',
        metadata: {}
      })

      for (const method of cls.methods) {
        const methodNodeId = `method:${cls.name}.${method.name}`
        nodes.push({
          id: methodNodeId,
          type: 'method',
          name: method.name,
          filePath,
          line: method.line,
          metadata: { params: method.params, returnType: method.returnType, className: cls.name }
        })
        edges.push({
          source: classNodeId,
          target: methodNodeId,
          type: 'defines',
          metadata: {}
        })
      }
    }

    for (const imp of ast.imports) {
      const importNodeId = `import:${imp}`
      nodes.push({
        id: importNodeId,
        type: 'import',
        name: imp,
        filePath,
        line: 0,
        metadata: { path: imp }
      })
      edges.push({
        source: fileNodeId,
        target: importNodeId,
        type: 'imports',
        metadata: {}
      })
    }

    return { nodes, edges }
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', go: 'go', rs: 'rust', java: 'java', rb: 'ruby', php: 'php'
    }
    return map[ext || ''] || 'unknown'
  }
}
