import type { Graph } from './graph-builder.js'

export interface ImpactResult {
  direct: string[]
  indirect: string[]
  risk: 'low' | 'medium' | 'high'
}

export class ImpactAnalyzer {
  async analyze(symbolName: string, graph: Graph): Promise<ImpactResult> {
    const node = graph.nodes.find(n =>
      n.name === symbolName ||
      n.id.endsWith(`:${symbolName}`)
    )

    if (!node) {
      return { direct: [], indirect: [], risk: 'low' }
    }

    const direct: string[] = []
    const indirect: string[] = []

    const directCallers = graph.edges
      .filter(e => e.target === node.id && e.type === 'calls')
      .map(e => e.source)

    for (const callerId of directCallers) {
      const callerNode = graph.nodes.find(n => n.id === callerId)
      if (callerNode) {
        direct.push(callerNode.name)

        const indirectCallers = graph.edges
          .filter(e => e.target === callerId && e.type === 'calls')
          .map(e => e.source)

        for (const indirectCallerId of indirectCallers) {
          const indirectNode = graph.nodes.find(n => n.id === indirectCallerId)
          if (indirectNode && !indirect.includes(indirectNode.name)) {
            indirect.push(indirectNode.name)
          }
        }
      }
    }

    const totalImpact = direct.length + indirect.length
    let risk: 'low' | 'medium' | 'high' = 'low'
    if (totalImpact > 5) risk = 'high'
    else if (totalImpact > 2) risk = 'medium'

    return { direct, indirect, risk }
  }
}
