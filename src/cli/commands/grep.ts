import { exec } from 'child_process'
import { promisify } from 'util'
import { GrepCompressor } from '../../compress/grep.js'

const execAsync = promisify(exec)

interface GrepMatch {
  file: string
  line: number
  content: string
}

function parseGrepOutput(output: string): GrepMatch[] {
  const matches: GrepMatch[] = []
  const lines = output.split('\n').filter(Boolean)

  for (const line of lines) {
    const parts = line.split(':')
    if (parts.length >= 3) {
      matches.push({
        file: parts[0],
        line: parseInt(parts[1], 10) || 0,
        content: parts.slice(2).join(':').trim()
      })
    }
  }

  return matches
}

export async function grepCommand(pattern: string, directory: string, options: { ignore?: string }): Promise<void> {
  try {
    let cmd = `grep -rn "${pattern}" ${directory}`
    if (options.ignore) {
      cmd += ` --include="*.${options.ignore}"`
    }

    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
    const matches = parseGrepOutput(stdout)

    if (matches.length === 0) {
      console.log(JSON.stringify({ pattern, directory, matches: [], total: 0 }))
      return
    }

    const compressor = new GrepCompressor()
    const result = await compressor.compress({
      results: matches,
      pattern,
      directory
    })

    console.log(JSON.stringify({
      pattern,
      directory,
      compressed: result.content,
      confidence: result.confidence,
      total: matches.length,
      metadata: result.metadata
    }, null, 2))
  } catch (error: any) {
    if (error.code === 1) {
      console.log(JSON.stringify({ pattern, directory, matches: [], total: 0 }))
    } else {
      console.error(`Error grep:`, error.message)
      process.exit(1)
    }
  }
}
