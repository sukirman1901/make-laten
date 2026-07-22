export interface Tool {
  name: string
  description: string
  execute: (input: any) => Promise<any>
}

export class ToolRegistry {
  private tools = new Map<string, Tool>()

  register(name: string, tool: Tool): void {
    this.tools.set(name, tool)
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  list(): Tool[] {
    return Array.from(this.tools.values())
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  unregister(name: string): boolean {
    return this.tools.delete(name)
  }
}