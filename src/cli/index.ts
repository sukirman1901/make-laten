#!/usr/bin/env node

import { Command } from 'commander'
import { readCommand } from './commands/read.js'
import { grepCommand } from './commands/grep.js'
import { gitDiffCommand, gitStatusCommand } from './commands/git.js'
import { cacheStatsCommand, cacheClearCommand } from './commands/cache.js'
import { searchCommand, fetchCommand } from './commands/web.js'
import { installCommand } from './commands/install.js'
import { initCommand } from './commands/init.js'

const program = new Command()

program
  .name('make-laten')
  .description('Universal efficiency toolkit for AI coding agents')
  .version('1.0.3')

program
  .command('read')
  .description('Compressed file read')
  .argument('<file>', 'File path')
  .action(readCommand)

program
  .command('grep')
  .description('Compressed grep with file grouping')
  .argument('<pattern>', 'Search pattern')
  .argument('[directory]', 'Directory to search', '.')
  .option('-i, --ignore <ext>', 'File extension to ignore')
  .action(grepCommand)

const gitCmd = program
  .command('git')
  .description('Git operations')

gitCmd
  .command('diff')
  .description('Compressed git diff')
  .option('-s, --staged', 'Show staged changes')
  .action(gitDiffCommand)

gitCmd
  .command('status')
  .description('Git status summary')
  .action(gitStatusCommand)

const cacheCmd = program
  .command('cache')
  .description('Cache management')

cacheCmd
  .command('stats')
  .description('Show cache statistics')
  .action(cacheStatsCommand)

cacheCmd
  .command('clear')
  .description('Clear cache')
  .action(cacheClearCommand)

program
  .command('search')
  .description('Search the web')
  .argument('<query>', 'Search query')
  .option('-b, --backend <backend>', 'Search backend')
  .option('-m, --max <n>', 'Max results', '5')
  .action(searchCommand)

program
  .command('fetch')
  .description('Fetch and compress web content')
  .argument('<url>', 'URL to fetch')
  .option('--no-compress', 'Disable compression')
  .option('--no-extract', 'Disable semantic extraction')
  .action(fetchCommand)

program
  .command('install')
  .description('Install make-laten across all detected platforms')
  .option('-u, --uninstall', 'Remove adapters')
  .option('-s, --status', 'Show installation status')
  .action(installCommand)

program
  .command('init')
  .description('Interactive setup wizard — detect agents & configure MCP')
  .option('-a, --all', 'Configure all detected agents (no prompts)')
  .option('-p, --project', 'Create .mcp.json in current directory only')
  .action(initCommand)

program.parse()
