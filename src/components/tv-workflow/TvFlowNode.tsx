import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { TV_BLOCK_BY_TYPE, TvFlowNodeData } from "@/types/tvWorkflow";
import { StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

export const TvFlowNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as TvFlowNodeData;
  const def = TV_BLOCK_BY_TYPE[nodeData.type];
  if (!def) return null;

  const Icon = def.icon;
  const outputs = def.outputs && def.outputs.length > 0 ? def.outputs : [{ id: "default", label: "" }];

  return (
    <div
      className={cn(
        "min-w-[220px] max-w-[260px] rounded-xl border-2 shadow-md bg-card transition-all",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border/60",
      )}
    >
      {def.hasInput !== false && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      )}

      <div className={cn("px-3 py-2 rounded-t-lg border-b flex items-center gap-2", def.color)}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{def.label}</span>
      </div>

      <div className="px-3 py-2 space-y-1">
        <div className="text-sm font-medium text-foreground truncate">
          {nodeData.label || def.label}
        </div>
        <PreviewText data={nodeData} />
        {nodeData.nota && (
          <div className="flex items-start gap-1.5 mt-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
            <StickyNote className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
            <span className="text-[10px] text-yellow-700 dark:text-yellow-300 line-clamp-2">{nodeData.nota}</span>
          </div>
        )}
      </div>

      {outputs.length === 1 ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
        />
      ) : (
        <div className="flex justify-around px-2 pb-2 relative">
          {outputs.map((o, idx) => (
            <div key={o.id} className="flex flex-col items-center gap-0.5 relative">
              <span className="text-[10px] font-semibold text-muted-foreground">{o.label}</span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={o.id}
                style={{ left: `${((idx + 0.5) / outputs.length) * 100}%` }}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

TvFlowNode.displayName = "TvFlowNode";

function PreviewText({ data }: { data: TvFlowNodeData }) {
  const c = data.config || {};
  let text = "";
  switch (data.type) {
    case "gatilho_evento": text = `Evento: ${c.evento || "—"}`; break;
    case "gatilho_agendado": text = `Cron: ${c.cron || "—"}`; break;
    case "condicao_filtro": text = `${c.campo || "?"} ${c.operador || "="} ${c.valor || "?"}`; break;
    case "condicao_horario": text = `${c.hora_inicio || "?"} → ${c.hora_fim || "?"}`; break;
    case "acao_barra": text = c.mensagem || "(sem mensagem)"; break;
    case "acao_aguardar": text = `${c.segundos || 0}s`; break;
    case "acao_comando": text = c.comando || "—"; break;
    case "acao_som": text = `${c.som || "beep"} (${c.volume ?? 80}%)`; break;
    case "acao_log": text = c.titulo || "(sem título)"; break;
    default: text = "";
  }
  return text ? <div className="text-[11px] text-muted-foreground truncate">{text}</div> : null;
}
