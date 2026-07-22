export interface SemanticToolConfig {
  intent: string
  inputTypes: string[]
  outputType: string
}

export class SemanticTool {
  public readonly name: string
  public readonly intent: string
  private inputTypes: Set<string>
  public readonly outputType: string

  constructor(name: string, config: SemanticToolConfig) {
    this.name = name
    this.intent = config.intent
    this.inputTypes = new Set(config.inputTypes)
    this.outputType = config.outputType
  }

  supportsInput(inputType: string): boolean {
    return this.inputTypes.has(inputType)
  }

  describe(): string {
    return `${this.name}: ${this.intent} (${Array.from(this.inputTypes).join(', ')} → ${this.outputType})`
  }
}
