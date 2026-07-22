import { describe, it, expect, beforeEach } from 'vitest'
import { ErrorHandler } from '../../src/error/handler.js'

describe('ErrorHandler', () => {
  let handler: ErrorHandler

  beforeEach(() => {
    handler = new ErrorHandler()
  })

  it('should handle errors', () => {
    const error = new Error('test error')
    const result = handler.handle(error)
    expect(result.handled).toBe(true)
  })

  it('should categorize errors', () => {
    const error = new Error('not found')
    error.name = 'NotFoundError'
    const result = handler.handle(error)
    expect(result.category).toBe('not-found')
  })

  it('should provide recovery suggestions', () => {
    const error = new Error('permission denied')
    const result = handler.handle(error)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('should track error counts', () => {
    handler.handle(new Error('error 1'))
    handler.handle(new Error('error 2'))
    expect(handler.getStats().total).toBe(2)
  })
})