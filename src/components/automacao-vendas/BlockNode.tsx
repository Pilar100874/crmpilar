/**
 * Componente para renderizar um bloco individual no editor visual
 * 
 * Cada bloco representa uma parte da regra (condição, ação, lógica)
 */

import { Handle, Position } from "@xyflow/react";
import { X, Edit } from "lucide-react";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";

interface BlockNodeProps {
  data: {
    label: string;
    type: AutomacaoVendasBlockType;
    config?: any;
    onDelete?: () => void;
    onEdit?: () => void;
  };
}

// Cores para cada tipo de bloco
const BLOCK_COLORS: Record<string, string> = {
  inicio: "#4CAF50",
  condicao_valor: "#2196F3",
  condicao_mes: "#2196F3",
  condicao_quantidade: "#2196F3",
  condicao_cliente_acumulado: "#2196F3",
  logica_e: "#FF9800",
  logica_ou: "#FF9800",
  acao_desconto_percentual: "#9C27B0",
  acao_desconto_fixo: "#9C27B0",
  acao_adicionar_frete: "#9C27B0",
  acao_enviar_alerta: "#9C27B0",
  fim: "#607D8B",
};

export function BlockNode({ data }: BlockNodeProps) {
  const color = BLOCK_COLORS[data.type] || "#757575";
  const isStart = data.type === "inicio";
  const isEnd = data.type === "fim";
  const hasInputs = !isStart;
  const hasOutputs = !isEnd;

  return (
    <div
      className="px-4 py-3 rounded-lg shadow-lg border-2 min-w-[200px]"
      style={{
        backgroundColor: color,
        borderColor: `color-mix(in srgb, ${color} 80%, black)`,
      }}
    >
      {/* Handle de entrada (exceto bloco início) */}
      {hasInputs && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-white border-2"
          style={{ borderColor: color }}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="text-white font-semibold text-sm flex-1">
          {data.label}
        </div>

        <div className="flex gap-1">
          {data.onEdit && (
            <button
              onClick={data.onEdit}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Editar"
            >
              <Edit className="w-3 h-3 text-white" />
            </button>
          )}
          {data.onDelete && !isStart && (
            <button
              onClick={data.onDelete}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Excluir"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Mostrar configuração do bloco (se houver) */}
      {data.config && (
        <div className="mt-2 text-xs text-white/90 bg-black/20 rounded px-2 py-1">
          {JSON.stringify(data.config, null, 0)}
        </div>
      )}

      {/* Handle de saída (exceto bloco fim) */}
      {hasOutputs && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-white border-2"
          style={{ borderColor: color }}
        />
      )}
    </div>
  );
}
