import { exec } from 'child_process'
import { promisify } from 'util'
import { GitDiffCompressor } from '../../compress/git-diff.js'

const execAsync = promisify(exec)

export async function gitDiffCommand(options: { staged?: boolean }): Promise<void> {
  try {
    const flag = options.staged ? '--staged' : ''
    const { stdout } = await execAsync(`git diff ${flag}`, { maxBuffer: 10 * 1024 * 1024 })

    if (!stdout.trim()) {
      console.log(JSON.stringify({ diff: '', changes: 0 }))
      return
    }

    const compressor = new GitDiffCompressor()
    const result = await compressor.compress({ diff: stdout })

    console.log(JSON.stringify({
      compressed: result.content,
      confidence: result.confidence,
      metadata: result.metadata
    }, null, 2))
  } catch (error: any) {
    console.error(`Error git diff:`, error.message)
    process.exit(1)
  }
}

export async function gitStatusCommand(): Promise<void> {
  try {
    const { stdout } = await execAsync('git status --porcelain')
    const lines = stdout.split('\n').filter(Boolean)

    const files = lines.map(line => ({
      status: line[0],
      path: line.slice(3)
    }))

    console.log(JSON.stringify({
      total: files.length,
      files
    }, null, 2))
  } catch (error: any) {
    console.error(`Error git status:`, error.message)
    process.exit(1)
  }
}
