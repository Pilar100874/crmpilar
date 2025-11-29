import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Play, Pause, Gauge, MapPin, MapPinOff, Clock, 
  MessageCircle, Bell, Mail, Copy, Trash2, StickyNote,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOGISTICA_BLOCKS, LogisticaBlockType } from '@/types/automacaoLogistica';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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
    onDuplicate?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onAddNote?: (nodeId: string) => void;
  };
}

export const LogisticaFlowNode = memo(({ id, data, selected }: LogisticaFlowNodeProps) => {
  const blockDef = LOGISTICA_BLOCKS.find(b => b.type === data.type);
  const IconComponent = blockDef ? iconMap[blockDef.icon] : Play;
  const color = blockDef?.color || '#6B7280';
  const outputs = blockDef?.outputs || 1;
  const outputLabels = blockDef?.outputLabels || [];

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 bg-card shadow-md min-w-[180px] transition-all',
        selected ? 'ring-2 ring-primary ring-offset-2' : ''
      )}
      style={{ borderColor: color }}
    >
      {/* Input Handle */}
      {data.type !== 'iniciar_automacao' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      {/* Header */}
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-t-md"
        style={{ backgroundColor: `${color}20` }}
      >
        <div 
          className="p-1.5 rounded-md"
          style={{ backgroundColor: color }}
        >
          <IconComponent className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-sm flex-1">{data.label}</span>
        
        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => data.onDuplicate?.(id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => data.onAddNote?.(id)}>
              <StickyNote className="h-4 w-4 mr-2" />
              {data.note ? 'Editar Nota' : 'Adicionar Nota'}
            </DropdownMenuItem>
            {data.type !== 'iniciar_automacao' && (
              <DropdownMenuItem 
                onClick={() => data.onDelete?.(id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body - show config preview */}
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {data.type === 'condicao_parado' && data.config?.tempo_minutos && (
          <span>Parado por mais de {data.config.tempo_minutos} min</span>
        )}
        {data.type === 'condicao_velocidade' && data.config?.velocidade_km && (
          <span>
            Velocidade {data.config.operador_velocidade === 'maior' ? '>' : '<'} {data.config.velocidade_km} km/h
          </span>
        )}
        {data.type === 'condicao_chegada' && data.config?.endereco && (
          <span className="truncate block max-w-[160px]">{data.config.endereco}</span>
        )}
        {data.type === 'acao_whatsapp' && data.config?.telefone && (
          <span>Para: {data.config.telefone}</span>
        )}
        {data.type === 'iniciar_automacao' && (
          <span>Início do fluxo</span>
        )}
      </div>

      {/* Note indicator */}
      {data.note && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1">
          <StickyNote className="w-3 h-3 text-yellow-900" />
        </div>
      )}

      {/* Output Handles */}
      {outputs === 1 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}
      {outputs === 2 && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-[30%]"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !left-[70%]"
          />
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between px-4 text-[10px] text-muted-foreground">
            <span className="text-green-600">{outputLabels[0] || 'Sim'}</span>
            <span className="text-red-600">{outputLabels[1] || 'Não'}</span>
          </div>
        </>
      )}
    </div>
  );
});

LogisticaFlowNode.displayName = 'LogisticaFlowNode';
