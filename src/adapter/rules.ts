import fs from 'fs/promises'
import path from 'path'
import type { AgentAdapter, AdapterOutput, AdapterRequest } from './types.js'
import { AGENT_CONFIGS } from './types.js'

const RULES_TEMPLATE = `
# make-laten efficiency rules

## Token Optimization
- When reading files, prefer using \`make-laten read <file>\` for compressed output
- When searching code, prefer using \`make-laten grep <pattern>\` for grouped results
- When checking git status, prefer using \`make-laten git diff\` for condensed output

## Caching
- make-laten automatically caches frequently accessed files
- Use \`make-laten cache stats\` to see cache performance
- Use \`make-laten cache clear\` to reset cache if needed

## Web Search
- Use \`make-laten search <query>\` for optimized web search
- Use \`make-laten fetch <url>\` for compressed web fetch
`

export class RulesAdapter implements AgentAdapter {
  name: string
  version = '1.0.0'
  type = 'rules' as const

  constructor(agentName: string) {
    this.name = agentName
  }

  format(input: AdapterRequest): AdapterOutput {
    return {
      output: input.content,
      format: 'markdown',
      metadata: { agent: this.name, timestamp: Date.now() }
    }
  }

  parse(output: string): any {
    return { content: output }
  }

  async install(agentPath: string): Promise<void> {
    const config = AGENT_CONFIGS[this.name]
    if (!config?.rulesFile) {
      throw new Error(`No rules file configured for ${this.name}`)
    }

    const rulesPath = path.join(agentPath, config.rulesFile)
    const existing = await fs.readFile(rulesPath, 'utf-8').catch(() => '')

    if (existing.includes('make-laten')) {
      return
    }

    await fs.mkdir(path.dirname(rulesPath), { recursive: true })
    await fs.writeFile(rulesPath, existing + '\n\n' + RULES_TEMPLATE)
  }

  async uninstall(agentPath: string): Promise<void> {
    const config = AGENT_CONFIGS[this.name]
    if (!config?.rulesFile) return

    const rulesPath = path.join(agentPath, config.rulesFile)
    try {
      let content = await fs.readFile(rulesPath, 'utf-8')
      const marker = '# make-laten efficiency rules'
      const idx = content.indexOf(marker)
      if (idx !== -1) {
        const endIdx = content.indexOf('\n#', idx + marker.length)
        content = content.slice(0, idx).trim() + '\n' + (endIdx !== -1 ? content.slice(endIdx) : '')
        await fs.writeFile(rulesPath, content.trim() + '\n')
      }
    } catch {}
  }

  async isInstalled(agentPath: string): Promise<boolean> {
    const config = AGENT_CONFIGS[this.name]
    if (!config?.rulesFile) return false

    try {
      const content = await fs.readFile(path.join(agentPath, config.rulesFile), 'utf-8')
      return content.includes('make-laten')
    } catch {
      return false
    }
  }
}
