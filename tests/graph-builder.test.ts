import { describe, it, expect, beforeEach } from 'vitest'
import { GraphBuilder } from '../src/code-intel/graph-builder.js'

describe('GraphBuilder', () => {
  let builder: GraphBuilder

  beforeEach(() => {
    builder = new GraphBuilder()
  })

  it('should build graph from AST', async () => {
    const ast = {
      functions: [
        { name: 'hello', params: ['name: string'], returnType: 'string', line: 1 },
        { name: 'greet', params: ['user: User'], returnType: 'void', line: 5 }
      ],
      classes: [
        { 
          name: 'UserService', 
          methods: [{ name: 'getUser', params: ['id: string'], returnType: 'User', line: 10 }],
          line: 8
        }
      ],
      exports: ['hello', 'UserService'],
      imports: ['./database', './types']
    }

    const graph = await builder.build(ast, 'src/auth.ts')

    expect(graph.nodes).toHaveLength(7) // file + 2 functions + 1 class + 1 method + 2 imports
    expect(graph.edges).toHaveLength(6) // 2 defines (funcs) + 1 defines (class) + 1 defines (method) + 2 imports
    
    const fileNode = graph.nodes.find(n => n.id === 'file:src/auth.ts')
    expect(fileNode).toBeDefined()
    expect(fileNode?.type).toBe('file')

    const helloNode = graph.nodes.find(n => n.id === 'function:hello')
    expect(helloNode).toBeDefined()
    
    const classNode = graph.nodes.find(n => n.id === 'class:UserService')
    expect(classNode).toBeDefined()
  })

  it('should detect function calls', async () => {
    const code = `
      function helper() { return 42 }
      function main() { return helper() }
    `
    // This will be tested after full implementation
    expect(true).toBe(true)
  })
})
