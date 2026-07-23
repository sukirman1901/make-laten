import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IncrementalBuilder } from '../src/code-intel/incremental.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('IncrementalBuilder', () => {
  let builder: IncrementalBuilder
  let tempDir: string

  beforeEach(async () => {
    builder = new IncrementalBuilder()
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'incremental-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('should build graph from directory', async () => {
    // Create test files
    await fs.writeFile(path.join(tempDir, 'auth.ts'), `
      export function login(user: string) { return true }
      export class AuthService { verify() { return true } }
    `)
    await fs.writeFile(path.join(tempDir, 'user.ts'), `
      export function getUser(id: string) { return null }
    `)

    const graph = await builder.buildDirectory(tempDir)

    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(graph.edges.length).toBeGreaterThan(0)
  })

  it('should update graph incrementally', async () => {
    // Initial build
    await fs.writeFile(path.join(tempDir, 'auth.ts'), `
      export function login(user: string) { return true }
    `)
    const graph1 = await builder.buildDirectory(tempDir)
    const initialNodes = graph1.nodes.length

    // Add new file
    await fs.writeFile(path.join(tempDir, 'new.ts'), `
      export function newFunc() { return true }
    `)

    const graph2 = await builder.updateDirectory(tempDir, ['new.ts'])
    expect(graph2.nodes.length).toBeGreaterThan(initialNodes)
  })
})
