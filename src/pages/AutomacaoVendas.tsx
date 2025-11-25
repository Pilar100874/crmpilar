import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft, Download, Upload, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";
import { AutomacaoPropertiesPanel } from "@/components/automacao-vendas/AutomacaoPropertiesPanel";

interface BlockData {
  id: string;
  type: AutomacaoVendasBlockType;
  label: string;
  config: any;
  note?: string;
  nextBlockId?: string;
}

const BLOCK_COLORS: Record<string, string> = {
  inicio: "#5CB85C",
  desconto_valor_compra: "#5C6BC0",
  desconto_quantidade_compras: "#9575CD",
  desconto_produtos_grupo: "#FF8A65",
  desconto_pagamento_antecipado: "#FFD54F",
  desconto_aniversario_cliente: "#F06292",
  desconto_aniversario_empresa: "#BA68C8",
  desconto_data_especial: "#EF5350",
  desconto_historico_crescimento: "#4DB6AC",
  desconto_tempo_desde_ultimo: "#4FC3F7",
  aplicar_desconto: "#81C784",
  fim: "#90A4AE",
};

const BLOCK_CATEGORIES = [
  {
    name: "Início",
    color: "#5CB85C",
    blocks: [
      { type: "inicio" as AutomacaoVendasBlockType, label: "🚀 Início da Automação" },
    ],
  },
  {
    name: "Descontos por Valor",
    color: "#5C6BC0",
    blocks: [
      { type: "desconto_valor_compra" as AutomacaoVendasBlockType, label: "💰 Desconto por Valor" },
      { type: "desconto_quantidade_compras" as AutomacaoVendasBlockType, label: "🛒 Desconto Quantidade" },
    ],
  },
  {
    name: "Descontos por Produto",
    color: "#FF8A65",
    blocks: [
      { type: "desconto_produtos_grupo" as AutomacaoVendasBlockType, label: "📦 Desconto por Grupo" },
    ],
  },
  {
    name: "Descontos Especiais",
    color: "#FFD54F",
    blocks: [
      { type: "desconto_pagamento_antecipado" as AutomacaoVendasBlockType, label: "💳 Pagamento Antecipado" },
      { type: "desconto_aniversario_cliente" as AutomacaoVendasBlockType, label: "🎂 Aniversário Cliente" },
      { type: "desconto_aniversario_empresa" as AutomacaoVendasBlockType, label: "🏢 Aniversário Empresa" },
      { type: "desconto_data_especial" as AutomacaoVendasBlockType, label: "📅 Data Especial" },
    ],
  },
  {
    name: "Descontos por Histórico",
    color: "#4DB6AC",
    blocks: [
      { type: "desconto_historico_crescimento" as AutomacaoVendasBlockType, label: "📈 Crescimento" },
      { type: "desconto_tempo_desde_ultimo" as AutomacaoVendasBlockType, label: "⏰ Tempo Sem Comprar" },
    ],
  },
  {
    name: "Ações",
    color: "#81C784",
    blocks: [
      { type: "aplicar_desconto" as AutomacaoVendasBlockType, label: "✅ Aplicar Desconto" },
      { type: "fim" as AutomacaoVendasBlockType, label: "🏁 Fim" },
    ],
  },
];

export default function AutomacaoVendas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<BlockData[]>([
    {
      id: "start_block",
      type: "inicio",
      label: "🚀 Início da Automação",
      config: {},
    },
  ]);
  const [selectedBlock, setSelectedBlock] = useState<BlockData | null>(null);
  const [automacaoNome, setAutomacaoNome] = useState("Nova Automação de Vendas");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedType, setDraggedType] = useState<AutomacaoVendasBlockType | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Início", "Descontos por Valor", "Descontos Especiais"])
  );

  useEffect(() => {
    if (id) {
      loadAutomacao(id);
    }
  }, [id]);

  const loadAutomacao = async (automacaoId: string) => {
    try {
      const { data, error } = await supabase
        .from("automacoes_vendas")
        .select("*")
        .eq("id", automacaoId)
        .single();

      if (error) throw error;

      if (data) {
        setAutomacaoNome(data.nome);
        setIsAtiva(data.ativo);
        setPrioridade(data.prioridade || 0);

        const flowData = data.flow_data as any;
        if (flowData && flowData.blocks) {
          setBlocks(flowData.blocks);
        }

        toast.success("Automação carregada com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro ao carregar automação:", error);
      toast.error("Erro ao carregar automação: " + error.message);
    }
  };

  const onDragStart = (event: React.DragEvent, nodeType: AutomacaoVendasBlockType) => {
    setDraggedType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent, targetBlockId?: string) => {
      event.preventDefault();

      if (!draggedType) return;

      const blockInfo = BLOCK_CATEGORIES.flatMap((cat) => cat.blocks).find(
        (b) => b.type === draggedType
      );

      const newBlock: BlockData = {
        id: `${draggedType}_${Date.now()}`,
        type: draggedType,
        label: blockInfo?.label || draggedType,
        config: {},
      };

      setBlocks((prevBlocks) => {
        if (targetBlockId) {
          const targetIndex = prevBlocks.findIndex((b) => b.id === targetBlockId);
          if (targetIndex !== -1) {
            const newBlocks = [...prevBlocks];
            newBlock.nextBlockId = prevBlocks[targetIndex].nextBlockId;
            newBlocks[targetIndex].nextBlockId = newBlock.id;
            newBlocks.splice(targetIndex + 1, 0, newBlock);
            return newBlocks;
          }
        }
        return [...prevBlocks, newBlock];
      });

      setDraggedType(null);
    },
    [draggedType]
  );

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prevBlocks) => {
      const blockIndex = prevBlocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1 || blockId === "start_block") return prevBlocks;

      const newBlocks = [...prevBlocks];
      const deletedBlock = newBlocks[blockIndex];

      if (blockIndex > 0) {
        newBlocks[blockIndex - 1].nextBlockId = deletedBlock.nextBlockId;
      }

      newBlocks.splice(blockIndex, 1);
      return newBlocks;
    });

    if (selectedBlock?.id === blockId) {
      setSelectedBlock(null);
    }
  };

  const handleDuplicateBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const newBlock: BlockData = {
      ...block,
      id: `${block.type}_${Date.now()}`,
    };

    setBlocks((prevBlocks) => {
      const blockIndex = prevBlocks.findIndex((b) => b.id === blockId);
      const newBlocks = [...prevBlocks];
      newBlocks.splice(blockIndex + 1, 0, newBlock);
      return newBlocks;
    });
  };

  const handleAddNote = (blockId: string) => {
    const note = prompt("Digite a nota para este bloco:");
    if (note !== null) {
      setBlocks((prevBlocks) =>
        prevBlocks.map((b) => (b.id === blockId ? { ...b, note } : b))
      );
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não identificado");
        return;
      }

      const flowData = { blocks };

      const automacaoData = {
        estabelecimento_id: estabelecimentoId,
        nome: automacaoNome,
        ativo: isAtiva,
        prioridade,
        flow_data: flowData as any,
      };

      if (id) {
        const { error } = await supabase
          .from("automacoes_vendas")
          .update(automacaoData)
          .eq("id", id);

        if (error) throw error;
        toast.success("Automação atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from("automacoes_vendas")
          .insert(automacaoData)
          .select()
          .single();

        if (error) throw error;
        toast.success("Automação criada com sucesso!");
        navigate(`/automacao-vendas/${data.id}`);
      }
    } catch (error: any) {
      console.error("Erro ao salvar automação:", error);
      toast.error("Erro ao salvar automação: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const handleExport = () => {
    const data = JSON.stringify({ blocks }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${automacaoNome}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Automação exportada!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.blocks) {
          setBlocks(data.blocks);
          toast.success("Automação importada!");
        }
      } catch (error) {
        toast.error("Erro ao importar arquivo");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={automacaoNome}
              onChange={(e) => setAutomacaoNome(e.target.value)}
              className="w-64"
              placeholder="Nome da automação"
            />
            <div className="flex items-center gap-2">
              <Switch id="ativa" checked={isAtiva} onCheckedChange={setIsAtiva} />
              <Label htmlFor="ativa">Ativa</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="prioridade">Prioridade:</Label>
              <Input
                id="prioridade"
                type="number"
                value={prioridade}
                onChange={(e) => setPrioridade(parseInt(e.target.value) || 0)}
                className="w-20"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <label>
                <Upload className="h-4 w-4 mr-2" />
                Importar
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Toolbox - estilo Blockly */}
          <div className="w-64 bg-[#f9f9f9] border-r overflow-y-auto">
            {BLOCK_CATEGORIES.map((category) => (
              <div key={category.name} className="border-b">
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full px-4 py-3 flex items-center gap-2 text-left font-semibold hover:bg-gray-200 transition-colors text-sm"
                  style={{
                    backgroundColor: expandedCategories.has(category.name) ? category.color : "#ddd",
                    color: expandedCategories.has(category.name) ? "white" : "#333",
                  }}
                >
                  {expandedCategories.has(category.name) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {category.name}
                </button>
                {expandedCategories.has(category.name) && (
                  <div className="p-2 space-y-2 bg-white">
                    {category.blocks.map((block) => (
                      <div
                        key={block.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, block.type)}
                        className="cursor-move rounded px-3 py-2 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all hover:scale-105"
                        style={{ backgroundColor: category.color }}
                      >
                        {block.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Workspace */}
          <div
            className="flex-1 overflow-auto p-8"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e)}
            style={{
              backgroundColor: "#ffffff",
              backgroundImage: `
                linear-gradient(#e5e5e5 1px, transparent 1px),
                linear-gradient(90deg, #e5e5e5 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
            }}
          >
            <div className="max-w-4xl mx-auto py-8">
              {blocks.map((block) => (
                <BlocklyStyleBlock
                  key={block.id}
                  block={block}
                  onSelect={() => setSelectedBlock(block)}
                  onDelete={() => handleDeleteBlock(block.id)}
                  onDuplicate={() => handleDuplicateBlock(block.id)}
                  onAddNote={() => handleAddNote(block.id)}
                  onDrop={(e) => onDrop(e, block.id)}
                  onDragOver={onDragOver}
                  isSelected={selectedBlock?.id === block.id}
                />
              ))}
            </div>
          </div>

          {/* Properties Panel */}
          {selectedBlock && (
            <AutomacaoPropertiesPanel
              block={selectedBlock}
              onClose={() => setSelectedBlock(null)}
              onUpdate={(updatedBlock) => {
                setBlocks((prevBlocks) =>
                  prevBlocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
                );
                setSelectedBlock(updatedBlock);
              }}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

interface BlocklyStyleBlockProps {
  block: BlockData;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddNote: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isSelected: boolean;
}

function BlocklyStyleBlock({
  block,
  onSelect,
  onDelete,
  onDuplicate,
  onAddNote,
  onDrop,
  onDragOver,
  isSelected,
}: BlocklyStyleBlockProps) {
  const color = BLOCK_COLORS[block.type] || BLOCK_COLORS.fim;
  const isStart = block.type === "inicio";
  const isEnd = block.type === "fim";

  // Calcular cor mais escura para bordas
  const darkerColor = `color-mix(in srgb, ${color} 80%, black)`;

  return (
    <div
      onClick={onSelect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative cursor-pointer transition-all mb-1 ${
        isSelected ? "scale-105" : ""
      }`}
      style={{
        filter: isSelected
          ? `drop-shadow(0 0 12px ${color})`
          : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
      }}
    >
      {/* Notch de Entrada (encaixe superior) */}
      {!isStart && (
        <svg
          width="240"
          height="15"
          viewBox="0 0 240 15"
          style={{ display: "block" }}
          className="block-connector-top"
        >
          <path
            d="M 0,15 L 0,5 L 15,5 L 20,0 L 25,5 L 35,5 L 40,0 L 45,5 L 240,5 L 240,15 Z"
            fill={color}
            stroke={darkerColor}
            strokeWidth="2"
          />
        </svg>
      )}

      {/* Corpo do Bloco */}
      <div
        style={{
          backgroundColor: color,
          position: "relative",
          minWidth: "240px",
          border: `2px solid ${darkerColor}`,
          borderTop: isStart ? `2px solid ${darkerColor}` : "none",
          borderBottom: isEnd ? `2px solid ${darkerColor}` : "none",
          borderRadius: isStart ? "8px 8px 0 0" : isEnd ? "0 0 8px 8px" : "0",
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <div className="flex items-center justify-between gap-4">
            <div
              style={{
                color: "white",
                fontWeight: "600",
                fontSize: "15px",
                textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                fontFamily: "Helvetica, Arial, sans-serif",
              }}
            >
              {block.label}
            </div>

            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="px-2 py-1 rounded text-xs font-semibold hover:bg-black/20 transition-colors"
                style={{
                  backgroundColor: "rgba(0,0,0,0.15)",
                  color: "white",
                }}
                title="Duplicar"
              >
                📋
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote();
                }}
                className="px-2 py-1 rounded text-xs font-semibold hover:bg-black/20 transition-colors"
                style={{
                  backgroundColor: "rgba(0,0,0,0.15)",
                  color: "white",
                }}
                title="Nota"
              >
                📝
              </button>
              {!isStart && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="px-2 py-1 rounded text-xs font-semibold hover:bg-black/20 transition-colors"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.15)",
                    color: "white",
                  }}
                  title="Deletar"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          {block.note && (
            <div
              className="mt-3 p-2 rounded text-sm"
              style={{
                backgroundColor: "rgba(0,0,0,0.2)",
                color: "white",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              📝 {block.note}
            </div>
          )}
        </div>
      </div>

      {/* Notch de Saída (encaixe inferior) */}
      {!isEnd && (
        <svg
          width="240"
          height="10"
          viewBox="0 0 240 10"
          style={{ display: "block" }}
          className="block-connector-bottom"
        >
          <path
            d="M 0,0 L 0,10 L 45,10 L 40,5 L 35,10 L 25,10 L 20,5 L 15,10 L 240,10 L 240,0 Z"
            fill={color}
            stroke={darkerColor}
            strokeWidth="2"
          />
        </svg>
      )}
    </div>
  );
}
