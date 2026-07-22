#!/usr/bin/env node

import { Command } from 'commander'
import { readCommand } from './commands/read.js'

const program = new Command()

program
  .name('make-laten')
  .description('Universal efficiency skill for AI coding agents')
  .version('0.1.0')

program
  .command('read')
  .description('Compressed file read')
  .argument('<file>', 'File path')
  .action(readCommand)

program.parse()
