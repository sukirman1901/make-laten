export type AdapterType = 'hook' | 'plugin' | 'rules' | 'proxy' | 'mcp'

export interface AgentAdapter {
  name: string
  version: string
  type: AdapterType
  format: (input: any) => AdapterOutput
  parse?: (output: string) => any
  install?(agentPath: string): Promise<void>
  uninstall?(agentPath: string): Promise<void>
  isInstalled?(agentPath: string): Promise<boolean>
}

export interface AgentInfo {
  name: string
  type: AdapterType
  path: string
  version: string | null
  detected: boolean
}

export interface ToolCall {
  name: string
  params: Record<string, any>
  timestamp?: number
}

export interface ToolResult {
  name: string
  output: string
  success: boolean
  metadata?: Record<string, any>
}

export interface AdapterConfig {
  maxTokens?: number
  supportsStreaming?: boolean
  supportsImages?: boolean
  customHeaders?: Record<string, string>
}

export interface AdapterOutput {
  output: string
  format: string
  metadata?: Record<string, any>
}

export interface AdapterRequest {
  content: string
  context?: Record<string, any>
}

export interface HookConfig {
  preToolUse?: (toolCall: ToolCall) => Promise<ToolCall | null>
  postToolUse?: (result: ToolResult) => Promise<ToolResult>
}

export const AGENT_CONFIGS: Record<string, { type: AdapterType; rulesFile?: string; configPath?: string }> = {
  'claude-code': { type: 'hook' },
  'codex': { type: 'hook' },
  'gemini-cli': { type: 'hook' },
  'cursor': { type: 'rules', rulesFile: '.cursorrules' },
  'windsurf': { type: 'rules', rulesFile: '.windsurfrules' },
  'cline': { type: 'rules', rulesFile: '.clinerules' },
  'copilot': { type: 'rules', rulesFile: '.github/copilot-instructions.md' }
}
