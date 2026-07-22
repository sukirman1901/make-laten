import { Installer } from '../../adapter/installer.js'

export async function installCommand(options: { uninstall?: boolean; status?: boolean }): Promise<void> {
  const installer = new Installer()

  if (options.status) {
    console.log('Detecting installed agents...\n')
    const agents = await installer.status()

    if (agents.length === 0) {
      console.log('No supported agents detected.')
      return
    }

    for (const agent of agents) {
      const status = agent.detected ? '✓ installed' : '○ detected'
      console.log(`  ${status}  ${agent.name} (${agent.type})${agent.version ? ` v${agent.version}` : ''}`)
    }
    return
  }

  if (options.uninstall) {
    console.log('Uninstalling make-laten adapters...\n')
    const { removed } = await installer.uninstall()

    if (removed.length === 0) {
      console.log('Nothing to uninstall.')
      return
    }

    for (const name of removed) {
      console.log(`  ✓ removed from ${name}`)
    }
    return
  }

  console.log('Installing make-laten adapters...\n')
  const { installed, skipped } = await installer.install()

  if (installed.length === 0 && skipped.length === 0) {
    console.log('No supported agents detected.')
    console.log('make-laten CLI works standalone — use commands directly:')
    console.log('  make-laten read <file>')
    console.log('  make-laten grep <pattern>')
    console.log('  make-laten git diff')
    return
  }

  for (const name of installed) {
    console.log(`  ✓ ${name} configured`)
  }

  for (const name of skipped) {
    console.log(`  ○ ${name} skipped (already configured or unavailable)`)
  }

  console.log(`\nDone! Configured for ${installed.length} agent(s).`)
}
