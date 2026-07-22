import fs from 'fs/promises'
import { FileReadCompressor } from '../../compress/file-read.js'

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown'
  }
  return langMap[ext] || 'text'
}

export async function readCommand(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const compressor = new FileReadCompressor()
    
    const result = await compressor.compress({
      content,
      filePath,
      language: detectLanguage(filePath)
    })

    console.log(JSON.stringify({
      file: filePath,
      compressed: result.content,
      confidence: result.confidence,
      metadata: result.metadata
    }, null, 2))
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    process.exit(1)
  }
}
