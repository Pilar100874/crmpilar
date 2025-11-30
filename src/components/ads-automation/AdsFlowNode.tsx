import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { ADS_BLOCK_DEFINITIONS, AdsBlockType, AdsFlowNodeData } from "@/types/adsFlow";
import { 
  MoreVertical, Pause, SkipForward, Copy, Trash2, StickyNote, X, ArrowRight,
  TrendingDown, DollarSign, MousePointerClick, Percent, Target, Eye, Clock,
  Repeat, Star, AlertTriangle, ArrowUpDown, Layers, Megaphone, BarChart3,
  Calendar, PiggyBank, Smartphone, MapPin, Play, TrendingUp, Bell, Webhook,
  Mail, Archive, Power, CalendarClock, MessageSquare, FileText, LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const iconMap: Record<string, LucideIcon> = {
  TrendingDown,
  DollarSign,
  MousePointerClick,
  Percent,
  Target,
  Eye,
  Clock,
  Repeat,
  Star,
  AlertTriangle,
  ArrowUpDown,
  Layers,
  Megaphone,
  BarChart3,
  Calendar,
  PiggyBank,
  Smartphone,
  MapPin,
  Pause,
  Play,
  TrendingUp,
  Bell,
  Webhook,
  Mail,
  Copy,
  Archive,
  Power,
  CalendarClock,
  MessageSquare,
  FileText,
};

interface AdsFlowNodeProps {
  id: string;
  data: AdsFlowNodeData & {
    onSetBreakpoint?: (nodeId: string) => void;
    onSetSkip?: (nodeId: string) => void;
    onDuplicate?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onClearDebug?: (nodeId: string) => void;
    onAddNote?: (nodeId: string) => void;
  };
  selected?: boolean;
}

export const AdsFlowNode = memo(({ id, data, selected }: AdsFlowNodeProps) => {
  const blockDef = ADS_BLOCK_DEFINITIONS.find((b) => b.type === data.type);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!blockDef) return null;

  const IconComponent = iconMap[blockDef.icon] || Target;
  const color = blockDef.color;

  // Get outputs configuration
  const getOutputsConfig = () => {
    const outputs = blockDef.outputs || 1;
    const outputLabels = blockDef.outputLabels || [];
    
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
    
    if (data.isBreakpoint) {
      return `${baseClass} bg-card border-2 border-orange-500 ${selected ? "ring-2 ring-primary" : ""}`;
    }
    
    if (data.isSkipped) {
      return `${baseClass} bg-card/60 border-2 border-muted-foreground opacity-60 ${selected ? "ring-2 ring-primary" : ""}`;
    }
    
    return `${baseClass} bg-card border-2 ${
      selected 
        ? "ring-2 ring-primary border-primary" 
        : "border-border hover:border-muted-foreground"
    }`;
  };

  const getConfigPreview = () => {
    const config = data.config || {};
    switch (data.type) {
      case 'trigger_roas':
        return `ROAS < ${config.threshold || 1}`;
      case 'trigger_spend':
        return `Gasto > R$ ${config.threshold || 1000}`;
      case 'trigger_cpc':
        return `CPC > R$ ${config.threshold || 5}`;
      case 'trigger_ctr':
        return `CTR < ${config.threshold || 1}%`;
      case 'trigger_conversions':
        return `${config.hours || 24}h sem conversões`;
      case 'trigger_schedule':
        return config.cron || 'Não configurado';
      case 'trigger_frequency':
        return `Frequência > ${config.threshold || 3}`;
      case 'trigger_quality_score':
        return `Score < ${config.threshold || 5}`;
      case 'trigger_budget_depleted':
        return `< ${config.percentageRemaining || 20}% restante`;
      case 'trigger_position':
        return `Posição > ${config.threshold || 4}`;
      case 'condition_platform':
        return config.platforms?.length ? config.platforms.join(', ') : 'Todas';
      case 'condition_campaign':
        return config.nameContains || 'Qualquer';
      case 'condition_time':
        return `${config.startHour || 9}h - ${config.endHour || 18}h`;
      case 'condition_day_of_week':
        return config.days?.length ? `${config.days.length} dias` : 'Todos';
      case 'condition_budget_remaining':
        return `${config.operator || '<'} ${config.percentage || 50}%`;
      case 'condition_device':
        return config.devices?.length ? config.devices.join(', ') : 'Todos';
      case 'condition_location':
        return config.locations?.length ? `${config.locations.length} regiões` : 'Todas';
      case 'action_budget_decrease':
        return `-${config.percentage || 20}%`;
      case 'action_budget_increase':
        return `+${config.percentage || 20}%`;
      case 'action_notify':
        return config.message?.substring(0, 20) || 'Configurar...';
      case 'action_webhook':
        return config.url?.substring(0, 25) || 'Configurar URL...';
      case 'action_email':
        return config.to || 'Configurar email...';
      case 'action_slack':
        return config.webhookUrl ? 'Configurado' : 'Configurar...';
      case 'action_bid_adjust':
        return `${config.adjustment > 0 ? '+' : ''}${config.adjustment || 0}%`;
      case 'action_bid_device':
        return 'Ajustes por dispositivo';
      case 'action_schedule_change':
        return config.action === 'pause' ? 'Agendar pausa' : 'Agendar ativação';
      case 'action_create_report':
        return `Relatório ${config.period || '7d'}`;
      default:
        return null;
    }
  };

  const configPreview = getConfigPreview();

  return (
    <>
      <Card className={getCardClassName()} style={{ borderColor: selected ? undefined : color }}>
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !bg-primary !border-2 !border-background"
        />

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
                <span className="font-semibold text-sm truncate">{blockDef.label}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{blockDef.description}</p>
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
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={() => {
                    setDeleteDialogOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Bloco
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Config preview */}
          {configPreview && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
              {configPreview}
            </div>
          )}

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
            {outputsConfig.outputs.map((out) => (
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
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Bloco</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o bloco "{blockDef.label}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                data.onDelete?.(id);
                setDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

AdsFlowNode.displayName = 'AdsFlowNode';
