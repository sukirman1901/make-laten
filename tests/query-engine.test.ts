import { describe, it, expect, beforeEach } from 'vitest'
import { QueryEngine } from '../src/code-intel/query-engine.js'
import type { Graph } from '../src/code-intel/graph-builder.js'

describe('QueryEngine', () => {
  let engine: QueryEngine
  let testGraph: Graph

  beforeEach(() => {
    engine = new QueryEngine()
    testGraph = {
      nodes: [
        { id: 'file:src/auth.ts', type: 'file', name: 'src/auth.ts', filePath: 'src/auth.ts', line: 1, metadata: {} },
        { id: 'function:login', type: 'function', name: 'login', filePath: 'src/auth.ts', line: 5, metadata: { params: ['username: string', 'password: string'] } },
        { id: 'function:validate', type: 'function', name: 'validate', filePath: 'src/auth.ts', line: 10, metadata: { params: ['token: string'] } },
        { id: 'class:AuthService', type: 'class', name: 'AuthService', filePath: 'src/auth.ts', line: 15, metadata: {} },
        { id: 'method:AuthService.verify', type: 'method', name: 'verify', filePath: 'src/auth.ts', line: 20, metadata: { className: 'AuthService' } }
      ],
      edges: [
        { source: 'file:src/auth.ts', target: 'function:login', type: 'defines', metadata: {} },
        { source: 'file:src/auth.ts', target: 'function:validate', type: 'defines', metadata: {} },
        { source: 'file:src/auth.ts', target: 'class:AuthService', type: 'defines', metadata: {} },
        { source: 'class:AuthService', target: 'method:AuthService.verify', type: 'defines', metadata: {} },
        { source: 'function:login', target: 'function:validate', type: 'calls', metadata: {} }
      ]
    }
  })

  it('should explain a symbol', async () => {
    const result = await engine.explain('login', testGraph)

    expect(result).toBeDefined()
    expect(result.name).toBe('login')
    expect(result.type).toBe('function')
    expect(result.connections).toHaveLength(2) // defines + calls
  })

  it('should find path between symbols', async () => {
    const result = await engine.path('login', 'validate', testGraph)

    expect(result).toBeDefined()
    expect(result.path).toHaveLength(1) // direct call
    expect(result.hops).toBe(1)
  })

  it('should search symbols', async () => {
    const result = await engine.search('auth', testGraph)

    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
    expect(result.some(r => r.name.includes('auth'))).toBe(true)
  })
})
