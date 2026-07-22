import { describe, it, expect } from 'vitest'
import { MetricsCollector } from '../../src/metrics/index.js'

describe('Metrics Module Index', () => {
  it('should export MetricsCollector', () => {
    expect(MetricsCollector).toBeDefined()
  })

  it('should create a collector', () => {
    const collector = new MetricsCollector()
    expect(collector.getCounter('test')).toBe(0)
  })
})