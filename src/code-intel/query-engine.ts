import type { Graph, GraphNode, GraphEdge } from './graph-builder.js'

export interface ExplainResult {
  name: string
  type: string
  filePath: string
  line: number
  connections: Array<{ target: string; type: string }>
  metadata: Record<string, any>
}

export interface PathResult {
  path: Array<{ from: string; via: string; to: string }>
  hops: number
}

export interface SearchResult {
  name: string
  type: string
  score: number
  filePath: string
}

export class QueryEngine {
  async explain(symbolName: string, graph: Graph): Promise<ExplainResult | null> {
    const node = graph.nodes.find(n =>
      n.name === symbolName ||
      n.id.endsWith(`:${symbolName}`)
    )

    if (!node) return null

    const connections = graph.edges
      .filter(e => e.source === node.id || e.target === node.id)
      .map(e => ({
        target: e.source === node.id ? e.target : e.source,
        type: e.type
      }))

    return {
      name: node.name,
      type: node.type,
      filePath: node.filePath,
      line: node.line,
      connections,
      metadata: node.metadata
    }
  }

  async path(source: string, target: string, graph: Graph): Promise<PathResult | null> {
    const sourceNode = graph.nodes.find(n => n.name === source || n.id.endsWith(`:${source}`))
    const targetNode = graph.nodes.find(n => n.name === target || n.id.endsWith(`:${target}`))

    if (!sourceNode || !targetNode) return null

    // BFS to find shortest path
    const queue: Array<{ node: string; path: Array<{ from: string; via: string; to: string }> }> = [
      { node: sourceNode.id, path: [] }
    ]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.node === targetNode.id) {
        return { path: current.path, hops: current.path.length }
      }

      if (visited.has(current.node)) continue
      visited.add(current.node)

      const edges = graph.edges.filter(e => e.source === current.node)
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          queue.push({
            node: edge.target,
            path: [...current.path, { from: current.node, via: edge.type, to: edge.target }]
          })
        }
      }
    }

    return null
  }

  async search(query: string, graph: Graph): Promise<SearchResult[]> {
    const lowerQuery = query.toLowerCase()

    return graph.nodes
      .filter(n => n.name.toLowerCase().includes(lowerQuery))
      .map(n => ({
        name: n.name,
        type: n.type,
        score: n.name.toLowerCase().includes(lowerQuery) ? 1.0 : 0.5,
        filePath: n.filePath
      }))
      .sort((a, b) => b.score - a.score)
  }
}
