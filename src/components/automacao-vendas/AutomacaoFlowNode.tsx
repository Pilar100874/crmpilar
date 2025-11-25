import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Play,
  DollarSign,
  Repeat,
  Package,
  Zap,
  Gift,
  Building2,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  StopCircle,
  MoreVertical,
  Trash2,
  Copy,
  StickyNote,
} from "lucide-react";
import type { AutomacaoVendasNode, AutomacaoVendasBlockType } from "@/types/automacaoVendas";

interface AutomacaoFlowNodeProps {
  id: string;
  data: AutomacaoVendasNode["data"];
  selected?: boolean;
}

const nodeIcons: Record<AutomacaoVendasBlockType, any> = {
  inicio: Play,
  desconto_valor_compra: DollarSign,
  desconto_quantidade_compras: Repeat,
  desconto_produtos_grupo: Package,
  desconto_pagamento_antecipado: Zap,
  desconto_aniversario_cliente: Gift,
  desconto_aniversario_empresa: Building2,
  desconto_data_especial: Calendar,
  desconto_historico_crescimento: TrendingUp,
  desconto_tempo_desde_ultimo: Clock,
  aplicar_desconto: CheckCircle,
  fim: StopCircle,
};

export const AutomacaoFlowNode = memo(({ id, data, selected }: AutomacaoFlowNodeProps) => {
  const Icon = nodeIcons[data.type] || Play;
  const isStartNode = data.type === "inicio";
  const isEndNode = data.type === "fim";

  return (
    <Card
      className={`min-w-[200px] p-4 shadow-lg transition-all ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      {!isStartNode && (
        <Handle type="target" position={Position.Top} className="w-3 h-3" />
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {data.onDuplicate && (
              <DropdownMenuItem onClick={() => data.onDuplicate?.(id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
            )}
            {data.onAddNote && (
              <DropdownMenuItem onClick={() => data.onAddNote?.(id)}>
                <StickyNote className="h-4 w-4 mr-2" />
                {data.note ? "Editar Nota" : "Adicionar Nota"}
              </DropdownMenuItem>
            )}
            {data.onDelete && !isStartNode && (
              <DropdownMenuItem
                onClick={() => data.onDelete?.(id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="text-xs text-muted-foreground">
        {data.type.replace(/_/g, " ")}
      </div>

      {data.note && (
        <div className="mt-2 p-2 bg-muted rounded text-xs">
          📝 {data.note}
        </div>
      )}

      {!isEndNode && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      )}
    </Card>
  );
});

AutomacaoFlowNode.displayName = "AutomacaoFlowNode";
