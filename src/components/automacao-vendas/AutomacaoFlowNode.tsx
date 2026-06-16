import { getWorkflowBlockCardClass } from "@/components/workflow/workflowBlockStyle";
import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { AUTOMACAO_VENDAS_BLOCKS } from "@/types/automacaoVendas";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import * as Icons from "lucide-react";
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
import { MoreVertical, Copy, Trash2, StickyNote, HelpCircle, Pause, SkipForward, X } from "lucide-react";
import { BlockHelpDialog } from "@/components/workflow-help/BlockHelpDialog";
import { getBlockHelp } from "@/components/workflow-help/blockHelpRegistry";

export const AutomacaoFlowNode = memo(({ data, selected, id }: NodeProps) => {
  const blockDef = AUTOMACAO_VENDAS_BLOCKS.find((b) => b.type === (data as any).type);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const isStartBlock = (data as any).type === 'iniciar_validacao';
  
  if (!blockDef) return null;

  const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
  const description = String(blockDef.description || (data as any).type);
  const label = String((data as any).label || blockDef.label || "");
  const note = (data as any).note;

  const isBreakpoint = (data as any).isBreakpoint;
  const isSkipped = (data as any).isSkipped;

  const getCardClassName = () =>
    getWorkflowBlockCardClass({ selected, isBreakpoint, isSkipped, size: "default" });

  return (
    <>
      <Card className={getCardClassName()}>
        {/* Handle de entrada: ocultar no bloco inicial */}
        {!isStartBlock && (
          <Handle 
            type="target" 
            position={Position.Top} 
            className="!bg-primary !w-3 !h-3 !border-2 !border-white" 
          />
        )}
        
        <div className="p-3">
          {/* Cabeçalho com checkbox, ícone, título e menu */}
          <div className="flex items-start gap-2 mb-3">
            <Checkbox className="mt-0.5 h-4 w-4 border-border" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {IconComponent && (
                  <div className="p-1 rounded bg-primary/5 border border-primary/20">
                    <IconComponent className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <span className="font-semibold text-sm text-foreground truncate">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            </div>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-muted rounded transition-colors">
                  <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card dark:bg-card border-border shadow-lg">
                <DropdownMenuItem
                  onClick={() => { setHelpOpen(true); setDropdownOpen(false); }}
                  className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 mr-2 text-primary" />
                  Ajuda e exemplos
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { (data as any).onSetBreakpoint?.(id); setDropdownOpen(false); }}
                  className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  <Pause className="w-4 h-4 mr-2 text-orange-500" />
                  {isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => { (data as any).onSetSkip?.(id); setDropdownOpen(false); }}
                  className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
                  {isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    (data as any).onDuplicate?.(id);
                    setDropdownOpen(false);
                  }}
                  className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  <Copy className="w-4 h-4 mr-2 text-primary" />
                  Duplicar Bloco
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    (data as any).onAddNote?.(id);
                    setDropdownOpen(false);
                  }}
                  className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  <StickyNote className="w-4 h-4 mr-2 text-yellow-500" />
                  {note ? "Editar Nota" : "Adicionar Nota"}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-muted" />

                <DropdownMenuItem
                  onClick={() => { (data as any).onClearDebug?.(id); setDropdownOpen(false); }}
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

        {/* Nota (se houver) */}
        {note && (
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground whitespace-pre-wrap">
            📝 {String(note)}
          </div>
        )}

        {/* Mostrar condições para condicao_se */}
        {(data as any).type === "condicao_se" && (data as any).config?.condicoes && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-xs font-medium text-foreground/70 mb-1">
              Lógica: {(data as any).config.logica || "E"}
            </div>
            <div className="space-y-1">
              {((data as any).config.condicoes || []).map((condicao: any, index: number) => (
                <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {condicao.campo} {condicao.operador} {condicao.valor}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mostrar faixas para valida_faixa_faturamento */}
        {(data as any).type === "valida_faixa_faturamento" && (data as any).config?.faixas && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-xs font-medium text-foreground/70 mb-1">Faixas de Valor:</div>
            <div className="space-y-1">
              {((data as any).config.faixas || []).map((faixa: any, index: number) => {
                const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: color }}
                    ></span>
                    {faixa.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {/* Handle inferior - renderizar múltiplas saídas para valida_faixa_faturamento */}
        {(data as any).type === "valida_faixa_faturamento" ? (
          <>
            {((data as any).config?.faixas || []).map((faixa: any, index: number) => {
              const totalFaixas = ((data as any).config?.faixas || []).length;
              const step = 100 / (totalFaixas + 1);
              const left = step * (index + 1);
              const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
              const color = colors[index % colors.length];
              
              return (
                <Handle
                  key={`faixa-${index}`}
                  type="source"
                  position={Position.Bottom}
                  id={`faixa-${index}`}
                  className="!w-3 !h-3 !border-2 !border-white"
                  style={{ 
                    left: `${left}%`,
                    backgroundColor: color
                  }}
                  title={faixa.label}
                />
              );
            })}
          </>
        ) : (data as any).type === "condicao_se" ? (
          <>
            <Handle
              type="source"
              position={Position.Bottom}
              id="sim"
              className="!w-3 !h-3 !border-2 !border-white"
              style={{ 
                left: '33%',
                backgroundColor: '#10b981'
              }}
              title="Sim"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="nao"
              className="!w-3 !h-3 !border-2 !border-white"
              style={{ 
                left: '67%',
                backgroundColor: '#ef4444'
              }}
              title="Não"
            />
          </>
        ) : (
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="!bg-primary !w-3 !h-3 !border-2 !border-white" 
          />
        )}
      </Card>

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
                (data as any).onDelete?.(id);
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
          label,
          description,
          icon: blockDef.icon,
          color: blockDef.color,
          ...getBlockHelp("automacao-vendas", (data as any).type, label, description),
        }}
      />
    </>
  );
});

AutomacaoFlowNode.displayName = "AutomacaoFlowNode";
