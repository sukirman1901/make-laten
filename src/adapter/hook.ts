import fs from 'fs/promises'
import path from 'path'
import type { AgentAdapter, AdapterOutput, AdapterRequest, ToolCall, ToolResult, HookConfig } from './types.js'

export class HookAdapter implements AgentAdapter {
  name: string
  version = '1.0.0'
  type = 'hook' as const
  private hooks: HookConfig = {}

  constructor(name: string) {
    this.name = name
  }

  format(input: AdapterRequest): AdapterOutput {
    const { content, context } = input
    const parts: string[] = []

    if (context?.filePath) {
      parts.push(`**File:** \`${context.filePath}\``)
    }

    parts.push(content)

    return {
      output: parts.join('\n\n'),
      format: this.name,
      metadata: { filePath: context?.filePath, timestamp: Date.now() }
    }
  }

  parse(output: string): any {
    return { content: output, parsed: true }
  }

  setHooks(hooks: HookConfig): void {
    this.hooks = hooks
  }

  async intercept(toolCall: ToolCall): Promise<ToolCall | null> {
    if (this.hooks.preToolUse) {
      return this.hooks.preToolUse(toolCall)
    }
    return toolCall
  }

  async postProcess(result: ToolResult): Promise<ToolResult> {
    if (this.hooks.postToolUse) {
      return this.hooks.postToolUse(result)
    }
    return result
  }

  async install(agentPath: string): Promise<void> {
    const hooksDir = path.join(agentPath, 'hooks')
    await fs.mkdir(hooksDir, { recursive: true })

    const preToolHook = `#!/usr/bin/env node
const { readFileSync } = require('fs');
const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));

if (input.tool === 'Read' || input.tool === 'Bash') {
  process.env.MAKE_LATEN_INTERCEPT = '1';
}

process.stdout.write(JSON.stringify(input));
`
    const postToolHook = `#!/usr/bin/env node
const { readFileSync } = require('fs');
const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));

if (input.output && input.output.length > 10000) {
  input.output = input.output.slice(0, 10000) + '\\n... (truncated by make-laten)';
}

process.stdout.write(JSON.stringify(input));
`

    await fs.writeFile(path.join(hooksDir, 'pre-tool-use.js'), preToolHook)
    await fs.writeFile(path.join(hooksDir, 'post-tool-use.js'), postToolHook)
  }

  async uninstall(agentPath: string): Promise<void> {
    const hooksDir = path.join(agentPath, 'hooks')
    try {
      await fs.rm(path.join(hooksDir, 'pre-tool-use.js'), { force: true })
      await fs.rm(path.join(hooksDir, 'post-tool-use.js'), { force: true })
    } catch {}
  }

  async isInstalled(agentPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(agentPath, 'hooks', 'pre-tool-use.js'))
      return true
    } catch {
      return false
    }
  }
}
