import { describe, it, expect } from 'vitest'
import { FileReadCompressor } from '../../src/compress/file-read.js'

describe('FileReadCompressor', () => {
  const compressor = new FileReadCompressor()

  it('should compress TypeScript file signatures', async () => {
    const input = {
      content: `
export function processPayment(amount: number): boolean {
  if (amount <= 0) return false
  // complex logic here
  return true
}

export function validateCard(card: string): boolean {
  return card.length === 16
}

class PaymentError extends Error {
  constructor(message: string) {
    super(message)
  }
}
      `.trim(),
      filePath: 'src/payment.ts',
      language: 'typescript'
    }

    const result = await compressor.compress(input)
    
    expect(result.confidence).toBeGreaterThan(0.7)
    expect(result.content).toContain('processPayment')
    expect(result.content).toContain('validateCard')
    expect(result.content).toContain('PaymentError')
    expect(result.content.length).toBeLessThan(input.content.length)
  })

  it('should return high confidence for good compression', async () => {
    const input = {
      content: 'export const x = 1\nexport const y = 2',
      filePath: 'src/constants.ts',
      language: 'typescript'
    }

    const result = await compressor.compress(input)
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  })
})
