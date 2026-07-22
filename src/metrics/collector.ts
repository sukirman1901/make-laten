interface HistogramStats {
  avg: number
  min: number
  max: number
  count: number
}

export class MetricsCollector {
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()

  increment(name: string, value: number = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value)
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value)
  }

  getGauge(name: string): number {
    return this.gauges.get(name) || 0
  }

  record(name: string, value: number): void {
    const values = this.histograms.get(name) || []
    values.push(value)
    this.histograms.set(name, values)
  }

  getHistogram(name: string): HistogramStats {
    const values = this.histograms.get(name) || []
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 }
    }

    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }
  }

  reset(): void {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
  }
}