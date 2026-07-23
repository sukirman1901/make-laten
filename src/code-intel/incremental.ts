import { ASTBuilder } from './ast-builder.js'
import { GraphBuilder } from './graph-builder.js'
import type { Graph } from './graph-builder.js'
import fs from 'fs/promises'
import path from 'path'

export class IncrementalBuilder {
  private astBuilder: ASTBuilder
  private graphBuilder: GraphBuilder
  private graph: Graph = { nodes: [], edges: [] }

  constructor() {
    this.astBuilder = new ASTBuilder()
    this.graphBuilder = new GraphBuilder()
  }

  async buildDirectory(dirPath: string): Promise<Graph> {
    await this.astBuilder.init()

    const files = await this.getFiles(dirPath)
    this.graph = { nodes: [], edges: [] }

    for (const file of files) {
      const code = await fs.readFile(file, 'utf-8')
      const relativePath = path.relative(dirPath, file)
      const language = this.detectLanguage(relativePath)

      try {
        const ast = await this.astBuilder.parse(code, language)
        const fileGraph = await this.graphBuilder.build(ast, relativePath)

        this.graph.nodes.push(...fileGraph.nodes)
        this.graph.edges.push(...fileGraph.edges)
      } catch (error) {
        console.error(`Failed to parse ${relativePath}:`, error)
      }
    }

    return this.graph
  }

  async updateDirectory(dirPath: string, changedFiles: string[]): Promise<Graph> {
    // Remove old nodes/edges for changed files
    for (const file of changedFiles) {
      this.graph.nodes = this.graph.nodes.filter(n => n.filePath !== file)
      this.graph.edges = this.graph.edges.filter(e =>
        !e.source.startsWith(`file:${file}`) &&
        !e.target.startsWith(`file:${file}`)
      )
    }

    // Re-parse changed files
    for (const file of changedFiles) {
      const fullPath = path.join(dirPath, file)
      try {
        const code = await fs.readFile(fullPath, 'utf-8')
        const language = this.detectLanguage(file)
        const ast = await this.astBuilder.parse(code, language)
        const fileGraph = await this.graphBuilder.build(ast, file)

        this.graph.nodes.push(...fileGraph.nodes)
        this.graph.edges.push(...fileGraph.edges)
      } catch (error) {
        console.error(`Failed to update ${file}:`, error)
      }
    }

    return this.graph
  }

  getGraph(): Graph {
    return this.graph
  }

  private async getFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...await this.getFiles(fullPath))
      } else if (entry.isFile() && this.isSupported(entry.name)) {
        files.push(fullPath)
      }
    }

    return files
  }

  private isSupported(filename: string): boolean {
    const supported = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.php']
    return supported.some(ext => filename.endsWith(ext))
  }

  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', go: 'go', rs: 'rust', java: 'java', rb: 'ruby', php: 'php'
    }
    return map[ext || ''] || 'unknown'
  }
}
