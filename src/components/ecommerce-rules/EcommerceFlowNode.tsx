import { getWorkflowBlockCardClass } from "@/components/workflow/workflowBlockStyle";
import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ECOMMERCE_RULE_BLOCKS } from "@/types/ecommerceRules";
import { Card } from "@/components/ui/card";
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

export const EcommerceFlowNode = memo(({ data, selected, id }: NodeProps) => {
  const blockDef = ECOMMERCE_RULE_BLOCKS.find((b) => b.type === (data as any).type);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const isStartBlock = (data as any).type === 'inicio_regra';
  const isMultiOutput = (data as any).type === 'condicao_valor_pedido';
  const faixas: { valorMin: number; valorMax: number | null; label: string }[] = isMultiOutput ? ((data as any).config?.faixas || []) : [];
  
  if (!blockDef) return null;

  const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
  const description = String(blockDef.description || (data as any).type);
  const label = String((data as any).label || blockDef.label || "");
  const note = (data as any).note;

  const isBreakpoint = (data as any).isBreakpoint;
  const isSkipped = (data as any).isSkipped;

  const getCardClassName = () =>
    getWorkflowBlockCardClass({ selected, isBreakpoint, isSkipped, size: "wide" });

  return (
    <>
      <Card className={getCardClassName()}>
        {!isStartBlock && (
          <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-white" />
        )}

        <div className="p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: blockDef.color + '20' }}>
                {IconComponent && <IconComponent className="w-4 h-4" style={{ color: blockDef.color }} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block leading-tight" title={label}>{label}</span>
                <span className="text-xs text-muted-foreground block leading-snug mt-0.5 whitespace-normal break-words" title={description}>{description}</span>
              </div>
            </div>

            {!isStartBlock ? (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50">
                  <DropdownMenuItem onClick={() => { setDropdownOpen(false); setHelpOpen(true); }}>
                    <HelpCircle className="w-4 h-4 mr-2 text-primary" /> Ajuda e exemplos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setDropdownOpen(false); (data as any).onSetBreakpoint?.(id); }}>
                    <Pause className="w-4 h-4 mr-2 text-orange-500" />
                    {isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setDropdownOpen(false); (data as any).onSetSkip?.(id); }}>
                    <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
                    {isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setDropdownOpen(false); (data as any).onDuplicate?.(id); }}>
                    <Copy className="w-4 h-4 mr-2 text-primary" /> Duplicar Bloco
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setDropdownOpen(false); (data as any).onAddNote?.(id); }}>
                    <StickyNote className="w-4 h-4 mr-2 text-yellow-500" /> {note ? 'Editar Nota' : 'Adicionar Nota'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setDropdownOpen(false); (data as any).onClearDebug?.(id); }}
                    disabled={!isBreakpoint && !isSkipped}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4 mr-2 text-red-500" /> Liberar Bloco
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => { setDropdownOpen(false); setDeleteDialogOpen(true); }}>
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir Bloco
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0"
                title="Ajuda e exemplos"
                onClick={(e) => { e.stopPropagation(); setHelpOpen(true); }}
              >
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {note && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-1">
              <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{note}</span>
            </div>
          )}

          {/* Config summary */}
          {!isMultiOutput && (data as any).config && Object.keys((data as any).config).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(data as any).config.percentual !== undefined && (
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                  {(data as any).config.percentual}%
                </span>
              )}
              {(data as any).config.valor !== undefined && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  R$ {(data as any).config.valor}
                </span>
              )}
              {(data as any).config.codigo && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {(data as any).config.codigo}
                </span>
              )}
              {(data as any).config.tipo && (
                <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full uppercase">
                  {(data as any).config.tipo}
                </span>
              )}
            </div>
          )}

          {/* Multi-output handles with labels */}
          {isMultiOutput && faixas.length > 0 && (
            <div className="mt-3 space-y-1 border-t pt-2">
              {faixas.map((faixa, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] px-1 py-0.5 rounded hover:bg-accent/30">
                  <span className="font-medium text-foreground">{faixa.label || `Faixa ${idx + 1}`}</span>
                  <span className="text-muted-foreground">
                    R$ {faixa.valorMin} → {faixa.valorMax != null ? `R$ ${faixa.valorMax}` : '∞'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Single or multi source handles */}
        {isMultiOutput && faixas.length > 0 ? (
          <div className="relative pb-3">
            {faixas.map((faixa, idx) => {
              const total = faixas.length;
              const spacing = 100 / (total + 1);
              const leftPercent = spacing * (idx + 1);
              return (
                <Handle
                  key={`faixa-${idx}`}
                  type="source"
                  position={Position.Bottom}
                  id={`faixa-${idx}`}
                  className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white"
                  style={{ left: `${leftPercent}%` }}
                />
              );
            })}
          </div>
        ) : (
          <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-white" />
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o bloco "{label}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setDeleteDialogOpen(false); (data as any).onDelete?.(id); }}>
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
          ...getBlockHelp("ecommerce", (data as any).type, label, description),
        }}
      />
    </>
  );
});

EcommerceFlowNode.displayName = "EcommerceFlowNode";
