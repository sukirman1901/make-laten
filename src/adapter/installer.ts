import type { AgentInfo, AgentAdapter } from './types.js'
import { AgentDetector } from './detector.js'
import { HookAdapter } from './hook.js'
import { RulesAdapter } from './rules.js'
import { AGENT_CONFIGS } from './types.js'

export class Installer {
  private detector = new AgentDetector()

  async install(): Promise<{ installed: string[]; skipped: string[] }> {
    const agents = await this.detector.detectAgents()
    const installed: string[] = []
    const skipped: string[] = []

    for (const agent of agents) {
      try {
        const adapter = this.createAdapter(agent)
        if (adapter.install) {
          await adapter.install(agent.path)
          installed.push(agent.name)
        } else {
          skipped.push(agent.name)
        }
      } catch {
        skipped.push(agent.name)
      }
    }

    return { installed, skipped }
  }

  async uninstall(): Promise<{ removed: string[] }> {
    const agents = await this.detector.detectAgents()
    const removed: string[] = []

    for (const agent of agents) {
      try {
        const adapter = this.createAdapter(agent)
        if (adapter.uninstall) {
          await adapter.uninstall(agent.path)
          removed.push(agent.name)
        }
      } catch {}
    }

    return { removed }
  }

  async status(): Promise<AgentInfo[]> {
    const agents = await this.detector.detectAgents()

    for (const agent of agents) {
      const adapter = this.createAdapter(agent)
      if (adapter.isInstalled) {
        agent.detected = await adapter.isInstalled(agent.path)
      }
    }

    return agents
  }

  private createAdapter(agent: AgentInfo): AgentAdapter {
    const config = AGENT_CONFIGS[agent.name]

    if (config?.type === 'rules') {
      return new RulesAdapter(agent.name)
    }

    return new HookAdapter(agent.name)
  }
}
