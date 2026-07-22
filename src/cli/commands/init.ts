import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import readline from 'readline'

const execAsync = promisify(exec)

interface AgentInfo {
  name: string
  detected: boolean
  configPath: string
  mcpConfig: Record<string, any>
  version?: string
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

const MCP_ENTRY = 'npx -y make-laten-mcp'

async function detectAllAgents(): Promise<AgentInfo[]> {
  const home = getHome()
  const agents: AgentInfo[] = []

  // Claude Code
  const claudeConfig = path.join(home, '.claude', 'mcp.json')
  const claudeDir = path.join(home, '.claude')
  agents.push({
    name: 'Claude Code',
    detected: await commandExists('claude') || await directoryExists(claudeDir),
    configPath: claudeConfig,
    mcpConfig: {
      mcpServers: {
        'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
      }
    },
    version: await commandExists('claude') ? (await execAsync('claude --version', { timeout: 3000 }).then(r => r.stdout.trim().split('\n')[0]).catch(() => 'unknown')) : undefined
  })

  // Cursor
  const cursorMcp = path.join(home, '.cursor', 'mcp.json')
  const cursorDir = path.join(home, '.cursor')
  agents.push({
    name: 'Cursor',
    detected: await directoryExists(cursorDir),
    configPath: cursorMcp,
    mcpConfig: {
      mcpServers: {
        'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
      }
    }
  })

  // Codex
  const codexMcp = path.join(home, '.codex', 'config.json')
  const codexDir = path.join(home, '.codex')
  agents.push({
    name: 'Codex',
    detected: await commandExists('codex') || await directoryExists(codexDir),
    configPath: codexMcp,
    mcpConfig: {
      mcpServers: {
        'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
      }
    }
  })

  // Windsurf
  const windsurfMcp = path.join(home, '.codeium', 'windsurf', 'mcp_config.json')
  const windsurfDir = path.join(home, '.codeium', 'windsurf')
  agents.push({
    name: 'Windsurf',
    detected: await directoryExists(windsurfDir),
    configPath: windsurfMcp,
    mcpConfig: {
      mcpServers: {
        'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
      }
    }
  })

  // OpenCode
  const openCodeConfig = path.join(home, '.config', 'opencode', 'opencode.json')
  const openCodeDir = path.join(home, '.config', 'opencode')
  agents.push({
    name: 'OpenCode',
    detected: await directoryExists(openCodeDir),
    configPath: openCodeConfig,
    mcpConfig: {
      mcpServers: {
        'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
      }
    }
  })

  // Cline
  const clineDir = path.join(home, '.cline')
  const clineMcp = path.join(home, '.cline', 'mcp_settings.json')
  agents.push({
    name: 'Cline',
    detected: await directoryExists(clineDir),
    configPath: clineMcp,
    mcpConfig: {
      mcpServers: {
        'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
      }
    }
  })

  // GitHub Copilot (VS Code)
  const vscodeDir = path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage')
  agents.push({
    name: 'GitHub Copilot (VS Code)',
    detected: await directoryExists(vscodeDir),
    configPath: '',
    mcpConfig: {}
  })

  // Gemini CLI
  const geminiDir = path.join(home, '.gemini')
  agents.push({
    name: 'Gemini CLI',
    detected: await commandExists('gemini') || await directoryExists(geminiDir),
    configPath: path.join(home, '.gemini', 'settings.json'),
    mcpConfig: {
      mcpServers: {
        'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
      }
    }
  })

  return agents
}

async function writeMCPConfig(agent: AgentInfo): Promise<boolean> {
  try {
    const dir = path.dirname(agent.configPath)
    await fs.mkdir(dir, { recursive: true })

    let existing: Record<string, any> = {}
    try {
      const raw = await fs.readFile(agent.configPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {}

    const merged = {
      ...existing,
      mcpServers: {
        ...(existing.mcpServers || {}),
        ...agent.mcpConfig.mcpServers
      }
    }

    await fs.writeFile(agent.configPath, JSON.stringify(merged, null, 2))
    return true
  } catch {
    return false
  }
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
      const success = await writeMCPConfig(agent)
      if (success) {
        console.log(`    ✓ ${agent.name} → MCP configured`)
      } else {
        console.log(`    ✗ ${agent.name} → failed`)
      }
    }
  } else if (options.project) {
    const cwd = process.cwd()
    const mcpConfig = {
      mcpServers: {
        'make-laten': { command: 'npx', args: ['-y', 'make-laten-mcp', 'server'] }
      }
    }

    const configPath = path.join(cwd, '.mcp.json')
    let existing: Record<string, any> = {}
    try {
      const raw = await fs.readFile(configPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {}

    const merged = {
      ...existing,
      mcpServers: {
        ...(existing.mcpServers || {}),
        ...mcpConfig.mcpServers
      }
    }

    await fs.writeFile(configPath, JSON.stringify(merged, null, 2))
    console.log(`    ✓ .mcp.json created in ${cwd}`)
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    for (const agent of detected) {
      const answer = await askQuestion(rl, `    Configure ${agent.name}? (Y/n) `)
      if (answer.toLowerCase() !== 'n') {
        const success = await writeMCPConfig(agent)
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
  console.log('    • CLI commands → mread, mgrep, mdiff, msearch, mfetch')
  console.log('    • Shell aliases → auto-load in new terminals')
  console.log('')
  console.log('  Restart your agent to activate MCP tools.')
  console.log('')
}
