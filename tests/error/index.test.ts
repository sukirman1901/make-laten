import { describe, it, expect } from 'vitest'
import { ErrorHandler } from '../../src/error/index.js'

describe('Error Module Index', () => {
  it('should export ErrorHandler', () => {
    expect(ErrorHandler).toBeDefined()
  })

  it('should create a handler', () => {
    const handler = new ErrorHandler()
    expect(handler.getStats().total).toBe(0)
  })
})