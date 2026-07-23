import { describe, it, expect, beforeAll } from 'vitest'
import { ASTBuilder } from '../src/code-intel/ast-builder.js'
import fs from 'fs/promises'
import path from 'path'

describe('ASTBuilder', () => {
  let builder: ASTBuilder

  beforeAll(async () => {
    builder = new ASTBuilder()
    await builder.init()
  })

  it('should parse TypeScript file', async () => {
    const code = `
      export function hello(name: string): string {
        return \`Hello \${name}\`
      }
      
      export class UserService {
        constructor(private db: Database) {}
        
        async getUser(id: string): Promise<User> {
          return this.db.query('SELECT * FROM users WHERE id = ?', [id])
        }
      }
    `
    
    const ast = await builder.parse(code, 'typescript')
    
    expect(ast).toBeDefined()
    expect(ast.functions).toHaveLength(1)
    expect(ast.functions[0].name).toBe('hello')
    expect(ast.classes).toHaveLength(1)
    expect(ast.classes[0].name).toBe('UserService')
    expect(ast.classes[0].methods).toHaveLength(1)
    expect(ast.classes[0].methods[0].name).toBe('getUser')
  })
})
