import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, X, Bot } from 'lucide-react';
import { type FerramentaConfig, type TabType } from '@/hooks/useFerramentasAtendimento';
import { type ChatAgent } from '@/hooks/useChatAgents';

interface ToolsDropdownProps {
  ferramentas: FerramentaConfig[];
  onSelectTool: (ferramentaId: string) => void;
  tabType: TabType;
  insideDialog?: boolean;
  chatAgents?: ChatAgent[];
  onSelectAgent?: (agent: ChatAgent) => void;
}

export function ToolsDropdown({ ferramentas, onSelectTool, tabType, insideDialog = false, chatAgents = [], onSelectAgent }: ToolsDropdownProps) {
  const [open, setOpen] = useState(false);

  const toolsFerramentas = ferramentas.filter(f => f.tipo === 'ferramenta');
  const iaFerramentas = ferramentas.filter(f => f.tipo === 'ia');
  const activeAgents = chatAgents.filter(a => a.ativo);

  if (ferramentas.length === 0 && activeAgents.length === 0) {
    return null;
  }

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        data-macro-id="tools-dropdown-trigger"
        onClick={() => setOpen(true)}
      >
        <Wrench className="h-4 w-4" />
        <span>Ferramentas</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm mx-auto max-h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-semibold">Ferramentas</DialogTitle>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {toolsFerramentas.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground px-1">Ferramentas</p>
                <div className="grid grid-cols-2 gap-2">
                  {toolsFerramentas.map(ferramenta => {
                    const Icon = ferramenta.IconComponent;
                    return (
                      <button
                        key={ferramenta.id}
                        onClick={() => {
                          setOpen(false);
                          setTimeout(() => onSelectTool(ferramenta.ferramenta_id), 150);
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-center"
                        data-macro-id={`tool-${ferramenta.ferramenta_id}`}
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium leading-tight">{ferramenta.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {toolsFerramentas.length > 0 && iaFerramentas.length > 0 && (
              <div className="border-t border-border" />
            )}

            {iaFerramentas.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground px-1">Inteligência Artificial</p>
                <div className="grid grid-cols-2 gap-2">
                  {iaFerramentas.map(ferramenta => {
                    const Icon = ferramenta.IconComponent;
                    return (
                      <button
                        key={ferramenta.id}
                        onClick={() => {
                          setOpen(false);
                          setTimeout(() => onSelectTool(ferramenta.ferramenta_id), 150);
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-center"
                        data-macro-id={`tool-${ferramenta.ferramenta_id}`}
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium leading-tight">{ferramenta.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeAgents.length > 0 && (
              <>
                {(toolsFerramentas.length > 0 || iaFerramentas.length > 0) && (
                  <div className="border-t border-border" />
                )}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground px-1">Agentes de IA</p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeAgents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setOpen(false);
                          setTimeout(() => onSelectAgent?.(agent), 150);
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-center"
                        data-macro-id={`agent-${agent.id}`}
                      >
                        <span className="text-xl">{agent.icone}</span>
                        <span className="text-xs font-medium leading-tight">{agent.nome}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {agent.modo_operacao === 'automatico' ? '⚡ Auto' : '✨ Sugestão'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
