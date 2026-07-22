import type { AgentAdapter, AdapterOutput, AdapterRequest } from './types.js'

export class GeminiCliAdapter implements AgentAdapter {
  name = 'gemini-cli'
  version = '1.0.0'

  format(input: AdapterRequest): AdapterOutput {
    const { content, context } = input
    
    const formatted = this.formatForGemini(content, context)
    const multimodal = context?.includeImage || false
    
    return {
      output: formatted,
      format: 'gemini',
      metadata: {
        multimodal,
        imagePath: context?.imagePath,
        timestamp: Date.now()
      }
    }
  }

  parse(output: string): any {
    return { content: output, parsed: true }
  }

  private formatForGemini(content: string, context?: Record<string, any>): string {
    const parts: string[] = [content]
    
    if (context?.includeImage && context?.imagePath) {
      parts.push(`[Image: ${context.imagePath}]`)
    }
    
    return parts.join('\n')
  }
}
