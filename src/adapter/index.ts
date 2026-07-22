import { ClaudeCodeAdapter } from './claude-code.js'
import { CodexAdapter } from './codex.js'
import { GeminiCliAdapter } from './gemini-cli.js'
import type { AgentAdapter } from './types.js'

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

export type { AgentAdapter, AdapterConfig, AdapterOutput } from './types.js'
export { ClaudeCodeAdapter } from './claude-code.js'
export { CodexAdapter } from './codex.js'
export { GeminiCliAdapter } from './gemini-cli.js'
