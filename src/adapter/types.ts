export interface AgentAdapter {
  name: string
  version: string
  format: (input: any) => AdapterOutput
  parse?: (output: string) => any
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