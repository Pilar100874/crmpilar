import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { AUTOMACAO_VENDAS_BLOCKS } from "@/types/automacaoVendas";
import { Card } from "@/components/ui/card";

export const AutomacaoFlowNode = memo(({ data, selected }: NodeProps) => {
  const blockDef = AUTOMACAO_VENDAS_BLOCKS.find((b) => b.type === (data as any).type);
  const icon = String(blockDef?.icon || "🔷");
  const description = String(blockDef?.description || (data as any).type);
  const label = String((data as any).label || blockDef?.label || "");
  const note = (data as any).note;

  const getCardClassName = () => {
    const baseClass = "w-[240px] transition-all duration-200";
    
    return `${baseClass} bg-background shadow-sm hover:shadow-md border ${
      selected 
        ? "ring-2 ring-primary border-primary" 
        : "border-border hover:border-primary/40"
    }`;
  };

  return (
    <Card className={getCardClassName()}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-background" 
      />
      
      <div className="p-3 space-y-2.5">
        {/* Ícone e Label */}
        <div className="flex items-start gap-2.5">
          <div 
            className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0"
          >
            <span className="text-base leading-none">{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-foreground leading-snug break-words">
              {label}
            </h3>
          </div>
        </div>

        {/* Descrição */}
        <p className="text-xs text-muted-foreground leading-relaxed break-words">
          {description}
        </p>

        {/* Nota (se houver) */}
        {note && (
          <div className="pt-2 border-t border-border text-xs text-muted-foreground break-words">
            📝 {String(note)}
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-background" 
      />
    </Card>
  );
});

AutomacaoFlowNode.displayName = "AutomacaoFlowNode";
