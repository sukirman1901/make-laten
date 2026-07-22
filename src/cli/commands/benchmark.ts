#!/usr/bin/env node

import { FileReadCompressor } from '../../compress/file-read.js'
import { GitDiffCompressor } from '../../compress/git-diff.js'
import { GitStatusCompressor } from '../../compress/git-status.js'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

async function benchmark() {
  const fileCompressor = new FileReadCompressor()
  const diffCompressor = new GitDiffCompressor()
  const statusCompressor = new GitStatusCompressor()
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
    const raw = Math.round(content.length / 4)
    const result = await fileCompressor.compress({ content, filePath: file })
    const compressed = Math.round(result.content.length / 4)
    results.push({ name: `read ${file}`, raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
  }

  // 2. git-diff
  try {
    const diff = execSync('git diff HEAD~1 2>/dev/null || echo ""', { cwd: projectPath, encoding: 'utf-8' }).trim()
    if (diff) {
      const raw = Math.round(diff.length / 4)
      const result = await diffCompressor.compress({ diff })
      const compressed = Math.round(result.content.length / 4)
      results.push({ name: 'git-diff', raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
    }
  } catch {}

  // 3. git-status
  try {
    const status = execSync('git status --porcelain 2>/dev/null || echo ""', { cwd: projectPath, encoding: 'utf-8' }).trim()
    if (status) {
      const raw = Math.round(status.length / 4)
      const result = await statusCompressor.compress({ status })
      const compressed = Math.round(result.content.length / 4)
      results.push({ name: 'git-status', raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
    }
  } catch {}

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
