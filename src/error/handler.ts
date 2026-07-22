interface ErrorResult {
  handled: boolean
  category: string
  suggestions: string[]
}

interface ErrorStats {
  total: number
  byCategory: Record<string, number>
}

export class ErrorHandler {
  private errors: Error[] = []

  handle(error: Error): ErrorResult {
    this.errors.push(error)

    const category = this.categorize(error)
    const suggestions = this.getSuggestions(error)

    return {
      handled: true,
      category,
      suggestions
    }
  }

  getStats(): ErrorStats {
    const byCategory: Record<string, number> = {}
    for (const error of this.errors) {
      const cat = this.categorize(error)
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }
    return { total: this.errors.length, byCategory }
  }

  private categorize(error: Error): string {
    if (error.message.includes('not found')) return 'not-found'
    if (error.message.includes('permission')) return 'permission'
    if (error.message.includes('timeout')) return 'timeout'
    return 'unknown'
  }

  private getSuggestions(error: Error): string[] {
    const suggestions: string[] = []
    if (error.message.includes('not found')) {
      suggestions.push('check if file or resource exists')
    }
    if (error.message.includes('permission')) {
      suggestions.push('verify access permissions')
    }
    if (error.message.includes('timeout')) {
      suggestions.push('increase timeout or retry')
    }
    return suggestions
  }
}