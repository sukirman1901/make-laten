export interface PluginContext {
  config: Record<string, any>
  logger: Console
}

export interface PluginResult {
  success: boolean
  data?: any
  error?: string
}

export interface Plugin {
  name: string
  version: string
  initialize: (ctx: PluginContext) => Promise<void>
  execute: (input: any) => Promise<PluginResult>
  destroy?: () => Promise<void>
}
