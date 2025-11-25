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

  // Dimensões do bloco estilo Blockly
  const width = 200;
  const height = 50;
  const notchWidth = 15;
  const notchHeight = 4;
  const cornerRadius = 4;

  // Path SVG para o formato Blockly
  const createBlockPath = () => {
    let path = "";
    
    // Começar no canto superior esquerdo
    if (hasInputs) {
      // Com reentrância superior (encaixe de entrada)
      path += `M ${cornerRadius},${notchHeight * 2}`;
      path += ` Q 0,${notchHeight * 2} 0,${notchHeight * 2 + cornerRadius}`;
      path += ` L 0,${notchHeight * 2}`;
      // Reentrância (notch de entrada)
      path += ` L ${width * 0.2},${notchHeight * 2}`;
      path += ` L ${width * 0.2 + 5},${notchHeight * 2 - notchHeight}`;
      path += ` L ${width * 0.2 + notchWidth - 5},${notchHeight * 2 - notchHeight}`;
      path += ` L ${width * 0.2 + notchWidth},${notchHeight * 2}`;
      // Linha superior direita
      path += ` L ${width - cornerRadius},${notchHeight * 2}`;
      path += ` Q ${width},${notchHeight * 2} ${width},${notchHeight * 2 + cornerRadius}`;
    } else {
      // Sem reentrância (bloco inicial)
      path += `M ${cornerRadius},0`;
      path += ` L ${width - cornerRadius},0`;
      path += ` Q ${width},0 ${width},${cornerRadius}`;
    }

    // Lado direito
    const bottomY = hasInputs ? height + notchHeight * 2 : height;
    path += ` L ${width},${bottomY - cornerRadius}`;
    path += ` Q ${width},${bottomY} ${width - cornerRadius},${bottomY}`;

    // Parte inferior com saliência (notch de saída)
    if (hasOutputs) {
      path += ` L ${width * 0.2 + notchWidth},${bottomY}`;
      path += ` L ${width * 0.2 + notchWidth - 5},${bottomY + notchHeight}`;
      path += ` L ${width * 0.2 + 5},${bottomY + notchHeight}`;
      path += ` L ${width * 0.2},${bottomY}`;
    }
    
    path += ` L ${cornerRadius},${bottomY}`;
    path += ` Q 0,${bottomY} 0,${bottomY - cornerRadius}`;

    // Lado esquerdo de volta ao topo
    if (hasInputs) {
      path += ` L 0,${notchHeight * 2 + cornerRadius}`;
      path += ` Q 0,${notchHeight * 2} ${cornerRadius},${notchHeight * 2}`;
    } else {
      path += ` L 0,${cornerRadius}`;
      path += ` Q 0,0 ${cornerRadius},0`;
    }

    path += " Z";
    return path;
  };

  const blockHeight = hasInputs ? height + notchHeight * 2 : height;
  const blockHeightWithOutput = hasOutputs ? blockHeight + notchHeight : blockHeight;

  return (
    <div className="relative" style={{ minWidth: `${width}px` }}>
      {/* Handle de entrada invisível */}
      {hasInputs && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-2 !bg-transparent !border-0"
          style={{ top: 0, left: "50%" }}
        />
      )}

      {/* Bloco SVG estilo Blockly */}
      <svg
        width={width}
        height={blockHeightWithOutput}
        viewBox={`0 0 ${width} ${blockHeightWithOutput}`}
        className="drop-shadow-md"
      >
        {/* Forma do bloco */}
        <path
          d={createBlockPath()}
          fill={color}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1"
        />

        {/* Sombra interna sutil */}
        <path
          d={createBlockPath()}
          fill="url(#blockGradient)"
          opacity="0.1"
        />

        {/* Definir gradiente para sombra interna */}
        <defs>
          <linearGradient id="blockGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="black" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Conteúdo do bloco sobreposto */}
      <div 
        className="absolute top-0 left-0 w-full flex items-center justify-between px-3"
        style={{ 
          height: `${blockHeight}px`,
          paddingTop: hasInputs ? `${notchHeight * 2}px` : "0"
        }}
      >
        <div className="text-white font-medium text-sm flex-1 leading-tight">
          {data.label}
        </div>

        <div className="flex gap-1 ml-2">
          {data.onEdit && (
            <button
              onClick={data.onEdit}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Editar"
            >
              <Edit className="w-3.5 h-3.5 text-white" />
            </button>
          )}
          {data.onDelete && !isStart && (
            <button
              onClick={data.onDelete}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Excluir"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Configuração do bloco */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div 
          className="absolute left-3 right-3 text-xs text-white/95 bg-black/15 rounded px-2 py-1"
          style={{ 
            top: hasInputs ? `${notchHeight * 2 + 26}px` : "26px"
          }}
        >
          {Object.entries(data.config).map(([key, value]) => (
            <div key={key} className="truncate">
              <span className="font-semibold">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      )}

      {/* Handle de saída invisível */}
      {hasOutputs && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-2 !bg-transparent !border-0"
          style={{ bottom: 0, left: "50%" }}
        />
      )}
    </div>
  );
}
