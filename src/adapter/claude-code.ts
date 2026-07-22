import type { AgentAdapter, AdapterOutput, AdapterRequest } from './types.js'

export class ClaudeCodeAdapter implements AgentAdapter {
  name = 'claude-code'
  version = '1.0.0'

  format(input: AdapterRequest): AdapterOutput {
    const { content, context } = input
    
    const formatted = this.formatForClaude(content, context)
    
    return {
      output: formatted,
      format: 'claude',
      metadata: {
        filePath: context?.filePath,
        timestamp: Date.now()
      }
    }
  }

  parse(output: string): any {
    return { content: output, parsed: true }
  }

  private formatForClaude(content: string, context?: Record<string, any>): string {
    const parts: string[] = []
    
    if (context?.filePath) {
      parts.push(`**File:** \`${context.filePath}\``)
    }
    
    parts.push(content)
    
    return parts.join('\n\n')
  }
}