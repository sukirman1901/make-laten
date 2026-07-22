import { describe, it, expect } from 'vitest'
import { Logger } from '../../src/logging/index.js'

describe('Logging Module Index', () => {
  it('should export Logger', () => {
    expect(Logger).toBeDefined()
  })

  it('should create a logger', () => {
    const logger = new Logger({
      level: 'info',
      handler: () => {}
    })
    expect(logger).toBeDefined()
  })
})