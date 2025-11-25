import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { AUTOMACAO_VENDAS_BLOCKS } from "@/types/automacaoVendas";

export const AutomacaoFlowNode = memo(({ data, selected }: NodeProps) => {
  const blockDef = AUTOMACAO_VENDAS_BLOCKS.find((b) => b.type === (data as any).type);
  const color = blockDef?.color || "#6B7280";
  const icon = String(blockDef?.icon || "🔷");
  const description = String(blockDef?.description || (data as any).type);
  const label = String((data as any).label || "");
  const note = (data as any).note;

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-background min-w-[200px] transition-all ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      style={{
        borderColor: color,
        borderLeftWidth: "6px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3"
        style={{ background: color }}
      />

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + "30" }}
        >
          <span style={{ fontSize: "1.25rem" }}>{icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{label}</div>
          <div className="text-xs text-muted-foreground truncate">
            {description}
          </div>
        </div>
      </div>

      {note && (
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
          📝 {String(note)}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3"
        style={{ background: color }}
      />
    </div>
  );
});

AutomacaoFlowNode.displayName = "AutomacaoFlowNode";
