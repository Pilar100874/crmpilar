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
    <div className="relative min-w-[220px]">
      {/* Handle de entrada invisível (exceto bloco início) */}
      {hasInputs && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-transparent !border-0"
          style={{ top: "15px" }}
        />
      )}

      {/* Bloco estilo Blockly com SVG */}
      <svg
        width="100%"
        height="auto"
        viewBox="0 0 220 80"
        className="drop-shadow-lg"
        style={{ overflow: "visible" }}
      >
        {/* Forma do bloco com encaixe tipo puzzle */}
        <path
          d={`
            M 0,${hasInputs ? "20" : "4"}
            ${hasInputs ? "L 20,20 L 25,15 L 35,15 L 40,20 L 60,20" : ""}
            L 60,${hasInputs ? "20" : "4"}
            Q 65,${hasInputs ? "20" : "4"} 65,${hasInputs ? "25" : "9"}
            L 65,${hasOutputs ? "60" : "76"}
            ${hasOutputs ? "L 40,60 L 35,65 L 25,65 L 20,60 L 0,60" : "L 0,76"}
            Q 0,${hasOutputs ? "60" : "76"} 0,${hasOutputs ? "55" : "71"}
            L 0,${hasInputs ? "25" : "9"}
            Q 0,${hasInputs ? "20" : "4"} 0,${hasInputs ? "20" : "4"}
            Z
          `}
          fill={color}
          stroke={`color-mix(in srgb, ${color} 70%, black)`}
          strokeWidth="2"
        />

        {/* Conteúdo do bloco */}
        <foreignObject x="10" y={hasInputs ? "25" : "10"} width="200" height="50">
          <div className="flex items-center justify-between gap-2 px-2">
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
          {data.config && Object.keys(data.config).length > 0 && (
            <div className="mt-1 text-xs text-white/90 bg-black/20 rounded px-2 py-1 mx-2">
              {Object.entries(data.config).map(([key, value]) => (
                <div key={key}>
                  <span className="font-semibold">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}
        </foreignObject>
      </svg>

      {/* Handle de saída invisível (exceto bloco fim) */}
      {hasOutputs && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-transparent !border-0"
          style={{ bottom: "15px" }}
        />
      )}
    </div>
  );
}
