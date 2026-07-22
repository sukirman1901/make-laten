import { describe, it, expect, beforeEach } from 'vitest'
import { MetricsCollector } from '../../src/metrics/collector.js'

describe('MetricsCollector', () => {
  let collector: MetricsCollector

  beforeEach(() => {
    collector = new MetricsCollector()
  })

  it('should record counters', () => {
    collector.increment('requests')
    collector.increment('requests')
    expect(collector.getCounter('requests')).toBe(2)
  })

  it('should record gauges', () => {
    collector.setGauge('connections', 5)
    expect(collector.getGauge('connections')).toBe(5)
  })

  it('should record histograms', () => {
    collector.record('latency', 100)
    collector.record('latency', 200)
    collector.record('latency', 300)
    
    const stats = collector.getHistogram('latency')
    expect(stats.avg).toBe(200)
    expect(stats.min).toBe(100)
    expect(stats.max).toBe(300)
  })

  it('should reset metrics', () => {
    collector.increment('requests')
    collector.reset()
    expect(collector.getCounter('requests')).toBe(0)
  })
})