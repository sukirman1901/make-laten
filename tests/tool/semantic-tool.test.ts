import { describe, it, expect } from 'vitest'
import { SemanticTool } from '../../src/tool/semantic-tool.js'

describe('SemanticTool', () => {
  it('should create a semantic tool with intent', () => {
    const tool = new SemanticTool('compress', {
      intent: 'Reduce token usage',
      inputTypes: ['file', 'grep', 'git-diff'],
      outputType: 'compressed'
    })

    expect(tool.name).toBe('compress')
    expect(tool.intent).toBe('Reduce token usage')
  })

  it('should validate input types', () => {
    const tool = new SemanticTool('compress', {
      intent: 'Reduce token usage',
      inputTypes: ['file', 'grep'],
      outputType: 'compressed'
    })

    expect(tool.supportsInput('file')).toBe(true)
    expect(tool.supportsInput('git-diff')).toBe(false)
  })
})
