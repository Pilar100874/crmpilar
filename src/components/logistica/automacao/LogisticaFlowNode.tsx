import { getWorkflowBlockCardClass } from "@/components/workflow/workflowBlockStyle";
import { WorkflowBlockPreview } from "@/components/workflow/WorkflowBlockPreview";
import { LogisticaLivePreview, LOGISTICA_PREVIEW_SUPPORTED } from "./LogisticaLivePreview";
import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import { 
  Play, Pause, Gauge, MapPin, MapPinOff, Clock, 
  MessageCircle, Bell, BellRing, Mail, MessageSquareText, Copy, Trash2, StickyNote,
  MoreVertical, SkipForward, X, ArrowRight,
  AlertTriangle, CircleAlert, Truck, Package, Home, Building2,
  Fuel, Wrench, Coffee, ShoppingCart, Factory, Warehouse,
  ParkingCircle, TrafficCone, Construction, Timer, Ban,
  CircleCheck, CircleX, Flag, Star, Heart, Zap, LucideIcon,
  Minimize2, Maximize2
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


const iconMap: Record<string, any> = {
  Play,
  Pause,
  Gauge,
  MapPin,
  MapPinOff,
  Clock,
  MessageCircle,
  Bell,
  BellRing,
  Mail,
  MessageSquareText,
};

// Map for marker icons
const markerIconMap: Record<string, LucideIcon> = {
  MapPin,
  AlertTriangle,
  CircleAlert,
  Pause,
  Truck,
  Package,
  Home,
  Building2,
  Fuel,
  Wrench,
  Coffee,
  ShoppingCart,
  Factory,
  Warehouse,
  ParkingCircle,
  TrafficCone,
  Construction,
  Timer,
  Ban,
  CircleCheck,
  CircleX,
  Flag,
  Star,
  Heart,
  Zap,
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
    isCollapsed?: boolean;
    onDuplicate?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onAddNote?: (nodeId: string) => void;
    onSetBreakpoint?: (nodeId: string) => void;
    onSetSkip?: (nodeId: string) => void;
    onClearDebug?: (nodeId: string) => void;
    onToggleCollapse?: (nodeId: string) => void;
  };
}

export const LogisticaFlowNode = memo(({ id, data, selected }: LogisticaFlowNodeProps) => {
  const blockDef = LOGISTICA_BLOCKS.find(b => b.type === data.type);
  const IconComponent = blockDef ? iconMap[blockDef.icon] : Play;
  const color = blockDef?.color || '#6B7280';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isStartBlock = data.type === 'iniciar_automacao';
  const isCollapsed = data.isCollapsed ?? false;

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
          { id: 'yes', label: outputLabels[0] || 'Sim', isPrimary: true },
          { id: 'no', label: outputLabels[1] || 'Não', isPrimary: false }
        ]
      };
    }
    
    return { type: 'single', outputs: [] };
  };

  const outputsConfig = getOutputsConfig();

  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, outputsConfig.type, outputsConfig.outputs?.length, isCollapsed]);

  const getCardClassName = () =>
    getWorkflowBlockCardClass({
      selected,
      isBreakpoint: data.isBreakpoint,
      isSkipped: data.isSkipped,
      isHighlighted: data.isHighlighted,
      size: isCollapsed ? "collapsed" : "compact",
    });

  // Collapsed view
  if (isCollapsed) {
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

        <div className="p-2">
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded-md flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              <IconComponent className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-xs truncate flex-1">{blockDef?.label || data.label}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleCollapse?.(id);
              }}
              className="p-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
              title="Ampliar bloco"
            >
              <Maximize2 className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Note indicator */}
        {data.note && (
          <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow-md">
            <StickyNote className="w-3 h-3 text-yellow-900" />
          </div>
        )}

        {/* Breakpoint indicator */}
        {data.isBreakpoint && (
          <div className="absolute -top-2 -left-2 bg-orange-500 rounded-full p-1 shadow-md">
            <Pause className="w-3 h-3 text-white" />
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
        
        {/* Output Handles - Binary (Collapsed) */}
        {outputsConfig.type === 'binary' && (
          <div className="px-2 pb-2 flex gap-1 justify-center">
            {outputsConfig.outputs.map((out: any) => (
              <div 
                key={out.id}
                className={cn(
                  "relative p-1.5 rounded-md",
                  out.isPrimary ? "bg-pink-500" : "bg-primary/10 border border-primary/20"
                )}
                title={out.label}
              >
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={out.id}
                  className="!bg-white !w-3 !h-3 !relative !transform-none !border !rounded-full"
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Output Handles - Dynamic Time (Collapsed) */}
        {outputsConfig.type === 'dynamic_time' && (
          <div className="px-2 pb-2 flex gap-1 flex-wrap justify-center">
            {outputsConfig.outputs.map((out: any) => (
              <div 
                key={out.id}
                className={cn(
                  "relative p-1.5 rounded-md",
                  out.color.bg
                )}
                title={out.label}
              >
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={out.id}
                  className="!bg-white !w-3 !h-3 !relative !transform-none !border !rounded-full"
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  // Expanded view
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

          {/* Collapse button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.(id);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Encolher bloco"
          >
            <Minimize2 className="w-4 h-4 text-muted-foreground" />
          </button>
          
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
                  data.onToggleCollapse?.(id);
                  setDropdownOpen(false);
                }}
              >
                <Minimize2 className="w-4 h-4 mr-2 text-muted-foreground" />
                Encolher Bloco
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
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
          {data.type === 'acao_marcar_mapa' && (() => {
            const iconName = data.config?.icone_parada || 'MapPin';
            const MarkerIcon = markerIconMap[iconName] || MapPin;
            const iconColor = data.config?.cor_icone_parada || '#EAB308';
            return (
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: iconColor }}
                >
                  <MarkerIcon className="w-4 h-4 text-white" />
                </div>
                <span className="truncate max-w-[130px] font-medium">
                  {data.config?.legenda_parada || 'Marcar no mapa'}
                </span>
              </div>
            );
          })()}
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

        {LOGISTICA_PREVIEW_SUPPORTED.has(data.type as string) ? (
          <LogisticaLivePreview type={data.type as string} config={(data as any).config} />
        ) : (
          <WorkflowBlockPreview
            domain="logistica"
            type={data.type as string}
            config={(data as any).config}
          />
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
                "relative flex items-center justify-between gap-2 py-2.5 px-3 rounded-md group transition-colors",
                out.isPrimary 
                  ? "bg-pink-500 hover:bg-pink-600" 
                  : "bg-primary/10 border border-primary/20 hover:bg-primary/20"
              )}
            >
              <span className={cn("text-xs font-medium", out.isPrimary ? "text-white" : "text-primary")}>{out.label}</span>
              <div className="relative">
                <Handle
                  type="source"
                  position={Position.Right}
                  id={out.id}
                  className="!bg-primary !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
                  style={{ position: 'relative' }}
                />
                <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
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
                "relative flex items-center justify-between gap-2 py-2.5 px-3 rounded-md group transition-colors",
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
                  className="!bg-primary !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
                  style={{ position: 'relative' }}
                />
                <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

LogisticaFlowNode.displayName = 'LogisticaFlowNode';
