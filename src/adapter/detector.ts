import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import type { AgentInfo } from './types.js'
import { AGENT_CONFIGS } from './types.js'

const execAsync = promisify(exec)

export class AgentDetector {
  async detectAgents(): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = []

    for (const [name, config] of Object.entries(AGENT_CONFIGS)) {
      const detected = await this.detectAgent(name, config.type)
      if (detected) {
        agents.push(detected)
      }
    }

    return agents
  }

  async detectAgent(name: string, type: string): Promise<AgentInfo | null> {
    const commands: Record<string, string> = {
      'claude-code': 'claude --version',
      'codex': 'codex --version',
      'gemini-cli': 'gemini --version'
    }

    if (commands[name]) {
      try {
        const { stdout } = await execAsync(commands[name], { timeout: 5000 })
        const version = stdout.trim().split('\n')[0]
        const agentPath = await this.getAgentPath(name)
        return { name, type: type as any, path: agentPath, version, detected: true }
      } catch {
        return null
      }
    }

    if (type === 'rules') {
      const rulesPath = AGENT_CONFIGS[name]?.rulesFile
      if (rulesPath) {
        try {
          await fs.access(path.join(process.cwd(), rulesPath))
          return { name, type: type as any, path: process.cwd(), version: null, detected: true }
        } catch {
          return null
        }
      }
    }

    return null
  }

  async getAgentPath(name: string): Promise<string> {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    const paths: Record<string, string> = {
      'claude-code': path.join(home, '.claude'),
      'codex': path.join(home, '.codex'),
      'gemini-cli': path.join(home, '.gemini')
    }
    return paths[name] || path.join(home, `.${name}`)
  }

  async hasCommand(cmd: string): Promise<boolean> {
    try {
      await execAsync(`which ${cmd}`, { timeout: 3000 })
      return true
    } catch {
      return false
    }
  }
}
