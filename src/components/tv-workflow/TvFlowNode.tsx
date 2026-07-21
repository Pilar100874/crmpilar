import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { TV_BLOCK_BY_TYPE, TvFlowNodeData } from "@/types/tvWorkflow";
import {
  StickyNote,
  MoreVertical,
  Pause,
  SkipForward,
  Copy,
  Trash2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const TvFlowNode = memo((props: NodeProps) => {
  const { data, selected, id } = props as any;
  const nodeData = data as unknown as TvFlowNodeData & {
    isBreakpoint?: boolean;
    isSkipped?: boolean;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onSetBreakpoint?: (id: string) => void;
    onSetSkip?: (id: string) => void;
    onAddNote?: (id: string) => void;
    onClearDebug?: (id: string) => void;
  };
  const def = TV_BLOCK_BY_TYPE[nodeData.type];
  const [dropdownOpen, setDropdownOpen] = useState(false);
  if (!def) return null;

  const Icon = def.icon;
  const outputs = def.outputs && def.outputs.length > 0 ? def.outputs : [{ id: "default", label: "" }];

  const cardClass = cn(
    "min-w-[240px] max-w-[280px] transition-all duration-200 shadow-md bg-card",
    nodeData.isBreakpoint
      ? "border-2 border-orange-500"
      : nodeData.isSkipped
        ? "border-2 border-border opacity-60"
        : selected
          ? "border-2 border-primary ring-2 ring-primary/30"
          : "border border-border/60",
  );

  const menuItems = (
    <>
      <DropdownMenuItem
        onClick={() => {
          nodeData.onSetBreakpoint?.(id);
          setDropdownOpen(false);
        }}
        className="cursor-pointer"
      >
        <Pause className="w-4 h-4 mr-2 text-orange-500" />
        {nodeData.isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          nodeData.onSetSkip?.(id);
          setDropdownOpen(false);
        }}
        className="cursor-pointer"
      >
        <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
        {nodeData.isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          nodeData.onDuplicate?.(id);
          setDropdownOpen(false);
        }}
        className="cursor-pointer"
      >
        <Copy className="w-4 h-4 mr-2 text-primary" />
        Duplicar Bloco
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          nodeData.onAddNote?.(id);
          setDropdownOpen(false);
        }}
        className="cursor-pointer"
      >
        <StickyNote className="w-4 h-4 mr-2 text-yellow-500" />
        {nodeData.nota ? "Editar Nota" : "Adicionar Nota"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          nodeData.onClearDebug?.(id);
          setDropdownOpen(false);
        }}
        disabled={!nodeData.isBreakpoint && !nodeData.isSkipped}
        className="cursor-pointer disabled:opacity-50"
      >
        <X className="w-4 h-4 mr-2 text-red-500" />
        Liberar Bloco
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          setDropdownOpen(false);
          window.setTimeout(() => nodeData.onDelete?.(id), 0);
        }}
        className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Excluir Bloco
      </DropdownMenuItem>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card className={cardClass}>
          {def.hasInput !== false && (
            <Handle
              type="target"
              position={Position.Top}
              className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
            />
          )}

          <div className={cn("px-3 py-2 rounded-t-lg border-b flex items-center gap-2", def.color)}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide truncate flex-1">
              {def.label}
            </span>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors nodrag"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="px-3 py-2 space-y-1">
            <div className="text-sm font-medium text-foreground truncate">
              {nodeData.label || def.label}
            </div>
            <PreviewText data={nodeData} />
            {nodeData.nota && (
              <div className="flex items-start gap-1.5 mt-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
                <StickyNote className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-[10px] text-yellow-700 dark:text-yellow-300 line-clamp-2">
                  {nodeData.nota}
                </span>
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
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={() => nodeData.onSetBreakpoint?.(id)}
          className="cursor-pointer"
        >
          <Pause className="w-4 h-4 mr-2 text-orange-500" />
          {nodeData.isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => nodeData.onSetSkip?.(id)} className="cursor-pointer">
          <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
          {nodeData.isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => nodeData.onDuplicate?.(id)} className="cursor-pointer">
          <Copy className="w-4 h-4 mr-2 text-primary" />
          Duplicar Bloco
        </ContextMenuItem>
        <ContextMenuItem onClick={() => nodeData.onAddNote?.(id)} className="cursor-pointer">
          <StickyNote className="w-4 h-4 mr-2 text-yellow-500" />
          {nodeData.nota ? "Editar Nota" : "Adicionar Nota"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => nodeData.onDelete?.(id)}
          className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir Bloco
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

TvFlowNode.displayName = "TvFlowNode";

function PreviewText({ data }: { data: TvFlowNodeData }) {
  const c = data.config || {};
  let text = "";
  switch (data.type) {
    case "gatilho_evento":
      text = `Evento: ${c.evento || "—"}`;
      break;
    case "gatilho_agendado":
      text = `Cron: ${c.cron || "—"}`;
      break;
    case "condicao_filtro":
      text = `${c.campo || "?"} ${c.operador || "="} ${c.valor || "?"}`;
      break;
    case "condicao_horario":
      text = `${c.hora_inicio || "?"} → ${c.hora_fim || "?"}`;
      break;
    case "acao_barra":
      text = c.mensagem || "(sem mensagem)";
      break;
    case "acao_aguardar":
      text = `${c.segundos || 0}s`;
      break;
    case "acao_comando":
      text = c.comando || "—";
      break;
    case "acao_som":
      text = `${c.som || "beep"} (${c.volume ?? 80}%)`;
      break;
    case "acao_log":
      text = c.titulo || "(sem título)";
      break;
    default:
      text = "";
  }
  return text ? <div className="text-[11px] text-muted-foreground truncate">{text}</div> : null;
}
