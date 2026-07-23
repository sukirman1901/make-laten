import { describe, it, expect, beforeEach } from 'vitest'
import { ImpactAnalyzer } from '../src/code-intel/impact-analyzer.js'
import type { Graph } from '../src/code-intel/graph-builder.js'

describe('ImpactAnalyzer', () => {
  let analyzer: ImpactAnalyzer
  let testGraph: Graph

  beforeEach(() => {
    analyzer = new ImpactAnalyzer()
    testGraph = {
      nodes: [
        { id: 'function:login', type: 'function', name: 'login', filePath: 'src/auth.ts', line: 1, metadata: {} },
        { id: 'function:validate', type: 'function', name: 'validate', filePath: 'src/auth.ts', line: 5, metadata: {} },
        { id: 'function:authenticate', type: 'function', name: 'authenticate', filePath: 'src/user.ts', line: 10, metadata: {} },
        { id: 'class:AuthController', type: 'class', name: 'AuthController', filePath: 'src/controller.ts', line: 15, metadata: {} },
        { id: 'method:AuthController.handleLogin', type: 'method', name: 'handleLogin', filePath: 'src/controller.ts', line: 20, metadata: {} }
      ],
      edges: [
        { source: 'function:login', target: 'function:validate', type: 'calls', metadata: {} },
        { source: 'function:authenticate', target: 'function:login', type: 'calls', metadata: {} },
        { source: 'method:AuthController.handleLogin', target: 'function:authenticate', type: 'calls', metadata: {} }
      ]
    }
  })

  it('should analyze direct impact', async () => {
    const result = await analyzer.analyze('login', testGraph)

    expect(result).toBeDefined()
    expect(result.direct).toContain('authenticate')
    expect(result.indirect).toContain('handleLogin')
  })

  it('should calculate risk level', async () => {
    const result = await analyzer.analyze('login', testGraph)

    expect(result.risk).toBeDefined()
    expect(['low', 'medium', 'high']).toContain(result.risk)
  })

  it('should return empty for unknown symbol', async () => {
    const result = await analyzer.analyze('unknown', testGraph)

    expect(result.direct).toEqual([])
    expect(result.indirect).toEqual([])
    expect(result.risk).toBe('low')
  })

  it('should calculate high risk for many impacts', async () => {
    const largeGraph: Graph = {
      nodes: [
        { id: 'function:core', type: 'function', name: 'core', filePath: 'a.ts', line: 1, metadata: {} },
        { id: 'function:a1', type: 'function', name: 'a1', filePath: 'a.ts', line: 2, metadata: {} },
        { id: 'function:a2', type: 'function', name: 'a2', filePath: 'a.ts', line: 3, metadata: {} },
        { id: 'function:a3', type: 'function', name: 'a3', filePath: 'a.ts', line: 4, metadata: {} },
        { id: 'function:a4', type: 'function', name: 'a4', filePath: 'a.ts', line: 5, metadata: {} },
        { id: 'function:b1', type: 'function', name: 'b1', filePath: 'b.ts', line: 1, metadata: {} },
        { id: 'function:b2', type: 'function', name: 'b2', filePath: 'b.ts', line: 2, metadata: {} },
        { id: 'function:c1', type: 'function', name: 'c1', filePath: 'c.ts', line: 1, metadata: {} }
      ],
      edges: [
        { source: 'function:a1', target: 'function:core', type: 'calls', metadata: {} },
        { source: 'function:a2', target: 'function:core', type: 'calls', metadata: {} },
        { source: 'function:a3', target: 'function:core', type: 'calls', metadata: {} },
        { source: 'function:a4', target: 'function:core', type: 'calls', metadata: {} },
        { source: 'function:b1', target: 'function:a1', type: 'calls', metadata: {} },
        { source: 'function:b2', target: 'function:a2', type: 'calls', metadata: {} },
        { source: 'function:c1', target: 'function:b1', type: 'calls', metadata: {} }
      ]
    }

    const result = await analyzer.analyze('core', largeGraph)

    expect(result.direct.length).toBe(4)
    expect(result.indirect.length).toBeGreaterThan(0)
    expect(result.risk).toBe('high')
  })
})
