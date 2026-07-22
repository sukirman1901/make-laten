import { Installer } from '../../adapter/installer.js'

export async function installCommand(options: { uninstall?: boolean; status?: boolean }): Promise<void> {
  const installer = new Installer()

  if (options.status) {
    console.log('Detecting platforms...\n')
    const status = await installer.status()

    for (const s of status) {
      const icon = s.detected ? '✓' : '○'
      const label = s.detected ? 'detected' : 'not found'
      console.log(`  ${icon} ${s.name} (${label})`)
    }
    return
  }

  if (options.uninstall) {
    console.log('Uninstalling make-laten from all platforms...\n')
    const { removed } = await installer.uninstall()

    if (removed.length === 0) {
      console.log('Nothing to uninstall.')
      return
    }

    for (const name of removed) {
      console.log(`  ✓ removed from ${name}`)
    }
    console.log(`\nDone! Removed from ${removed.length} platform(s).`)
    return
  }

  console.log('Installing make-laten across all platforms...\n')
  const { installed, skipped } = await installer.install()

  for (const name of installed) {
    console.log(`  ✓ ${name}`)
  }

  for (const name of skipped) {
    console.log(`  ○ ${name} (not detected)`)
  }

  console.log(`\nDone! Configured for ${installed.length} platform(s).`)
  console.log('\nAvailable commands (terminal):')
  console.log('  mread <file>      compressed file read')
  console.log('  mgrep <pattern>   grouped grep results')
  console.log('  mdiff             compressed git diff')
  console.log('  mstatus           git status summary')
  console.log('  msearch <query>   web search')
  console.log('  mfetch <url>      web fetch + compress')
}
