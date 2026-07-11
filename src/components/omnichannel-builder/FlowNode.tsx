import { getWorkflowBlockCardClass } from "@/components/workflow/workflowBlockStyle";
import { WorkflowBlockPreview } from "@/components/workflow/WorkflowBlockPreview";
import { OmnichannelLivePreview, OMNICHANNEL_PREVIEW_SUPPORTED } from "./OmnichannelLivePreview";
import { memo, useState, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import {
  Users, 
  User, 
  Award, 
  GitBranch,
  Clock,
  Webhook,
  Timer,
  BarChart3,
  MessageSquare,
  MoreVertical,
  Pause,
  SkipForward,
  Copy,
  Trash2,
  X,
  ArrowRight,
  StickyNote,
  HelpCircle,
  Reply,
  Bell,
  MessageSquareText,
} from "lucide-react";
import { BlockHelpDialog } from "@/components/workflow-help/BlockHelpDialog";
import { getBlockHelp } from "@/components/workflow-help/blockHelpRegistry";
import { Card } from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
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
import type { OmnichannelBlockType } from "@/types/omnichannelFlow";

interface FlowNodeProps {
  id: string;
  data: {
    type: OmnichannelBlockType;
    label: string;
    config: any;
    isSkipped?: boolean;
    isHighlighted?: boolean;
    isBreakpoint?: boolean;
    note?: string;
    onSetBreakpoint?: (nodeId: string) => void;
    onSetSkip?: (nodeId: string) => void;
    onDuplicate?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onClearDebug?: (nodeId: string) => void;
    onAddNote?: (nodeId: string) => void;
  };
  selected?: boolean;
}

const nodeIcons: Record<OmnichannelBlockType, any> = {
  inicio: GitBranch,
  fila: Users,
  atendente: User,
  skill: Award,
  regra_roteamento: GitBranch,
  horario: Clock,
  webhook: Webhook,
  aguardar: Timer,
  analytics: BarChart3,
  return_response: Reply,
  disparar_push: Bell,
  enviar_sms: MessageSquareText,
};

// Blocos que têm múltiplas saídas
const multipleOutputNodes: OmnichannelBlockType[] = [
  "regra_roteamento",
  "horario",
  "skill",
  "webhook"
];

export const FlowNode = memo(({ id, data, selected }: FlowNodeProps) => {
  const { type, label, isSkipped, isHighlighted, isBreakpoint } = data;
  const hasNote = !!(data.note || data.config?.nota);
  const hasMultipleOutputs = multipleOutputNodes.includes(type);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const isStartBlock = type === 'inicio';
  
  const IconComponent = nodeIcons[type];

  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, type, hasMultipleOutputs]);

  const getCardClassName = () =>
    getWorkflowBlockCardClass({ selected, isBreakpoint, isSkipped, isHighlighted, size: "default" });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card className={getCardClassName()}>
            {type !== "inicio" && (
              <Handle
                type="target"
                position={Position.Top}
                className="!bg-primary !w-3 !h-3 !border-2 !border-white"
              />
            )}

            <div className="p-3">
              {/* Cabeçalho com ícone, título e menu */}
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {IconComponent && (
                      <div className="p-1 rounded bg-primary/5 border border-primary/20">
                        <IconComponent className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <span className="font-semibold text-sm text-foreground truncate">
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {type.replace(/_/g, ' ')}
                  </p>
                </div>
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-muted rounded transition-colors">
                      <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-white border-border shadow-lg">
                    <DropdownMenuItem
                      onClick={() => { setHelpOpen(true); setDropdownOpen(false); }}
                      className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 mr-2 text-primary" />
                      Ajuda e exemplos
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        data.onSetBreakpoint?.(id);
                        setDropdownOpen(false);
                      }}
                      className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                    >
                      <Pause className="w-4 h-4 mr-2 text-orange-500" />
                      {isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      onClick={() => {
                        data.onSetSkip?.(id);
                        setDropdownOpen(false);
                      }}
                      className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
                      {isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      onClick={() => {
                        data.onDuplicate?.(id);
                        setDropdownOpen(false);
                      }}
                      className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                    >
                      <Copy className="w-4 h-4 mr-2 text-primary" />
                      Duplicar Bloco
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        data.onAddNote?.(id);
                        setDropdownOpen(false);
                      }}
                      className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                    >
                      <StickyNote className="w-4 h-4 mr-2 text-yellow-500" />
                      {hasNote ? "Editar Nota" : "Adicionar Nota"}
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-muted" />
                    
                    <DropdownMenuItem
                      onClick={() => {
                        data.onClearDebug?.(id);
                        setDropdownOpen(false);
                      }}
                      disabled={!isBreakpoint && !isSkipped}
                      className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4 mr-2 text-red-500" />
                      Liberar Bloco
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-muted" />
                    
                    {!isStartBlock && (
                      <DropdownMenuItem
                        onClick={() => {
                          setDeleteDialogOpen(true);
                          setDropdownOpen(false);
                        }}
                        className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Bloco
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {hasNote && (
                <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground whitespace-pre-wrap">
                  📝 {data.note || data.config?.nota}
                </div>
              )}

              {OMNICHANNEL_PREVIEW_SUPPORTED.has(type) ? (
                <OmnichannelLivePreview type={type} config={data.config} />
              ) : (
                <WorkflowBlockPreview domain="omnichannel" type={type} config={data.config} />
              )}
            </div>

            {/* Handles de saída */}
            {hasMultipleOutputs ? (
              <>
                {/* Saída "Sim/Sucesso/Dentro" - esquerda */}
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id="yes"
                  className="!bg-green-500 !w-3 !h-3"
                  style={{ left: '35%' }}
                />
                <div 
                  className="absolute bottom-0 left-[35%] -translate-x-1/2 translate-y-full mt-1 text-[10px] font-medium text-green-600 dark:text-green-400"
                >
                  {type === "webhook" ? "Sucesso" : 
                   type === "horario" ? "Dentro" :
                   type === "skill" ? "Tem" : "Sim"}
                </div>

                {/* Saída "Não/Erro/Fora" - direita */}
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id="no"
                  className="!bg-red-500 !w-3 !h-3"
                  style={{ left: '65%' }}
                />
                <div 
                  className="absolute bottom-0 left-[65%] -translate-x-1/2 translate-y-full mt-1 text-[10px] font-medium text-red-600 dark:text-red-400"
                >
                  {type === "webhook" ? "Erro" : 
                   type === "horario" ? "Fora" :
                   type === "skill" ? "Não tem" : "Não"}
                </div>
              </>
            ) : (
              <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-primary !w-3 !h-3"
              />
            )}
          </Card>
        </ContextMenuTrigger>

        {/* Menu de contexto (botão direito) */}
        <ContextMenuContent className="w-56 bg-white border-border shadow-lg">
          <ContextMenuItem
            onClick={() => data.onSetBreakpoint?.(id)}
            className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
          >
            <Pause className="w-4 h-4 mr-2 text-orange-500" />
            {isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
          </ContextMenuItem>
          
          <ContextMenuItem
            onClick={() => data.onSetSkip?.(id)}
            className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
          >
            <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
            {isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
          </ContextMenuItem>
          
          <ContextMenuItem
            onClick={() => data.onDuplicate?.(id)}
            className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
          >
            <Copy className="w-4 h-4 mr-2 text-primary" />
            Duplicar Bloco
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => data.onAddNote?.(id)}
            className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 mr-2 text-amber-500" />
            {hasNote ? "Editar Nota" : "Adicionar Nota"}
          </ContextMenuItem>
          
          <ContextMenuSeparator className="bg-muted" />
          
          <ContextMenuItem
            onClick={() => data.onClearDebug?.(id)}
            disabled={!isBreakpoint && !isSkipped}
            className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 mr-2 text-red-500" />
            Liberar Bloco
          </ContextMenuItem>
          
          <ContextMenuSeparator className="bg-muted" />
          
          {!isStartBlock && (
            <ContextMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Bloco
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este bloco? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                data.onDelete?.(id);
                setDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BlockHelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        content={{
          label: String(label || type),
          description: String(type).replace(/_/g, ' '),
          ...getBlockHelp("omnichannel", type, String(label || type), String(type).replace(/_/g, ' ')),
        }}
      />
    </>
  );
});

FlowNode.displayName = "FlowNode";
