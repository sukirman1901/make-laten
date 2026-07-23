import { describe, it, expect } from 'vitest'
import { CLAUDE_MD, CURSORRULES, AGENTS_MD, GEMINI_MD } from '../src/cli/templates/index.js'

describe('Platform config templates', () => {
  it.each([
    ['CLAUDE_MD', CLAUDE_MD],
    ['CURSORRULES', CURSORRULES],
    ['AGENTS_MD', AGENTS_MD],
    ['GEMINI_MD', GEMINI_MD],
  ])('%s is a non-empty string containing key tools', (_, template) => {
    expect(typeof template).toBe('string')
    expect(template.length).toBeGreaterThan(0)
    expect(template).toContain('read')
    expect(template).toContain('grep')
  })
})
