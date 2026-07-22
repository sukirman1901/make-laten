import type { AgentAdapter, AdapterOutput, AdapterRequest } from './types.js'

export class CodexAdapter implements AgentAdapter {
  name = 'codex'
  version = '1.0.0'

  format(input: AdapterRequest): AdapterOutput {
    const { content, context } = input
    
    const formatted = this.formatForCodex(content, context)
    
    return {
      output: formatted,
      format: 'codex',
      metadata: {
        timestamp: Date.now()
      }
    }
  }

  parse(output: string): any {
    try {
      return JSON.parse(output)
    } catch {
      return { content: output }
    }
  }

  private formatForCodex(content: string, context?: Record<string, any>): string {
    if (context?.expectJson) {
      return JSON.stringify({ content, timestamp: Date.now() })
    }
    return content
  }
}
