import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { AUTOMACAO_VENDAS_BLOCKS } from "@/types/automacaoVendas";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export const AutomacaoFlowNode = memo(({ data, selected }: NodeProps) => {
  const blockDef = AUTOMACAO_VENDAS_BLOCKS.find((b) => b.type === (data as any).type);
  const icon = String(blockDef?.icon || "🔷");
  const description = String(blockDef?.description || (data as any).type);
  const label = String((data as any).label || blockDef?.label || "");
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
    <Card className={getCardClassName()}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-primary !w-3 !h-3 !border-2 !border-white" 
      />
      
      <div className="p-3">
        {/* Cabeçalho com checkbox, ícone e título */}
        <div className="flex items-start gap-2 mb-3">
          <Checkbox className="mt-0.5 h-4 w-4 border-slate-300" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded bg-primary/5 border border-primary/20 flex items-center justify-center">
                <span className="text-base">{icon}</span>
              </div>
              <span className="font-semibold text-sm text-slate-900 truncate">{label}</span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{description}</p>
          </div>
        </div>

        {/* Nota (se houver) */}
        {note && (
          <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
            📝 {String(note)}
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-primary !w-3 !h-3 !border-2 !border-white" 
      />
    </Card>
  );
});

AutomacaoFlowNode.displayName = "AutomacaoFlowNode";
