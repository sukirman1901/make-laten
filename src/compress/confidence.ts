export function calculateConfidence(original: string, compressed: string): number {
  if (!original.length) return 0

  let score = 1.0

  // Penalize if too much dropped
  const ratio = compressed.length / original.length
  if (ratio < 0.01) score -= 0.5
  else if (ratio < 0.05) score -= 0.3

  // Penalize if code blocks were modified
  if (codeBlocksModified(original, compressed)) score -= 0.4

  // Bonus for known patterns
  if (isKnownPattern(original)) score += 0.1

  return Math.max(0, Math.min(1, score))
}

function codeBlocksModified(original: string, compressed: string): boolean {
  const codeBlockRegex = /```[\s\S]*?```/g
  const originalBlocks = original.match(codeBlockRegex) || []
  const compressedBlocks = compressed.match(codeBlockRegex) || []

  if (originalBlocks.length !== compressedBlocks.length) return true

  for (let i = 0; i < originalBlocks.length; i++) {
    if (originalBlocks[i] !== compressedBlocks[i]) return true
  }

  return false
}

function isKnownPattern(content: string): boolean {
  const patterns = [
    /export\s+(default\s+)?(function|class|const|let|var)/,
    /import\s+.*from\s+['"]/
  ]
  return patterns.some(p => p.test(content))
}
