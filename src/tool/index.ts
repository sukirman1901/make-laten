import { ToolRegistry, type Tool } from './registry.js'
import { SemanticTool } from './semantic-tool.js'

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry()

  registry.register('compress', {
    name: 'compress',
    description: 'Compress content to reduce tokens',
    execute: async (input) => ({ content: 'compressed', confidence: 0.9 })
  })

  registry.register('cache', {
    name: 'cache',
    description: 'Cache content for reuse',
    execute: async (input) => ({ content: 'cached', confidence: 1.0 })
  })

  registry.register('graph', {
    name: 'graph',
    description: 'Store in knowledge graph',
    execute: async (input) => ({ stored: true })
  })

  return registry
}

export function getSemanticTools(): SemanticTool[] {
  return [
    new SemanticTool('compress', {
      intent: 'Reduce token usage',
      inputTypes: ['file', 'grep', 'git-diff'],
      outputType: 'compressed'
    }),
    new SemanticTool('cache', {
      intent: 'Store for reuse',
      inputTypes: ['compressed', 'original'],
      outputType: 'cached'
    }),
    new SemanticTool('graph', {
      intent: 'Build knowledge base',
      inputTypes: ['any'],
      outputType: 'stored'
    })
  ]
}

export { ToolRegistry } from './registry.js'
export { SemanticTool } from './semantic-tool.js'
export type { Tool } from './registry.js'
