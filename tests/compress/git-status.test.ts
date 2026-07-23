import { GitStatusCompressor } from '../../src/compress/git-status.js'

describe('GitStatusCompressor', () => {
  it('groups files by status', async () => {
    const modifiedFiles = Array.from({ length: 20 }, (_, i) => `M src/components/ui/Button${i}.tsx`)
    const addedFiles = Array.from({ length: 5 }, (_, i) => `A src/components/ui/Input${i}.tsx`)
    const deletedFiles = Array.from({ length: 3 }, (_, i) => `D src/components/ui/Modal${i}.tsx`)
    const untrackedFiles = Array.from({ length: 4 }, (_, i) => `?? src/components/ui/Dropdown${i}.tsx`)
    const status = [...modifiedFiles, ...addedFiles, ...deletedFiles, ...untrackedFiles].join('\n')
    const compressor = new GitStatusCompressor()
    const result = await compressor.compress({ status })

    expect(result.content).toContain('Modified')
    expect(result.content).toContain('Added')
    expect(result.content).toContain('Deleted')
    expect(result.content).toContain('Untracked')
  })

  it('compresses path prefixes', async () => {
    const status = `M src/components/Button.tsx\nM src/components/Input.tsx\nM src/components/Modal.tsx`
    const compressor = new GitStatusCompressor()
    const result = await compressor.compress({ status })

    expect(result.content).toContain('src/components/')
  })
})
