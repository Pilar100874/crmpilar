import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Play, Pause, Gauge, MapPin, MapPinOff, Clock, 
  MessageCircle, Bell, Mail, Copy, Trash2, StickyNote,
  MoreVertical, SkipForward, X, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOGISTICA_BLOCKS, LogisticaBlockType } from '@/types/automacaoLogistica';
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
  const outputs = blockDef?.outputs || 1;
  const outputLabels = blockDef?.outputLabels || [];
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isStartBlock = data.type === 'iniciar_automacao';

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
          {data.type === 'condicao_parado' && data.config?.tempo_minutos && (
            <span>Parado por mais de {data.config.tempo_minutos} min</span>
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
          {data.type === 'condicao_parado' && data.config?.marcar_no_mapa && (
            <div className="flex items-center gap-1 mt-1">
              <div className={`w-3 h-3 rounded-full ${
                data.config?.icone_parada === '10_20' ? 'bg-yellow-500' :
                data.config?.icone_parada === '21_30' ? 'bg-orange-500' :
                data.config?.icone_parada === 'mais_30' ? 'bg-red-600' : 'bg-gray-400'
              }`} />
              <span className="text-[10px]">Marcar no mapa</span>
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

      {/* Output Handles */}
      {outputs === 1 && (
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
      
      {outputs === 2 && (
        <div className="px-3 pb-3 space-y-1.5">
          {/* Yes output */}
          <div className="relative flex items-center justify-between gap-2 py-2 px-3 bg-green-500 rounded-md group hover:bg-green-600 transition-colors">
            <span className="text-xs font-medium text-white">{outputLabels[0] || 'Sim'}</span>
            <div className="relative">
              <Handle
                type="source"
                position={Position.Right}
                id="yes"
                className="!bg-white !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-green-700 !rounded-full group-hover:!scale-110 !transition-transform"
                style={{ position: 'relative' }}
              />
              <ArrowRight className="w-3 h-3 text-green-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          
          {/* No output */}
          <div className="relative flex items-center justify-between gap-2 py-2 px-3 bg-red-500 rounded-md group hover:bg-red-600 transition-colors">
            <span className="text-xs font-medium text-white">{outputLabels[1] || 'Não'}</span>
            <div className="relative">
              <Handle
                type="source"
                position={Position.Right}
                id="no"
                className="!bg-white !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-red-700 !rounded-full group-hover:!scale-110 !transition-transform"
                style={{ position: 'relative' }}
              />
              <ArrowRight className="w-3 h-3 text-red-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});

LogisticaFlowNode.displayName = 'LogisticaFlowNode';
