import { describe, it, expect, beforeEach } from 'vitest'
import { Logger } from '../../src/logging/logger.js'

describe('Logger', () => {
  let logger: Logger
  let logs: any[]

  beforeEach(() => {
    logs = []
    logger = new Logger({
      level: 'info',
      handler: (entry) => logs.push(entry)
    })
  })

  it('should log info messages', () => {
    logger.info('test message')
    expect(logs.length).toBe(1)
    expect(logs[0].level).toBe('info')
  })

  it('should filter by level', () => {
    const debugLogger = new Logger({
      level: 'warn',
      handler: (entry) => logs.push(entry)
    })

    debugLogger.debug('debug message')
    debugLogger.warn('warn message')
    expect(logs.length).toBe(1)
  })

  it('should include metadata', () => {
    logger.info('test', { key: 'value' })
    expect(logs[0].metadata.key).toBe('value')
  })

  it('should include timestamp', () => {
    logger.info('test')
    expect(logs[0].timestamp).toBeDefined()
  })
})