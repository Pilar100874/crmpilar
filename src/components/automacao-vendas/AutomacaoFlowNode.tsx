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
import { MoreVertical, Copy, Trash2, StickyNote } from "lucide-react";

export const AutomacaoFlowNode = memo(({ data, selected, id }: NodeProps) => {
  const blockDef = AUTOMACAO_VENDAS_BLOCKS.find((b) => b.type === (data as any).type);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  if (!blockDef) return null;

  const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
  const description = String(blockDef.description || (data as any).type);
  const label = String((data as any).label || blockDef.label || "");
  const note = (data as any).note;

  const getCardClassName = () => {
    const baseClass = "min-w-[260px] max-w-[300px] transition-all duration-200 shadow-lg";
    
    return `${baseClass} bg-white border border-slate-300 ${
      selected 
        ? "ring-2 ring-primary border-primary" 
        : "hover:border-slate-400"
    }`;
  };

  return (
    <>
      <Card className={getCardClassName()}>
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!bg-primary !w-3 !h-3 !border-2 !border-white" 
        />
        
        <div className="p-3">
          {/* Cabeçalho com checkbox, ícone, título e menu */}
          <div className="flex items-start gap-2 mb-3">
            <Checkbox className="mt-0.5 h-4 w-4 border-slate-300" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {IconComponent && (
                  <div className="p-1 rounded bg-primary/5 border border-primary/20">
                    <IconComponent className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <span className="font-semibold text-sm text-slate-900 truncate">{label}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{description}</p>
            </div>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                  <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border-slate-200 shadow-lg">
                <DropdownMenuItem
                  onClick={() => {
                    (data as any).onAddNote?.(id);
                    setDropdownOpen(false);
                  }}
                  className="text-slate-700 focus:bg-slate-100 focus:text-slate-900 cursor-pointer"
                >
                  <StickyNote className="w-4 h-4 mr-2 text-yellow-500" />
                  {note ? "Editar Nota" : "Adicionar Nota"}
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => {
                    (data as any).onDuplicate?.(id);
                    setDropdownOpen(false);
                  }}
                  className="text-slate-700 focus:bg-slate-100 focus:text-slate-900 cursor-pointer"
                >
                  <Copy className="w-4 h-4 mr-2 text-primary" />
                  Duplicar Bloco
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-slate-200" />
                
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        {/* Nota (se houver) */}
        {note && (
          <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 whitespace-pre-wrap">
            📝 {String(note)}
          </div>
        )}
        </div>

        {/* Handle inferior - não renderizar para bloco fim */}
        {(data as any).type !== "fim" && (
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
    </>
  );
});

AutomacaoFlowNode.displayName = "AutomacaoFlowNode";
