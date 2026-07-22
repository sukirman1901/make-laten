import { ClaudeCodeAdapter } from './claude-code.js'
import { CodexAdapter } from './codex.js'
import { GeminiCliAdapter } from './gemini-cli.js'
import { HookAdapter } from './hook.js'
import { RulesAdapter } from './rules.js'
import { Installer } from './installer.js'
import { AgentDetector } from './detector.js'
import type { AgentAdapter, AgentInfo, AdapterType } from './types.js'

const adapters = new Map<string, AgentAdapter>()

adapters.set('claude-code', new ClaudeCodeAdapter())
adapters.set('codex', new CodexAdapter())
adapters.set('gemini-cli', new GeminiCliAdapter())

export function getAdapter(name: string): AgentAdapter | undefined {
  return adapters.get(name)
}

export function getAdapters(): AgentAdapter[] {
  return Array.from(adapters.values())
}

export function createAdapter(config: AgentAdapter): AgentAdapter {
  return config
}

export function registerAdapter(name: string, adapter: AgentAdapter): void {
  adapters.set(name, adapter)
}

export function createHookAdapter(name: string): HookAdapter {
  return new HookAdapter(name)
}

export function createRulesAdapter(name: string): RulesAdapter {
  return new RulesAdapter(name)
}

export function createInstaller(): Installer {
  return new Installer()
}

export function createDetector(): AgentDetector {
  return new AgentDetector()
}

export type { AgentAdapter, AgentInfo, AdapterConfig, AdapterOutput, AdapterType } from './types.js'
export { AGENT_CONFIGS } from './types.js'
export { ClaudeCodeAdapter } from './claude-code.js'
export { CodexAdapter } from './codex.js'
export { GeminiCliAdapter } from './gemini-cli.js'
export { HookAdapter } from './hook.js'
export { RulesAdapter } from './rules.js'
export { Installer } from './installer.js'
export { AgentDetector } from './detector.js'
