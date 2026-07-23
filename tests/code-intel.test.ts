import { describe, it, expect } from 'vitest'
import { ASTBuilder } from '../src/code-intel/ast-builder.js'

describe('Code Intelligence', () => {
  it('ASTBuilder should be importable', () => {
    expect(ASTBuilder).toBeDefined()
  })
})