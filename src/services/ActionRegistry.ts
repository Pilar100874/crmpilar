// Registro de ações chamáveis por macros

type ActionHandler = (params?: Record<string, unknown>) => Promise<void> | void;

class ActionRegistryClass {
  private actions: Map<string, ActionHandler> = new Map();

  register(name: string, handler: ActionHandler): void {
    this.actions.set(name, handler);
  }

  unregister(name: string): void {
    this.actions.delete(name);
  }

  async execute(name: string, params?: Record<string, unknown>): Promise<void> {
    const handler = this.actions.get(name);
    if (!handler) {
      throw new Error(`Ação "${name}" não registrada`);
    }
    await handler(params);
  }

  getAll(): string[] {
    return Array.from(this.actions.keys());
  }

  has(name: string): boolean {
    return this.actions.has(name);
  }
}

export const ActionRegistry = new ActionRegistryClass();

// Registrar algumas ações padrão de exemplo
ActionRegistry.register('toast.success', (params) => {
  const { toast } = require('sonner');
  toast.success(params?.message || 'Sucesso!');
});

ActionRegistry.register('toast.error', (params) => {
  const { toast } = require('sonner');
  toast.error(params?.message || 'Erro!');
});

ActionRegistry.register('console.log', (params) => {
  console.log('[Macro Action]', params);
});
