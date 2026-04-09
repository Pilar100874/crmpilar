import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, X, Bot, MessageSquare, Send } from 'lucide-react';
import { type FerramentaConfig, type TabType } from '@/hooks/useFerramentasAtendimento';
import { type ChatAgent } from '@/hooks/useChatAgents';

// Cores para ícones de ferramentas por tipo
const TOOL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'tool-image': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  'tool-file': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  'tool-variables': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  'tool-quick-replies': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  'tool-quick-attachments': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  'tool-orcamento': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  'tool-catalog': { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  'tool-bot': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  'tool-webhook': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'tool-transfer': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  'tool-reports': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  'tool-agenda-tracking': { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
  'tool-translate': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  'tool-realtime-translate': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-200' },
  'tool-stock': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
};

const IA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'tool-context': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  'tool-summary': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  'tool-kb': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

function getToolColor(ferramentaId: string, tipo: string) {
  if (tipo === 'ia') return IA_COLORS[ferramentaId] || DEFAULT_COLOR;
  return TOOL_COLORS[ferramentaId] || DEFAULT_COLOR;
}

interface ToolsDropdownProps {
  ferramentas: FerramentaConfig[];
  onSelectTool: (ferramentaId: string) => void;
  tabType: TabType;
  insideDialog?: boolean;
  chatAgents?: ChatAgent[];
  onSelectAgent?: (agent: ChatAgent, mode: 'cliente' | 'privado') => void;
}

export function ToolsDropdown({ ferramentas, onSelectTool, tabType, insideDialog = false, chatAgents = [], onSelectAgent }: ToolsDropdownProps) {
  const [open, setOpen] = useState(false);

  const toolsFerramentas = ferramentas.filter(f => f.tipo === 'ferramenta');
  const iaFerramentas = ferramentas.filter(f => f.tipo === 'ia');
  // Only show agents linked to an active orchestrator
  const activeAgents = (() => {
    const orchs = chatAgents.filter(a => (a as any).tipo_agente === 'orquestrador' && a.ativo);
    const linked = new Set<string>();
    const collect = (id: string, v = new Set<string>()) => {
      if (v.has(id)) return; v.add(id); linked.add(id);
      const ag = chatAgents.find(a => a.id === id);
      if (ag) ((ag as any).sub_agent_ids || []).forEach((s: string) => collect(s, v));
    };
    orchs.forEach(o => collect(o.id));
    return chatAgents.filter(a => a.ativo && linked.has(a.id));
  })();

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
                <p className="text-xs font-semibold text-muted-foreground px-1">🛠️ Ferramentas</p>
                <div className="grid grid-cols-2 gap-2">
                  {toolsFerramentas.map(ferramenta => {
                    const Icon = ferramenta.IconComponent;
                    const colors = getToolColor(ferramenta.ferramenta_id, ferramenta.tipo);
                    return (
                      <button
                        key={ferramenta.id}
                        onClick={() => {
                          setOpen(false);
                          setTimeout(() => onSelectTool(ferramenta.ferramenta_id), 150);
                        }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border ${colors.border} ${colors.bg} hover:brightness-95 transition-all cursor-pointer text-center`}
                        data-macro-id={`tool-${ferramenta.ferramenta_id}`}
                      >
                        <div className={`h-9 w-9 rounded-full ${colors.bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <span className={`text-xs font-medium leading-tight ${colors.text}`}>{ferramenta.nome}</span>
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
                <p className="text-xs font-semibold text-muted-foreground px-1">🤖 Inteligência Artificial</p>
                <div className="grid grid-cols-2 gap-2">
                  {iaFerramentas.map(ferramenta => {
                    const Icon = ferramenta.IconComponent;
                    const colors = getToolColor(ferramenta.ferramenta_id, ferramenta.tipo);
                    return (
                      <button
                        key={ferramenta.id}
                        onClick={() => {
                          setOpen(false);
                          setTimeout(() => onSelectTool(ferramenta.ferramenta_id), 150);
                        }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border ${colors.border} ${colors.bg} hover:brightness-95 transition-all cursor-pointer text-center`}
                        data-macro-id={`tool-${ferramenta.ferramenta_id}`}
                      >
                        <div className={`h-9 w-9 rounded-full ${colors.bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <span className={`text-xs font-medium leading-tight ${colors.text}`}>{ferramenta.nome}</span>
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
                  <p className="text-xs font-semibold text-muted-foreground px-1">💬 Agentes de IA</p>
                  <div className="space-y-2">
                    {activeAgents.map(agent => {
                      const agentColor = agent.cor || '#6366f1';
                      return (
                        <div
                          key={agent.id}
                          className="rounded-lg border p-3 space-y-2"
                          style={{ borderColor: agentColor + '40', backgroundColor: agentColor + '08' }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-9 w-9 rounded-full flex items-center justify-center text-lg"
                              style={{ backgroundColor: agentColor + '20' }}
                            >
                              {agent.icone}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium leading-tight truncate" style={{ color: agentColor }}>{agent.nome}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{agent.descricao || 'Agente de IA'}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setOpen(false);
                                setTimeout(() => onSelectAgent?.(agent, 'privado'), 150);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium text-white transition-colors"
                              style={{ backgroundColor: agentColor }}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Conversar
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
