import type { Graph } from './graph-builder.js'
import fs from 'fs/promises'

export class GraphStorage {
  async save(graph: Graph, filePath: string): Promise<void> {
    const data = JSON.stringify(graph, null, 2)
    await fs.writeFile(filePath, data, 'utf-8')
  }

  async load(filePath: string): Promise<Graph> {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}
