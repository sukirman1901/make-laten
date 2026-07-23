import { Command } from 'commander'
import { DashboardServer } from '../../dashboard/server.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dashboardCommand = new Command('dashboard')
  .description('Start dashboard in browser')
  .option('-p, --port <port>', 'Port number', '3456')
  .option('--no-open', 'Don\'t auto-open browser')
  .action(async (options) => {
    const port = parseInt(options.port, 10)
    const server = new DashboardServer({ port })

    const actualPort = await server.start()
    console.log(`⚡ Dashboard running at http://localhost:${actualPort}`)

    if (options.open) {
      const url = `http://localhost:${actualPort}`
      try {
        await execAsync(`open ${url}`)
      } catch {
        try {
          await execAsync(`xdg-open ${url}`)
        } catch {
          console.log(`Open ${url} in your browser`)
        }
      }
    }

    console.log('Press Ctrl+C to stop')
    process.on('SIGINT', () => {
      server.stop()
      process.exit(0)
    })
  })
