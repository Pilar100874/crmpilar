import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Play, Pause, Gauge, MapPin, MapPinOff, Clock, 
  MessageCircle, Bell, Mail, Copy, Trash2, StickyNote,
  MoreVertical, SkipForward, X, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOGISTICA_BLOCKS, LogisticaBlockType, CondicaoTempoParado } from '@/types/automacaoLogistica';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const iconMap: Record<string, any> = {
  Play,
  Pause,
  Gauge,
  MapPin,
  MapPinOff,
  Clock,
  MessageCircle,
  Bell,
  Mail,
};

// Cores para as saídas dinâmicas de tempo
const TIME_OUTPUT_COLORS = [
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', border: 'border-yellow-700', text: 'text-yellow-700' },
  { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', border: 'border-orange-700', text: 'text-orange-700' },
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', border: 'border-red-700', text: 'text-red-700' },
  { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', border: 'border-purple-700', text: 'text-purple-700' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', border: 'border-blue-700', text: 'text-blue-700' },
  { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', border: 'border-cyan-700', text: 'text-cyan-700' },
];

interface LogisticaFlowNodeProps extends NodeProps {
  data: {
    label: string;
    type: LogisticaBlockType;
    config: any;
    note?: string;
    isBreakpoint?: boolean;
    isSkipped?: boolean;
    isHighlighted?: boolean;
    onDuplicate?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onAddNote?: (nodeId: string) => void;
    onSetBreakpoint?: (nodeId: string) => void;
    onSetSkip?: (nodeId: string) => void;
    onClearDebug?: (nodeId: string) => void;
  };
}

export const LogisticaFlowNode = memo(({ id, data, selected }: LogisticaFlowNodeProps) => {
  const blockDef = LOGISTICA_BLOCKS.find(b => b.type === data.type);
  const IconComponent = blockDef ? iconMap[blockDef.icon] : Play;
  const color = blockDef?.color || '#6B7280';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isStartBlock = data.type === 'iniciar_automacao';

  // Get dynamic outputs for condicao_parado
  const getOutputsConfig = () => {
    if (data.type === 'condicao_parado') {
      const condicoesTempo: CondicaoTempoParado[] = data.config?.condicoes_tempo || 
        (data.config?.tempo_minutos ? [{ tempo_minutos: data.config.tempo_minutos }] : [{ tempo_minutos: 30 }]);
      
      // Sort by time ascending
      const sortedCondicoes = [...condicoesTempo].sort((a, b) => a.tempo_minutos - b.tempo_minutos);
      
      return {
        type: 'dynamic_time',
        outputs: sortedCondicoes.map((c, i) => ({
          id: `tempo_${c.tempo_minutos}`,
          label: c.label || `${c.tempo_minutos} min`,
          tempo: c.tempo_minutos,
          color: TIME_OUTPUT_COLORS[i % TIME_OUTPUT_COLORS.length]
        }))
      };
    }
    
    // Default outputs
    const outputs = blockDef?.outputs || 1;
    const outputLabels = blockDef?.outputLabels || [];
    
    if (outputs === 2) {
      return {
        type: 'binary',
        outputs: [
          { id: 'yes', label: outputLabels[0] || 'Sim', color: { bg: 'bg-green-500', hover: 'hover:bg-green-600', border: 'border-green-700', text: 'text-green-700' } },
          { id: 'no', label: outputLabels[1] || 'Não', color: { bg: 'bg-red-500', hover: 'hover:bg-red-600', border: 'border-red-700', text: 'text-red-700' } }
        ]
      };
    }
    
    return { type: 'single', outputs: [] };
  };

  const outputsConfig = getOutputsConfig();

  const getCardClassName = () => {
    const baseClass = "min-w-[220px] max-w-[280px] transition-all duration-200 shadow-lg";
    
    if (data.isHighlighted) {
      return `${baseClass} bg-card border-2 border-yellow-500 ring-2 ring-yellow-400 animate-pulse`;
    }
    
    if (data.isBreakpoint) {
      return `${baseClass} bg-card border-2 border-orange-500 ${
        selected ? "ring-2 ring-primary" : ""
      }`;
    }
    
    if (data.isSkipped) {
      return `${baseClass} bg-card/60 border-2 border-muted-foreground opacity-60 ${
        selected ? "ring-2 ring-primary" : ""
      }`;
    }
    
    return `${baseClass} bg-card border-2 ${
      selected 
        ? "ring-2 ring-primary border-primary" 
        : "border-border hover:border-muted-foreground"
    }`;
  };

  return (
    <Card className={getCardClassName()} style={{ borderColor: selected ? undefined : color }}>
      {/* Input Handle */}
      {!isStartBlock && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !bg-primary !border-2 !border-background"
        />
      )}

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <Checkbox className="mt-0.5 h-4 w-4 border-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="p-1.5 rounded-md"
                style={{ backgroundColor: color }}
              >
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm truncate">{blockDef?.label || data.label}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{blockDef?.description}</p>
          </div>
          
          {/* Menu */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-muted rounded transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  data.onSetBreakpoint?.(id);
                  setDropdownOpen(false);
                }}
              >
                <Pause className="w-4 h-4 mr-2 text-orange-500" />
                {data.isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  data.onSetSkip?.(id);
                  setDropdownOpen(false);
                }}
              >
                <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
                {data.isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  data.onDuplicate?.(id);
                  setDropdownOpen(false);
                }}
              >
                <Copy className="w-4 h-4 mr-2 text-primary" />
                Duplicar Bloco
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  data.onAddNote?.(id);
                  setDropdownOpen(false);
                }}
              >
                <StickyNote className="w-4 h-4 mr-2 text-yellow-500" />
                {data.note ? "Editar Nota" : "Adicionar Nota"}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={() => {
                  data.onClearDebug?.(id);
                  setDropdownOpen(false);
                }}
                disabled={!data.isBreakpoint && !data.isSkipped}
              >
                <X className="w-4 h-4 mr-2 text-destructive" />
                Liberar Bloco
              </DropdownMenuItem>
              
              {!isStartBlock && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      data.onDelete?.(id);
                      setDropdownOpen(false);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Bloco
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Config preview */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
          {data.type === 'condicao_parado' && outputsConfig.type === 'dynamic_time' && (
            <div className="space-y-0.5">
              <span className="font-medium">Condições de tempo:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {outputsConfig.outputs.map((out: any, i: number) => (
                  <span 
                    key={out.id}
                    className={cn("px-1.5 py-0.5 rounded text-white text-[10px]", out.color.bg)}
                  >
                    {out.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.type === 'condicao_velocidade' && data.config?.velocidade_km && (
            <span>
              Velocidade {data.config.operador_velocidade === 'maior' ? '>' : '<'} {data.config.velocidade_km} km/h
            </span>
          )}
          {data.type === 'condicao_chegada' && data.config?.endereco && (
            <span className="truncate block">{data.config.endereco}</span>
          )}
          {data.type === 'condicao_chegada' && !data.config?.endereco && (
            <span className="text-muted-foreground/70">Raio: {data.config?.raio_metros || 100}m</span>
          )}
          {data.type === 'acao_whatsapp' && data.config?.telefone && (
            <span>Para: {data.config.telefone}</span>
          )}
          {data.type === 'acao_whatsapp' && !data.config?.telefone && (
            <span className="text-muted-foreground/70">Configurar destinatário...</span>
          )}
          {data.type === 'iniciar_automacao' && (
            <span>Início do fluxo</span>
          )}
          {data.type === 'condicao_horario' && (
            <span>{data.config?.horario_inicio || '08:00'} - {data.config?.horario_fim || '18:00'}</span>
          )}
          {data.type === 'acao_notificacao' && (
            <span>{data.config?.titulo_notificacao || 'Configurar título...'}</span>
          )}
          {data.type === 'acao_email' && (
            <span>{data.config?.email_destino || 'Configurar e-mail...'}</span>
          )}
          {data.type === 'condicao_saida_area' && (
            <span>{data.config?.area_nome || 'Configurar área...'}</span>
          )}
          {data.type === 'acao_marcar_mapa' && (
            <div className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: data.config?.cor_icone_parada || '#EAB308' }}
              />
              <span className="truncate max-w-[140px]">
                {data.config?.legenda_parada || 'Marcar no mapa'}
              </span>
            </div>
          )}
        </div>

        {/* Breakpoint/Skip indicators */}
        {data.isBreakpoint && (
          <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
            <Pause className="w-3 h-3" />
            <span>Pausar aqui</span>
          </div>
        )}
        {data.isSkipped && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <SkipForward className="w-3 h-3" />
            <span>Bloco será pulado</span>
          </div>
        )}
      </div>

      {/* Note indicator */}
      {data.note && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow-md">
          <StickyNote className="w-3 h-3 text-yellow-900" />
        </div>
      )}

      {/* Output Handles - Single Output */}
      {outputsConfig.type === 'single' && (
        <div className="relative flex justify-center pb-2">
          <div className="relative flex items-center justify-center">
            <Handle
              type="source"
              position={Position.Bottom}
              className="!w-5 !h-5 !bg-primary !border-2 !border-background !rounded-full !relative !bottom-0"
              style={{ position: 'relative' }}
            />
            <ArrowRight className="w-3 h-3 text-white absolute pointer-events-none rotate-90" />
          </div>
        </div>
      )}
      
      {/* Output Handles - Binary (Yes/No) */}
      {outputsConfig.type === 'binary' && (
        <div className="px-3 pb-3 space-y-1.5">
          {outputsConfig.outputs.map((out: any) => (
            <div 
              key={out.id}
              className={cn(
                "relative flex items-center justify-between gap-2 py-2 px-3 rounded-md group transition-colors",
                out.color.bg,
                out.color.hover
              )}
            >
              <span className="text-xs font-medium text-white">{out.label}</span>
              <div className="relative">
                <Handle
                  type="source"
                  position={Position.Right}
                  id={out.id}
                  className={cn(
                    "!bg-white !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !rounded-full group-hover:!scale-110 !transition-transform",
                    `!${out.color.border}`
                  )}
                  style={{ position: 'relative' }}
                />
                <ArrowRight className={cn("w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none", out.color.text)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Output Handles - Dynamic Time Conditions */}
      {outputsConfig.type === 'dynamic_time' && (
        <div className="px-3 pb-3 space-y-1.5">
          {outputsConfig.outputs.map((out: any) => (
            <div 
              key={out.id}
              className={cn(
                "relative flex items-center justify-between gap-2 py-2 px-3 rounded-md group transition-colors",
                out.color.bg,
                out.color.hover
              )}
            >
              <span className="text-xs font-medium text-white">≥ {out.label}</span>
              <div className="relative">
                <Handle
                  type="source"
                  position={Position.Right}
                  id={out.id}
                  className={cn(
                    "!bg-white !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !rounded-full group-hover:!scale-110 !transition-transform",
                    `!${out.color.border}`
                  )}
                  style={{ position: 'relative' }}
                />
                <ArrowRight className={cn("w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none", out.color.text)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

LogisticaFlowNode.displayName = 'LogisticaFlowNode';
