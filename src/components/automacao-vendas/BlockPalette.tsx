/**
 * Paleta de blocos disponíveis para arrastar ao canvas
 */

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";

interface BlockCategory {
  name: string;
  color: string;
  blocks: {
    type: AutomacaoVendasBlockType;
    label: string;
    description: string;
  }[];
}

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    name: "Início/Fim",
    color: "#4CAF50",
    blocks: [
      {
        type: "inicio",
        label: "🚀 Quando calcular orçamento",
        description: "Ponto inicial da regra",
      },
      {
        type: "fim",
        label: "🏁 Fim",
        description: "Final da regra",
      },
    ],
  },
  {
    name: "Condições",
    color: "#2196F3",
    blocks: [
      {
        type: "condicao_valor",
        label: "💰 Valor total",
        description: "Compara o valor total do orçamento",
      },
      {
        type: "condicao_mes",
        label: "📅 Mês especial",
        description: "Compara com mês de aniversário",
      },
      {
        type: "condicao_quantidade",
        label: "📦 Quantidade de produtos",
        description: "Compara quantidade de itens",
      },
      {
        type: "condicao_cliente_acumulado",
        label: "💵 Valor acumulado cliente",
        description: "Valor total do cliente no mês",
      },
    ],
  },
  {
    name: "Lógica",
    color: "#FF9800",
    blocks: [
      {
        type: "logica_e",
        label: "E (AND)",
        description: "Todas condições devem ser verdadeiras",
      },
      {
        type: "logica_ou",
        label: "OU (OR)",
        description: "Pelo menos uma condição verdadeira",
      },
    ],
  },
  {
    name: "Ações",
    color: "#9C27B0",
    blocks: [
      {
        type: "acao_desconto_percentual",
        label: "% Desconto percentual",
        description: "Aplica desconto em porcentagem",
      },
      {
        type: "acao_desconto_fixo",
        label: "R$ Desconto fixo",
        description: "Aplica desconto em valor fixo",
      },
      {
        type: "acao_adicionar_frete",
        label: "🚚 Adicionar frete",
        description: "Adiciona valor de frete",
      },
      {
        type: "acao_enviar_alerta",
        label: "📢 Enviar alerta",
        description: "Envia mensagem/notificação",
      },
    ],
  },
];

interface BlockPaletteProps {
  onDragStart: (type: AutomacaoVendasBlockType, label: string) => void;
}

export function BlockPalette({ onDragStart }: BlockPaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Início/Fim", "Condições", "Ações"])
  );

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="w-64 bg-gray-50 border-r overflow-y-auto">
      <div className="p-4 bg-primary text-primary-foreground">
        <h2 className="font-bold text-lg">Blocos Disponíveis</h2>
        <p className="text-xs mt-1 opacity-90">Arraste para o canvas</p>
      </div>

      {BLOCK_CATEGORIES.map((category) => (
        <div key={category.name} className="border-b">
          <button
            onClick={() => toggleCategory(category.name)}
            className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-100 transition-colors"
          >
            {expandedCategories.has(category.name) ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: category.color }}
            />
            <span className="font-semibold text-sm">{category.name}</span>
          </button>

          {expandedCategories.has(category.name) && (
            <div className="p-2 space-y-2 bg-white">
              {category.blocks.map((block) => (
                <div
                  key={block.type}
                  draggable
                  onDragStart={() => onDragStart(block.type, block.label)}
                  className="p-3 rounded-lg cursor-move shadow hover:shadow-md transition-shadow border-2"
                  style={{
                    backgroundColor: category.color,
                    borderColor: `color-mix(in srgb, ${category.color} 80%, black)`,
                  }}
                >
                  <div className="text-white font-medium text-sm">
                    {block.label}
                  </div>
                  <div className="text-white/80 text-xs mt-1">
                    {block.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
