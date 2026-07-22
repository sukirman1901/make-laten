import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function countTokens(text: string): number {
  return Math.round(text.length / 4)
}

function compressFileRead(content: string, maxTokens = 2000): string {
  const lines = content.split('\n')
  const totalTokens = countTokens(content)

  if (totalTokens <= maxTokens) return content

  const maxLines = Math.round(maxTokens / (totalTokens / lines.length))
  const half = Math.floor(maxLines / 2)
  const head = lines.slice(0, half)
  const tail = lines.slice(-half)
  return [...head, `... [${lines.length - maxLines} lines omitted] ...`, ...tail].join('\n')
}

function compressGitDiff(diff: string): string {
  return diff.split('\n')
    .filter(l => l.startsWith('diff') || l.startsWith('@@') || l.startsWith('+') || l.startsWith('-'))
    .filter(l => !l.startsWith('---') && !l.startsWith('+++'))
    .join('\n')
}

async function benchmark() {
  const projectPath = process.cwd()

  console.log('')
  console.log('  make-laten benchmark')
  console.log('  ===================')
  console.log('')

  const results: { name: string; raw: number; compressed: number; savings: number }[] = []

  // 1. file-read
  const testFiles = ['src/index.ts', 'package.json', 'README.md', 'src/mcp/server.ts']
  for (const file of testFiles) {
    const full = path.join(projectPath, file)
    if (!fs.existsSync(full)) continue

    const content = fs.readFileSync(full, 'utf-8')
    const raw = countTokens(content)
    const compressed = compressFileRead(content)
    const compressedTokens = countTokens(compressed)
    results.push({ name: `read ${file}`, raw, compressed: compressedTokens, savings: Math.round((1 - compressedTokens / raw) * 100) })
  }

  // 2. git-diff
  try {
    const diff = execSync('git diff --stat HEAD~1 2>/dev/null || echo ""', { cwd: projectPath, encoding: 'utf-8' }).trim()
    if (diff) {
      const raw = countTokens(diff)
      const compressed = compressGitDiff(diff)
      const compressedTokens = countTokens(compressed)
      results.push({ name: 'git-diff (stats only)', raw, compressed: compressedTokens, savings: Math.round((1 - compressedTokens / raw) * 100) })
    }
  } catch {}

  // 3. grep
  const srcIndex = path.join(projectPath, 'src/index.ts')
  if (fs.existsSync(srcIndex)) {
    const content = fs.readFileSync(srcIndex, 'utf-8')
    const raw = countTokens(content)
    const matches = content.split('\n').filter(l => l.includes('export'))
    const compressed = matches.join('\n')
    const compressedTokens = countTokens(compressed)
    results.push({ name: 'grep "export"', raw, compressed: compressedTokens, savings: Math.round((1 - compressedTokens / raw) * 100) })
  }

  // 4. full file vs compressed
  const indexFile = path.join(projectPath, 'src/index.ts')
  if (fs.existsSync(indexFile)) {
    const content = fs.readFileSync(indexFile, 'utf-8')
    const raw = countTokens(content)
    const compressed = compressFileRead(content, 500)
    const compressedTokens = countTokens(compressed)
    results.push({ name: 'src/index.ts (500 tok)', raw, compressed: compressedTokens, savings: Math.round((1 - compressedTokens / raw) * 100) })
  }

  // Print
  console.log('  Command'.padEnd(28) + 'Raw'.padEnd(10) + 'Compressed'.padEnd(12) + 'Savings')
  console.log('  ' + '─'.repeat(60))
  for (const r of results) {
    console.log(`  ${r.name}`.padEnd(28) + `${r.raw}`.padEnd(10) + `${r.compressed}`.padEnd(12) + `${r.savings}%`)
  }

  const totalRaw = results.reduce((s, r) => s + r.raw, 0)
  const totalCompressed = results.reduce((s, r) => s + r.compressed, 0)
  const savings = Math.round((1 - totalCompressed / totalRaw) * 100)

  console.log('')
  console.log(`  Total: ${totalRaw} → ${totalCompressed} tokens (${savings}% saved)`)
  console.log('')
}

benchmark()
