import { Command } from 'commander'
import { StatsCollector } from '../../stats/collector.js'
import path from 'path'
import os from 'os'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

export const statsCommand = new Command('stats')
  .description('Show usage statistics')
  .action(async () => {
    const statsPath = path.join(os.homedir(), '.make-laten', 'stats.json')
    const data = await StatsCollector.load(statsPath)
    const s = data.summary

    console.log('\n⚡ make-laten Stats\n')
    console.log(`  Total Requests:    ${s.totalRequests}`)
    console.log(`  Input Tokens:      ${formatTokens(s.totalInputTokens)}`)
    console.log(`  Output Tokens:     ${formatTokens(s.totalOutputTokens)}`)
    console.log(`  Cached Tokens:     ${formatTokens(s.totalCachedTokens)}`)
    console.log(`  Estimated Cost:    ~$${s.estimatedCost.toFixed(2)}`)
    console.log(`  Avg Compression:   ${(s.avgCompression * 100).toFixed(0)}%`)
    console.log('\n  Tool Usage:')
    for (const [tool, count] of Object.entries(s.toolUsage)) {
      console.log(`    ${tool}: ${count}`)
    }
    console.log('')
  })
