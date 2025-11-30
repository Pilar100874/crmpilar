import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { ADS_BLOCK_DEFINITIONS, AdsFlowNodeData } from "@/types/adsFlow";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { MoreVertical, Pause, SkipForward, Copy, Trash2, StickyNote, X } from "lucide-react";

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

  const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;

  const getCategoryColor = () => {
    switch (blockDef.category) {
      case 'trigger': return { bg: 'from-orange-500/10 to-amber-500/10', border: 'border-orange-500/30', icon: 'text-orange-600' };
      case 'condition': return { bg: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/30', icon: 'text-violet-600' };
      case 'action': return { bg: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/30', icon: 'text-green-600' };
      default: return { bg: 'from-slate-500/10 to-gray-500/10', border: 'border-slate-500/30', icon: 'text-slate-600' };
    }
  };

  const colors = getCategoryColor();

  const getCardClassName = () => {
    const baseClass = "min-w-[220px] max-w-[280px] transition-all duration-200 shadow-lg";
    
    if (data.isBreakpoint) {
      return `${baseClass} bg-gradient-to-br ${colors.bg} border-2 border-orange-500 ${selected ? "ring-2 ring-primary" : ""}`;
    }
    
    if (data.isSkipped) {
      return `${baseClass} bg-gradient-to-br from-slate-100 to-slate-50 border-2 border-slate-400 opacity-60 ${selected ? "ring-2 ring-primary" : ""}`;
    }
    
    return `${baseClass} bg-gradient-to-br ${colors.bg} border ${colors.border} ${selected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"}`;
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
      case 'condition_platform':
        return config.platforms?.join(', ') || 'Todas';
      case 'condition_campaign':
        return config.nameContains || 'Qualquer';
      case 'action_budget_decrease':
        return `-${config.percentage || 20}%`;
      case 'action_budget_increase':
        return `+${config.percentage || 20}%`;
      case 'action_notify':
        return config.message?.substring(0, 20) || 'Configurar';
      default:
        return null;
    }
  };

  const configPreview = getConfigPreview();

  return (
    <>
      <Card className={getCardClassName()}>
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!bg-primary !w-3 !h-3 !border-2 !border-white" 
        />
        
        <div className="p-3">
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {IconComponent && (
                  <div className={`p-1.5 rounded-lg bg-white/80 border ${colors.border}`}>
                    <IconComponent className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                )}
                <span className="font-semibold text-sm text-foreground truncate">{blockDef.label}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{blockDef.description}</p>
            </div>
            
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-white/50 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
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
                  <SkipForward className="w-4 h-4 mr-2 text-slate-500" />
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
                  <X className="w-4 h-4 mr-2 text-red-500" />
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

          {configPreview && (
            <div className="mt-2 px-2 py-1 bg-white/60 rounded text-xs text-muted-foreground border border-white/80">
              {configPreview}
            </div>
          )}

          {data.note && (
            <div className="mt-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <StickyNote className="w-3 h-3 inline mr-1" />
              {data.note.length > 50 ? data.note.substring(0, 50) + '...' : data.note}
            </div>
          )}

          {/* Debug indicators */}
          <div className="flex gap-1 mt-2">
            {data.isBreakpoint && (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">
                BREAKPOINT
              </span>
            )}
            {data.isSkipped && (
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                SKIP
              </span>
            )}
          </div>
        </div>

        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="!bg-primary !w-3 !h-3 !border-2 !border-white" 
        />
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
