import type { Plugin, PluginContext } from './types.js'

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map()

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin)
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }

  has(name: string): boolean {
    return this.plugins.has(name)
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  async initializeAll(ctx: PluginContext): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.initialize(ctx)
    }
  }

  async destroyAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) {
        await plugin.destroy()
      }
    }
  }
}
