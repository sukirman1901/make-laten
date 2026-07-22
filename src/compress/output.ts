export interface CompressOptions {
  maxLength?: number
  removeWhitespace?: boolean
  prettyPrint?: boolean
}

export class OutputCompressor {
  static compress(input: string, options: CompressOptions = {}): string {
    const { maxLength = 1000, removeWhitespace = false, prettyPrint = false } = options

    let output = input

    if (removeWhitespace) {
      output = output.replace(/\s+/g, ' ').trim()
    }

    try {
      const parsed = JSON.parse(output)
      if (prettyPrint) {
        output = JSON.stringify(parsed, null, 2)
      } else {
        output = JSON.stringify(parsed)
      }
    } catch {
      // Not JSON, keep as-is
    }

    if (output.length > maxLength) {
      const suffix = '...[truncated]'
      output = output.substring(0, maxLength - suffix.length) + suffix
    }

    return output
  }
}