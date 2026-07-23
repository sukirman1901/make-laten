# RFC 004: Agent Adapter Protocol

**Status:** Draft
**Author:** make-laten team
**Date:** 2026-07-22
**Depends on:** [RFC 001: Architecture](./001-architecture.md)

---

## Summary

Define the protocol for integrating make-laten with 30+ AI coding agents through a unified adapter interface.

---

## Motivation

Each AI coding agent has different:
1. **Tool interfaces** — WebFetch, Read, Grep, Bash, etc.
2. **Extension mechanisms** — hooks, plugins, rules, proxy
3. **Configuration formats** — JSON, YAML, TOML, markdown
4. **Lifecycle events** — pre-tool, post-tool, session start/end

The Agent Adapter Layer provides a unified interface that abstracts these differences.

---

## Adapter Types

### 1. Hook Adapter

**For:** Claude Code, Codex, Gemini CLI

**Mechanism:** Intercept tool calls via PreToolUse/PostToolUse events

```typescript
class HookAdapter implements AgentAdapter {
  name = 'claude-code'
  type = 'hook'
  
  async install(agentPath: string): Promise<void> {
    // 1. Create hooks directory
    const hooksDir = path.join(agentPath, '.claude', 'hooks')
    await fs.mkdir(hooksDir, { recursive: true })
    
    // 2. Write PreToolUse hook
    await fs.writeFile(
      path.join(hooksDir, 'pre-tool-use.js'),
      this.generatePreToolUseHook()
    )
    
    // 3. Write PostToolUse hook
    await fs.writeFile(
      path.join(hooksDir, 'post-tool-use.js'),
      this.generatePostToolUseHook()
    )
    
    // 4. Register hooks in settings
    await this.updateSettings(agentPath)
  }
  
  private generatePreToolUseHook(): string {
    return `
const { MakeLaten } = require('make-laten');

module.exports = async function preToolUse(toolCall) {
  const makeLaten = await MakeLaten.getInstance();
  
  // Check if tool should be intercepted
  if (makeLaten.shouldIntercept(toolCall)) {
    return await makeLaten.intercept(toolCall);
  }
  
  return toolCall; // pass through
};
`
  }
  
  async intercept(toolCall: ToolCall): Promise<ToolCall | null> {
    const makeLaten = await MakeLaten.getInstance()
    
    // 1. Check cache
    const cached = await makeLaten.cache.get(toolCall)
    if (cached) return { ...toolCall, result: cached }
    
    // 2. Compress input
    const compressed = await makeLaten.compress.intercept(toolCall)
    
    // 3. Route to optimized version
    const routed = await makeLaten.route.optimize(compressed)
    
    return routed
  }
}
```

### 2. Plugin Adapter

**For:** OpenCode, OpenClaw

**Mechanism:** Native plugin API

```typescript
class PluginAdapter implements AgentAdapter {
  name = 'opencode'
  type = 'plugin'
  
  async install(agentPath: string): Promise<void> {
    // 1. Create plugin directory
    const pluginDir = path.join(agentPath, '.opencode', 'plugins')
    await fs.mkdir(pluginDir, { recursive: true })
    
    // 2. Write plugin manifest
    await fs.writeFile(
      path.join(pluginDir, 'make-laten.json'),
      JSON.stringify({
        name: 'make-laten',
        version: '1.0.0',
        entry: './index.js',
        hooks: ['tool.execute.before', 'tool.execute.after']
      })
    )
    
    // 3. Write plugin entry
    await fs.writeFile(
      path.join(pluginDir, 'index.js'),
      this.generatePluginEntry()
    )
  }
  
  private generatePluginEntry(): string {
    return `
const { MakeLaten } = require('make-laten');

module.exports = {
  'tool.execute.before': async (context) => {
    const makeLaten = await MakeLaten.getInstance();
    return await makeLaten.intercept(context.toolCall);
  },
  
  'tool.execute.after': async (context) => {
    const makeLaten = await MakeLaten.getInstance();
    return await makeLaten.postProcess(context.result);
  }
};
`
  }
}
```

### 3. Rules Adapter

**For:** Cursor, Windsurf, Cline, Copilot

**Mechanism:** Inject into rules/config file

```typescript
class RulesAdapter implements AgentAdapter {
  name = 'cursor'
  type = 'rules'
  
  async install(agentPath: string): Promise<void> {
    // 1. Determine rules file path
    const rulesPath = this.getRulesPath(agentPath)
    
    // 2. Read existing rules
    const existing = await fs.readFile(rulesPath, 'utf-8').catch(() => '')
    
    // 3. Check if already installed
    if (existing.includes('make-laten')) {
      console.log('make-laten already installed')
      return
    }
    
    // 4. Append make-laten rules
    const rules = this.generateRules()
    await fs.writeFile(rulesPath, existing + '\n\n' + rules)
  }
  
  private generateRules(): string {
    return `
# make-laten efficiency rules

## Token Optimization
- When reading files, prefer using \`make-laten read\` for compressed output
- When searching code, prefer using \`make-laten grep\` for grouped results
- When checking git status, prefer using \`make-laten git\` for condensed output

## Caching
- make-laten automatically caches frequently accessed files
- Use \`make-laten cache stats\` to see cache performance
- Use \`make-laten cache clear\` to reset cache if needed

## Web Search
- make-laten can compress web content automatically
- Use \`make-laten.fetch\` for compressed web fetches
- Use \`make-laten.search\` for optimized web searches

## Learning
- make-laten learns from your workflow patterns
- Patterns are stored in \`~/.make-laten/graph.db\`
- Use \`make-laten learn stats\` to see learned patterns
`
  }
  
  private getRulesPath(agentPath: string): string {
    const agentName = path.basename(agentPath)
    
    const paths: Record<string, string> = {
      'cursor': '.cursorrules',
      'windsurf': '.windsurfrules',
      'cline': '.clinerules',
      'copilot': '.github/copilot-instructions.md'
    }
    
    return path.join(agentPath, paths[agentName] || '.cursorrules')
  }
}
```

### 4. Proxy Adapter

**For:** Any agent with proxy support

**Mechanism:** HTTP proxy for API calls

```typescript
class ProxyAdapter implements AgentAdapter {
  name = 'generic-proxy'
  type = 'proxy'
  
  async install(agentPath: string): Promise<void> {
    // 1. Start proxy server
    const server = await this.startProxy()
    
    // 2. Write proxy config
    const config = {
      proxyUrl: `http://localhost:${server.port}`,
      intercept: true
    }
    
    await fs.writeFile(
      path.join(agentPath, '.make-laten-proxy.json'),
      JSON.stringify(config, null, 2)
    )
    
    // 3. Write setup instructions
    await fs.writeFile(
      path.join(agentPath, 'PROXY_SETUP.md'),
      this.generateSetupInstructions(config)
    )
  }
  
  private async startProxy(): Promise<Server> {
    const server = http.createServer(async (req, res) => {
      // 1. Intercept request
      const intercepted = await this.interceptRequest(req)
      
      // 2. Forward to original target
      const response = await this.forwardRequest(intercepted)
      
      // 3. Compress response
      const compressed = await this.compressResponse(response)
      
      // 4. Return to agent
      res.writeHead(response.statusCode, response.headers)
      res.end(compressed)
    })
    
    return new Promise((resolve) => {
      server.listen(0, () => resolve(server))
    })
  }
}
```

### 5. MCP Adapter

**For:** Any MCP-compatible agent

**Mechanism:** MCP server tools

```typescript
class MCPAdapter implements AgentAdapter {
  name = 'mcp'
  type = 'mcp'
  
  async install(agentPath: string): Promise<void> {
    // 1. Create MCP config
    const mcpConfig = {
      mcpServers: {
        'make-laten': {
          command: 'node',
          args: ['path/to/make-laten-mcp-server.js']
        }
      }
    }
    
    // 2. Write to agent's MCP config
    const configPath = this.getMCPConfigPath(agentPath)
    await fs.writeFile(configPath, JSON.stringify(mcpConfig, null, 2))
  }
  
  private getMCPConfigPath(agentPath: string): string {
    // Agent-specific MCP config paths
    const paths: Record<string, string> = {
      'claude-code': '.claude/mcp.json',
      'cursor': '.cursor/mcp.json',
      'codex': '.codex/mcp.json'
    }
    
    const agentName = path.basename(agentPath)
    return path.join(agentPath, paths[agentName] || '.mcp.json')
  }
}
```

---

## Universal Interface

```typescript
interface AgentAdapter {
  name: string
  type: 'hook' | 'plugin' | 'rules' | 'proxy' | 'mcp'
  
  // Lifecycle
  install(agentPath: string): Promise<void>
  uninstall(agentPath: string): Promise<void>
  isInstalled(agentPath: string): Promise<boolean>
  
  // Interception
  intercept(toolCall: ToolCall): Promise<ToolCall | null>
  postProcess(result: ToolResult): Promise<ToolResult>
  
  // Configuration
  getConfig(): AdapterConfig
  updateConfig(config: Partial<AdapterConfig>): Promise<void>
}
```

---

## Agent Detection

```typescript
class AgentDetector {
  async detectAgents(): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = []
    
    // Check for Claude Code
    if (await this.hasCommand('claude')) {
      agents.push({
        name: 'claude-code',
        type: 'hook',
        path: await this.getAgentPath('claude'),
        version: await this.getAgentVersion('claude')
      })
    }
    
    // Check for Codex
    if (await this.hasCommand('codex')) {
      agents.push({
        name: 'codex',
        type: 'hook',
        path: await this.getAgentPath('codex'),
        version: await this.getAgentVersion('codex')
      })
    }
    
    // Check for Gemini CLI
    if (await this.hasCommand('gemini')) {
      agents.push({
        name: 'gemini-cli',
        type: 'hook',
        path: await this.getAgentPath('gemini'),
        version: await this.getAgentVersion('gemini')
      })
    }
    
    // Check for Cursor
    if (await this.hasDirectory('.cursor')) {
      agents.push({
        name: 'cursor',
        type: 'rules',
        path: process.cwd(),
        version: null
      })
    }
    
    // Check for Windsurf
    if (await this.hasDirectory('.windsurf')) {
      agents.push({
        name: 'windsurf',
        type: 'rules',
        path: process.cwd(),
        version: null
      })
    }
    
    return agents
  }
}
```

---

## Installation Flow

```typescript
class Installer {
  async install(options: InstallOptions): Promise<void> {
    // 1. Detect installed agents
    const detector = new AgentDetector()
    const agents = await detector.detectAgents()
    
    // 2. Install for each agent
    for (const agent of agents) {
      const adapter = this.getAdapter(agent.type)
      
      console.log(`Installing for ${agent.name}...`)
      await adapter.install(agent.path)
      
      console.log(`✓ ${agent.name} configured`)
    }
    
    // 3. Install core
    await this.installCore()
    
    // 4. Verify installation
    await this.verify()
    
    console.log('\nInstallation complete!')
    console.log(`Installed for ${agents.length} agent(s)`)
  }
  
  private async installCore(): Promise<void> {
    // 1. Create directories
    const dirs = [
      '~/.make-laten',
      '~/.make-laten/bin',
      '~/.make-laten/cache',
      '~/.make-laten/graph'
    ]
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true })
    }
    
    // 2. Initialize database
    await this.initDatabase()
    
    // 3. Write default config
    await this.writeDefaultConfig()
    
    // 4. Add to PATH
    await this.addToPath()
  }
}
```

---

## Per-Agent Configuration

### Claude Code

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.make-laten/bin/pre-tool-use.js"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.make-laten/bin/post-tool-use.js"
          }
        ]
      }
    ]
  }
}
```

### Codex

```markdown
# AGENTS.md (additions)

## make-laten Integration

When performing operations, use make-laten for optimized outputs:

- File reads: Use `make-laten read <file>` for compressed output
- Code search: Use `make-laten grep <pattern>` for grouped results
- Git operations: Use `make-laten git <command>` for condensed output
- Web fetch: Use `make-laten.fetch <url>` for compressed content

Cache is automatic. Use `make-laten cache stats` to check performance.
```

### Gemini CLI

```json
{
  "extensions": {
    "make-laten": {
      "path": "~/.make-laten/gemini-extension",
      "enabled": true
    }
  }
}
```

### Cursor

```markdown
# .cursorrules (additions)

## Efficiency Rules

Use make-laten for optimized operations:

- `make-laten read <file>` — compressed file read
- `make-laten grep <pattern>` — grouped search results
- `make-laten git <command>` — condensed git output
- `make-laten.fetch <url>` — compressed web fetch
- `make-laten.search <query>` — optimized web search

Cache is automatic across sessions.
```

---

## Uninstallation

```typescript
class Uninstaller {
  async uninstall(): Promise<void> {
    // 1. Detect installed agents
    const detector = new AgentDetector()
    const agents = await detector.detectAgents()
    
    // 2. Uninstall from each agent
    for (const agent of agents) {
      const adapter = this.getAdapter(agent.type)
      
      console.log(`Uninstalling from ${agent.name}...`)
      await adapter.uninstall(agent.path)
      
      console.log(`✓ ${agent.name} cleaned up`)
    }
    
    // 3. Remove core files
    await this.removeCore()
    
    console.log('\nUninstallation complete!')
  }
  
  private async removeCore(): Promise<void> {
    // Remove ~/.make-laten directory
    await fs.rm('~/.make-laten', { recursive: true, force: true })
    
    // Remove from PATH
    await this.removeFromPath()
  }
}
```

---

## Error Handling

```typescript
class AdapterError extends Error {
  constructor(
    public adapter: string,
    public agent: string,
    message: string,
    public cause?: Error
  ) {
    super(`[${adapter}/${agent}] ${message}`)
  }
}

// Usage
try {
  await adapter.install(agentPath)
} catch (error) {
  if (error instanceof AdapterError) {
    console.error(`Failed to install for ${error.agent}: ${error.message}`)
    if (error.cause) {
      console.error('Cause:', error.cause.message)
    }
  }
}
```

---

## Open Questions

1. How to handle agents that don't support hooks or plugins?
2. Should we provide a fallback mode for unsupported agents?
3. How to version adapter interfaces for backward compatibility?
4. Should we support agent-specific compression strategies?
