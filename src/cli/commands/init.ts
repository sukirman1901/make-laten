import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import readline from 'readline'
import { CLAUDE_MD, CURSORRULES, AGENTS_MD, GEMINI_MD } from '../templates/index.js'

const execAsync = promisify(exec)

interface AgentInfo {
  name: string
  detected: boolean
  configPath: string
  version?: string
  writeConfig: (configPath: string) => Promise<boolean>
}

function getHome(): string {
  return process.env.HOME || process.env.USERPROFILE || ''
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execAsync(`which ${cmd}`, { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath)
    return true
  } catch {
    return false
  }
}

async function readJSON(filePath: string): Promise<Record<string, any>> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeJSON(filePath: string, data: Record<string, any>): Promise<boolean> {
  try {
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
    return true
  } catch {
    return false
  }
}

async function writeFile(filePath: string, content: string): Promise<boolean> {
  try {
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, content)
    return true
  } catch {
    return false
  }
}

const MCP_CMD = ['npx', '-y', 'make-laten-mcp', 'server']

async function detectAllAgents(): Promise<AgentInfo[]> {
  const home = getHome()
  const agents: AgentInfo[] = []

  // Claude Code — uses mcpServers format
  agents.push({
    name: 'Claude Code',
    detected: await commandExists('claude') || await directoryExists(path.join(home, '.claude')),
    configPath: path.join(home, '.claude', 'mcp.json'),
    version: await commandExists('claude') ? (await execAsync('claude --version', { timeout: 3000 }).then(r => r.stdout.trim().split('\n')[0]).catch(() => 'unknown')) : undefined,
    writeConfig: async (p) => {
      const data = await readJSON(p)
      data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] } }
      const mcpSuccess = await writeJSON(p, data)
      const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md')
      const claudeSuccess = await writeFile(claudeMdPath, CLAUDE_MD)
      return mcpSuccess && claudeSuccess
    }
  })

  // Cursor — uses mcpServers format
  agents.push({
    name: 'Cursor',
    detected: await directoryExists(path.join(home, '.cursor')),
    configPath: path.join(home, '.cursor', 'mcp.json'),
    writeConfig: async (p) => {
      const data = await readJSON(p)
      data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] } }
      const mcpSuccess = await writeJSON(p, data)
      const cursorrulesPath = path.join(process.cwd(), '.cursorrules')
      const cursorSuccess = await writeFile(cursorrulesPath, CURSORRULES)
      return mcpSuccess && cursorSuccess
    }
  })

  // Codex — uses mcpServers format
  agents.push({
    name: 'Codex',
    detected: await commandExists('codex') || await directoryExists(path.join(home, '.codex')),
    configPath: path.join(home, '.codex', 'config.json'),
    writeConfig: async (p) => {
      const data = await readJSON(p)
      data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] } }
      const mcpSuccess = await writeJSON(p, data)
      const agentsMdPath = path.join(process.cwd(), 'AGENTS.md')
      const agentsSuccess = await writeFile(agentsMdPath, AGENTS_MD)
      return mcpSuccess && agentsSuccess
    }
  })

  // OpenCode — uses mcp format (type + command array)
  agents.push({
    name: 'OpenCode',
    detected: await directoryExists(path.join(home, '.config', 'opencode')),
    configPath: path.join(home, '.config', 'opencode', 'opencode.json'),
    writeConfig: async (p) => {
      const data = await readJSON(p)
      // OpenCode uses "mcp" key, NOT "mcpServers"
      // Format: { "type": "local", "command": [...], "enabled": true }
      data.mcp = { ...(data.mcp || {}), 'make-laten': { type: 'local', command: MCP_CMD, enabled: true } }
      // Remove wrong mcpServers key if exists
      delete data.mcpServers
      return writeJSON(p, data)
    }
  })

  // Windsurf — uses mcpServers format
  agents.push({
    name: 'Windsurf',
    detected: await directoryExists(path.join(home, '.codeium', 'windsurf')),
    configPath: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
    writeConfig: async (p) => {
      const data = await readJSON(p)
      data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] } }
      return writeJSON(p, data)
    }
  })

  // Cline — uses mcpServers format
  agents.push({
    name: 'Cline',
    detected: await directoryExists(path.join(home, '.cline')),
    configPath: path.join(home, '.cline', 'mcp_settings.json'),
    writeConfig: async (p) => {
      const data = await readJSON(p)
      data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] } }
      return writeJSON(p, data)
    }
  })

  // Gemini CLI
  agents.push({
    name: 'Gemini CLI',
    detected: await commandExists('gemini') || await directoryExists(path.join(home, '.gemini')),
    configPath: path.join(home, '.gemini', 'settings.json'),
    writeConfig: async (p) => {
      const data = await readJSON(p)
      data.mcpServers = { ...(data.mcpServers || {}), 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] } }
      const mcpSuccess = await writeJSON(p, data)
      const geminiMdPath = path.join(process.cwd(), 'GEMINI.md')
      const geminiSuccess = await writeFile(geminiMdPath, GEMINI_MD)
      return mcpSuccess && geminiSuccess
    }
  })

  return agents
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

export async function initCommand(options: { all?: boolean; project?: boolean }): Promise<void> {
  console.log('')
  console.log('  make-laten setup wizard')
  console.log('  ======================')
  console.log('')

  const agents = await detectAllAgents()
  const detected = agents.filter(a => a.detected)
  const notDetected = agents.filter(a => !a.detected)

  console.log('  Detected agents:')
  for (const agent of detected) {
    const ver = agent.version ? ` v${agent.version}` : ''
    console.log(`    ✓ ${agent.name}${ver}`)
  }

  if (notDetected.length > 0) {
    console.log('')
    console.log('  Not detected (skipped):')
    for (const agent of notDetected) {
      console.log(`    ○ ${agent.name}`)
    }
  }

  console.log('')

  if (options.all) {
    for (const agent of detected) {
      const success = await agent.writeConfig(agent.configPath)
      if (success) {
        console.log(`    ✓ ${agent.name} → MCP configured`)
      } else {
        console.log(`    ✗ ${agent.name} → failed to write config`)
      }
    }
  } else if (options.project) {
    const cwd = process.cwd()
    const configPath = path.join(cwd, '.mcp.json')
    const data = { mcpServers: { 'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] } } }
    await writeJSON(configPath, data)
    console.log(`    ✓ .mcp.json created in ${cwd}`)
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    for (const agent of detected) {
      const answer = await askQuestion(rl, `    Configure ${agent.name}? (Y/n) `)
      if (answer.toLowerCase() !== 'n') {
        const success = await agent.writeConfig(agent.configPath)
        if (success) {
          console.log(`      ✓ ${agent.name} → MCP configured`)
        } else {
          console.log(`      ✗ ${agent.name} → failed`)
        }
      } else {
        console.log(`      ○ ${agent.name} → skipped`)
      }
    }

    rl.close()
  }

  console.log('')
  console.log('  Setup complete!')
  console.log('')
  console.log('  make-laten provides:')
  console.log('    • MCP server → auto-compress for all AI agents')
  console.log('    • Platform configs → CLAUDE.md, .cursorrules, AGENTS.md, GEMINI.md')
  console.log('    • CLI commands → mread, mgrep, mdiff, msearch, mfetch')
  console.log('')
  console.log('  Restart your agent to activate MCP tools.')
  console.log('')
}
