#!/usr/bin/env node

import { FileReadCompressor } from '../../compress/file-read.js'
import { GitDiffCompressor } from '../../compress/git-diff.js'
import { GitStatusCompressor } from '../../compress/git-status.js'
import { GrepCompressor } from '../../compress/grep.js'
import { ToolRouter } from '../../route/tool-router.js'
import { StrategyRouter } from '../../route/strategy-router.js'
import { PatternMiner } from '../../learn/pattern-miner.js'
import { FailureLearner } from '../../learn/failure-learner.js'
import { AutoCorrect } from '../../correct/auto-correct.js'
import { SessionCache } from '../../cache/l1-session.js'
import { WebRouter } from '../../web/router.js'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function countTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

async function benchmark() {
  const projectPath = process.cwd()

  console.log('')
  console.log('  make-laten benchmark (17 tools)')
  console.log('  ================================')
  console.log('')

  const results: { name: string; raw: number; compressed: number; savings: number }[] = []

  // === COMPRESS LAYER ===
  console.log('  Compress Layer')
  console.log('  ' + '─'.repeat(50))

  // 1. file-read (small)
  const smallFile = path.join(projectPath, 'src/index.ts')
  if (fs.existsSync(smallFile)) {
    const content = fs.readFileSync(smallFile, 'utf-8')
    const raw = countTokens(content)
    const compressor = new FileReadCompressor()
    const result = await compressor.compress({ content, filePath: 'src/index.ts' })
    const compressed = countTokens(result.content)
    results.push({ name: 'read (small)', raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
  }

  // 2. file-read (medium)
  const mediumFile = path.join(projectPath, 'src/mcp/server.ts')
  if (fs.existsSync(mediumFile)) {
    const content = fs.readFileSync(mediumFile, 'utf-8')
    const raw = countTokens(content)
    const compressor = new FileReadCompressor()
    const result = await compressor.compress({ content, filePath: 'src/mcp/server.ts' })
    const compressed = countTokens(result.content)
    results.push({ name: 'read (medium)', raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
  }

  // 3. file-read (large)
  const largeFile = path.join(projectPath, 'README.md')
  if (fs.existsSync(largeFile)) {
    const content = fs.readFileSync(largeFile, 'utf-8')
    const raw = countTokens(content)
    const compressor = new FileReadCompressor()
    const result = await compressor.compress({ content, filePath: 'README.md' })
    const compressed = countTokens(result.content)
    results.push({ name: 'read (large)', raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
  }

  // 4. grep
  try {
    const grepResult = execSync('grep -rn "export" src/ 2>/dev/null | head -30', { cwd: projectPath, encoding: 'utf-8' }).trim()
    if (grepResult) {
      const raw = countTokens(grepResult)
      const matches = grepResult.split('\n').filter(Boolean).map(line => {
        const parts = line.split(':')
        return { file: parts[0], line: parseInt(parts[1], 10) || 0, content: parts.slice(2).join(':').trim() }
      })
      const compressor = new GrepCompressor()
      const result = await compressor.compress({ results: matches, pattern: 'export', directory: 'src/' })
      const compressed = countTokens(result.content)
      results.push({ name: 'grep', raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
    }
  } catch {}

  // 5. git-diff
  try {
    const diff = execSync('git diff HEAD~1 2>/dev/null || echo ""', { cwd: projectPath, encoding: 'utf-8' }).trim()
    if (diff) {
      const raw = countTokens(diff)
      const compressor = new GitDiffCompressor()
      const result = await compressor.compress({ diff })
      const compressed = countTokens(result.content)
      results.push({ name: 'git-diff', raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
    }
  } catch {}

  // 6. git-status
  try {
    const status = execSync('git status --porcelain 2>/dev/null || echo ""', { cwd: projectPath, encoding: 'utf-8' }).trim()
    if (status) {
      const raw = countTokens(status)
      const compressor = new GitStatusCompressor()
      const result = await compressor.compress({ status })
      const compressed = countTokens(result.content)
      results.push({ name: 'git-status', raw, compressed, savings: Math.round((1 - compressed / raw) * 100) })
    }
  } catch {}

  console.log('')

  // === ROUTE LAYER ===
  console.log('  Route Layer')
  console.log('  ' + '─'.repeat(50))

  const router = new ToolRouter()
  const strategyRouter = new StrategyRouter()

  const routeTests = [
    { type: 'file' as const, content: 'test' },
    { type: 'grep' as const, content: 'test' },
    { type: 'git-diff' as const, content: 'test' }
  ]

  for (const test of routeTests) {
    const route = router.route(test)
    console.log(`    route(${test.type}) → ${route.compressor || 'none'} (${Math.round(route.confidence * 100)}%)`)
  }

  const strategies = [
    { fileSize: 100, pref: undefined },
    { fileSize: 1000, pref: undefined },
    { fileSize: 10000, pref: undefined },
    { fileSize: 0, pref: 'aggressive' as const }
  ]

  for (const s of strategies) {
    const strategy = strategyRouter.select({ fileSize: s.fileSize, userPreference: s.pref })
    console.log(`    strategy(${s.fileSize || s.pref}) → ${strategy.strategy} (savings: ${Math.round(strategy.savings * 100)}%)`)
  }

  console.log('')

  // === CACHE LAYER ===
  console.log('  Cache Layer')
  console.log('  ' + '─'.repeat(50))

  const cache = new SessionCache()
  cache.set('test:key1', { content: 'value1', metadata: {} })
  cache.set('test:key2', { content: 'value2', metadata: {} })
  cache.get('test:key1')
  cache.get('test:key1')
  cache.get('test:key2')
  cache.get('test:miss')

  const cacheStats = cache.stats()
  console.log(`    L1 Session: ${cacheStats.size} entries, ${cacheStats.hits} hits, ${cacheStats.misses} misses, ${Math.round(cacheStats.hitRate * 100)}% hit rate`)

  console.log('')

  // === LEARN LAYER ===
  console.log('  Learn Layer')
  console.log('  ' + '─'.repeat(50))

  const miner = new PatternMiner()
  miner.record({ type: 'file-read', input: { file: 'a.ts' }, success: true })
  miner.record({ type: 'file-read', input: { file: 'b.ts' }, success: true })
  miner.record({ type: 'grep', input: { pattern: 'test' }, success: true })
  miner.record({ type: 'git-diff', input: {}, success: true })

  const learner = new FailureLearner()
  learner.record({ type: 'file-read', error: 'File not found', success: false })
  learner.record({ type: 'grep', error: 'Permission denied', success: false })

  const patterns = miner.getPatterns()
  const failures = learner.getFailures()

  console.log(`    Patterns: ${patterns.length} learned`)
  for (const p of patterns.slice(0, 3)) {
    console.log(`      - ${p.type}: confidence ${Math.round(p.confidence * 100)}%, count ${p.count}`)
  }

  console.log(`    Failures: ${failures.length} recorded`)
  for (const f of failures.slice(0, 3)) {
    const suggestions = learner.getSuggestions(f.type)
    console.log(`      - ${f.type}: ${f.error} → ${suggestions[0] || 'none'}`)
  }

  console.log('')

  // === CORRECT LAYER ===
  console.log('  Correct Layer')
  console.log('  ' + '─'.repeat(50))

  const correct = new AutoCorrect()
  correct.addRule({ name: 'typo', description: 'Fix common typo', pattern: 'teh', replacement: 'the' })
  correct.addRule({ name: 'typo2', description: 'Fix common typo', pattern: 'adn', replacement: 'and' })

  const testText = 'teh quick brown fox adn teh cat'
  const corrected = correct.correct(testText)
  const correctStats = correct.getStats()

  console.log(`    Input:  "${testText}"`)
  console.log(`    Output: "${corrected}"`)
  console.log(`    Corrections applied: ${correctStats.applied}`)

  console.log('')

  // === WEB LAYER ===
  console.log('  Web Layer')
  console.log('  ' + '─'.repeat(50))

  const webRouter = new WebRouter()
  const webStats = webRouter.getCacheStats()
  console.log(`    Cache: ${webStats.fetchSize} fetch, ${webStats.searchSize} search`)
  console.log(`    Backends: duckduckgo (default)`)
  console.log(`    Features: semantic extraction, compression, caching`)

  console.log('')

  // === SUMMARY ===
  console.log('  Summary')
  console.log('  ' + '─'.repeat(50))

  const totalRaw = results.reduce((s, r) => s + r.raw, 0)
  const totalCompressed = results.reduce((s, r) => s + r.compressed, 0)
  const savings = Math.round((1 - totalCompressed / totalRaw) * 100)

  console.log('  Command'.padEnd(20) + 'Raw'.padEnd(10) + 'Compressed'.padEnd(12) + 'Savings')
  console.log('  ' + '─'.repeat(50))
  for (const r of results) {
    console.log(`  ${r.name}`.padEnd(20) + `${r.raw}`.padEnd(10) + `${r.compressed}`.padEnd(12) + `${r.savings}%`)
  }

  console.log('  ' + '─'.repeat(50))
  console.log(`  ${'Total'.padEnd(20)}${totalRaw}`.padEnd(10) + `${totalCompressed}`.padEnd(12) + `${savings}%`)

  console.log('')
  console.log(`  17 tools exposed via MCP`)
  console.log(`  4 layers: compress, route, cache, learn`)
  console.log('')
}

benchmark()
