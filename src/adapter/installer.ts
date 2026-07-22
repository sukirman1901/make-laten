import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const RULES_CONTENT = `
# make-laten efficiency rules

## Token Optimization
- When reading files, use \`make-laten read <file>\` for compressed output
- When searching code, use \`make-laten grep <pattern>\` for grouped results
- When checking git, use \`make-laten git diff\` for condensed output
- When fetching web, use \`make-laten fetch <url>\` for compressed content

## Quick Commands
- \`mread <file>\` — alias for make-laten read
- \`mgrep <pattern>\` — alias for make-laten grep
- \`mdiff\` — alias for make-laten git diff
- \`msearch <query>\` — alias for make-laten search
- \`mfetch <url>\` — alias for make-laten fetch
`

interface AgentSetup {
  name: string
  detected: () => Promise<boolean>
  install: () => Promise<void>
  uninstall: () => Promise<void>
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

async function fileContains(filePath: string, text: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content.includes(text)
  } catch {
    return false
  }
}

const agents: AgentSetup[] = [
  {
    name: 'terminal (shell aliases)',
    detected: async () => true,
    install: async () => {
      const shellInit = await execAsync('echo $SHELL').then(r => r.stdout.trim())
      const rcFile = shellInit.includes('zsh') ? '.zshrc' : '.bashrc'
      const rcPath = path.join(getHome(), rcFile)
      const marker = 'make-laten shell'

      let existing = ''
      try { existing = await fs.readFile(rcPath, 'utf-8') } catch {}

      if (!existing.includes(marker)) {
        const npmRoot = await execAsync('npm root -g').then(r => r.stdout.trim())
        const initScript = `\n# make-laten shell integration\nsource ${npmRoot}/make-laten/shell/init.sh\n`
        await fs.appendFile(rcPath, initScript)
      }
    },
    uninstall: async () => {
      const shellInit = await execAsync('echo $SHELL').then(r => r.stdout.trim())
      const rcFile = shellInit.includes('zsh') ? '.zshrc' : '.bashrc'
      const rcPath = path.join(getHome(), rcFile)
      try {
        let content = await fs.readFile(rcPath, 'utf-8')
        content = content.replace(/\n# make-laten shell integration\nsource .*\/make-laten\/shell\/init\.sh\n/g, '')
        await fs.writeFile(rcPath, content)
      } catch {}
    }
  },
  {
    name: 'claude-code',
    detected: async () => commandExists('claude'),
    install: async () => {
      const hooksDir = path.join(getHome(), '.claude', 'hooks')
      await fs.mkdir(hooksDir, { recursive: true })

      const preHook = `#!/usr/bin/env node
const { readFileSync } = require('fs');
const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));
if (input.tool === 'Read' || input.tool === 'Bash') {
  process.env.MAKE_LATEN_INTERCEPT = '1';
}
process.stdout.write(JSON.stringify(input));`

      const postHook = `#!/usr/bin/env node
const { readFileSync } = require('fs');
const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));
if (input.output && input.output.length > 10000) {
  input.output = input.output.slice(0, 10000) + '\\n... (truncated by make-laten)';
}
process.stdout.write(JSON.stringify(input));`

      await fs.writeFile(path.join(hooksDir, 'pre-tool-use.js'), preHook)
      await fs.writeFile(path.join(hooksDir, 'post-tool-use.js'), postHook)
    },
    uninstall: async () => {
      const hooksDir = path.join(getHome(), '.claude', 'hooks')
      try { await fs.rm(path.join(hooksDir, 'pre-tool-use.js'), { force: true }) } catch {}
      try { await fs.rm(path.join(hooksDir, 'post-tool-use.js'), { force: true }) } catch {}
    }
  },
  {
    name: 'cursor',
    detected: async () => {
      try { await fs.access(path.join(getHome(), '.cursor')); return true } catch { return false }
    },
    install: async () => {
      const rulesDir = path.join(getHome(), '.cursor', 'rules')
      await fs.mkdir(rulesDir, { recursive: true })
      const ruleFile = path.join(rulesDir, 'make-laten.mdc')
      const content = `---\ndescription: make-laten efficiency rules\nglobs:\n---\n${RULES_CONTENT}`
      await fs.writeFile(ruleFile, content)
    },
    uninstall: async () => {
      try { await fs.rm(path.join(getHome(), '.cursor', 'rules', 'make-laten.mdc'), { force: true }) } catch {}
    }
  },
  {
    name: 'codex',
    detected: async () => commandExists('codex'),
    install: async () => {
      const agentsMd = path.join(process.cwd(), 'AGENTS.md')
      let existing = ''
      try { existing = await fs.readFile(agentsMd, 'utf-8') } catch {}
      if (!existing.includes('make-laten')) {
        const content = existing + '\n\n## make-laten Integration\n' + RULES_CONTENT
        await fs.writeFile(agentsMd, content)
      }
    },
    uninstall: async () => {
      try {
        let content = await fs.readFile(path.join(process.cwd(), 'AGENTS.md'), 'utf-8')
        content = content.replace(/\n## make-laten Integration[\s\S]*$/, '')
        await fs.writeFile(path.join(process.cwd(), 'AGENTS.md'), content.trim() + '\n')
      } catch {}
    }
  },
  {
    name: 'windsurf',
    detected: async () => {
      try { await fs.access(path.join(process.cwd(), '.windsurf')); return true } catch {
        try { await fs.access(path.join(getHome(), '.windsurf')); return true } catch { return false }
      }
    },
    install: async () => {
      const rulesPath = path.join(process.cwd(), '.windsurfrules')
      let existing = ''
      try { existing = await fs.readFile(rulesPath, 'utf-8') } catch {}
      if (!existing.includes('make-laten')) {
        await fs.writeFile(rulesPath, existing + '\n\n' + RULES_CONTENT)
      }
    },
    uninstall: async () => {
      try {
        let content = await fs.readFile(path.join(process.cwd(), '.windsurfrules'), 'utf-8')
        content = content.replace(/\n# make-laten efficiency rules[\s\S]*$/, '')
        await fs.writeFile(path.join(process.cwd(), '.windsurfrules'), content.trim() + '\n')
      } catch {}
    }
  },
  {
    name: 'cline',
    detected: async () => {
      try { await fs.access(path.join(process.cwd(), '.clinerules')); return true } catch {
        try { await fs.access(path.join(getHome(), '.cline')); return true } catch { return false }
      }
    },
    install: async () => {
      const rulesPath = path.join(process.cwd(), '.clinerules')
      let existing = ''
      try { existing = await fs.readFile(rulesPath, 'utf-8') } catch {}
      if (!existing.includes('make-laten')) {
        await fs.writeFile(rulesPath, existing + '\n\n' + RULES_CONTENT)
      }
    },
    uninstall: async () => {
      try {
        let content = await fs.readFile(path.join(process.cwd(), '.clinerules'), 'utf-8')
        content = content.replace(/\n# make-laten efficiency rules[\s\S]*$/, '')
        await fs.writeFile(path.join(process.cwd(), '.clinerules'), content.trim() + '\n')
      } catch {}
    }
  },
  {
    name: 'copilot',
    detected: async () => {
      try { await fs.access(path.join(process.cwd(), '.github')); return true } catch { return false }
    },
    install: async () => {
      const dir = path.join(process.cwd(), '.github')
      await fs.mkdir(dir, { recursive: true })
      const instructionsPath = path.join(dir, 'copilot-instructions.md')
      let existing = ''
      try { existing = await fs.readFile(instructionsPath, 'utf-8') } catch {}
      if (!existing.includes('make-laten')) {
        await fs.writeFile(instructionsPath, existing + '\n\n## make-laten Efficiency\n' + RULES_CONTENT)
      }
    },
    uninstall: async () => {
      try {
        let content = await fs.readFile(path.join(process.cwd(), '.github', 'copilot-instructions.md'), 'utf-8')
        content = content.replace(/\n## make-laten Efficiency[\s\S]*$/, '')
        await fs.writeFile(path.join(process.cwd(), '.github', 'copilot-instructions.md'), content.trim() + '\n')
      } catch {}
    }
  },
  {
    name: 'opencode',
    detected: async () => {
      try { await fs.access(path.join(getHome(), '.config', 'opencode')); return true } catch { return false }
    },
    install: async () => {
      const skillsDir = path.join(getHome(), '.config', 'opencode', 'skills', 'make-laten')
      await fs.mkdir(skillsDir, { recursive: true })

      const npmRoot = await execAsync('npm root -g').then(r => r.stdout.trim())
      const skillSrc = path.join(npmRoot, 'make-laten', 'skills', 'SKILL.md')

      try {
        const skillContent = await fs.readFile(skillSrc, 'utf-8')
        await fs.writeFile(path.join(skillsDir, 'SKILL.md'), skillContent)
      } catch {
        await fs.writeFile(path.join(skillsDir, 'SKILL.md'), `---\nname: make-laten\ndescription: Token optimization toolkit\n---\n\n# make-laten Skill\n\nUse make-laten CLI commands for all file/code/git operations.\n`)
      }
    },
    uninstall: async () => {
      try { await fs.rm(path.join(getHome(), '.config', 'opencode', 'skills', 'make-laten'), { recursive: true, force: true }) } catch {}
    }
  }
]

export class Installer {
  async install(): Promise<{ installed: string[]; skipped: string[] }> {
    const installed: string[] = []
    const skipped: string[] = []

    for (const agent of agents) {
      try {
        const detected = await agent.detected()
        if (detected) {
          await agent.install()
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
    const removed: string[] = []

    for (const agent of agents) {
      try {
        await agent.uninstall()
        removed.push(agent.name)
      } catch {}
    }

    return { removed }
  }

  async status(): Promise<{ name: string; detected: boolean; installed: boolean }[]> {
    const result: { name: string; detected: boolean; installed: boolean }[] = []

    for (const agent of agents) {
      try {
        const detected = await agent.detected()
        result.push({ name: agent.name, detected, installed: false })
      } catch {
        result.push({ name: agent.name, detected: false, installed: false })
      }
    }

    return result
  }
}
