import { describe, it, expect } from 'vitest'
import { Pipeline } from '../../src/middleware/index.js'

describe('Middleware Module Index', () => {
  it('should export Pipeline', () => {
    expect(Pipeline).toBeDefined()
  })

  it('should create a pipeline', () => {
    const pipeline = new Pipeline()
    expect(pipeline.size()).toBe(0)
  })
})
