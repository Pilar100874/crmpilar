import { useState, useEffect } from "react";
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

interface BlockData {
  id: string;
  type: AutomacaoVendasBlockType;
  label: string;
  config: any;
  x: number;
  y: number;
}

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
      { type: "desconto_valor_compra" as AutomacaoVendasBlockType, label: "💰 Desconto por Valor de Compra" },
      { type: "desconto_quantidade_compras" as AutomacaoVendasBlockType, label: "🛒 Desconto por Quantidade" },
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
      { type: "desconto_historico_crescimento" as AutomacaoVendasBlockType, label: "📈 Histórico Crescimento" },
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
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [automacaoNome, setAutomacaoNome] = useState("Nova Automação de Vendas");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<{ type: AutomacaoVendasBlockType; label: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Início"]));

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

  const handleDragStart = (blockType: AutomacaoVendasBlockType, blockLabel: string) => {
    setDraggedBlock({ type: blockType, label: blockLabel });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedBlock) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newBlock: BlockData = {
      id: `${draggedBlock.type}_${Date.now()}`,
      type: draggedBlock.type,
      label: draggedBlock.label,
      config: {},
      x: Math.max(0, x - 120), // Center the block on cursor
      y: Math.max(0, y - 25),
    };

    setBlocks([...blocks, newBlock]);
    setDraggedBlock(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
                  className="w-full px-4 py-3 flex items-center gap-2 text-left font-semibold hover:bg-gray-200 transition-colors"
                  style={{ backgroundColor: expandedCategories.has(category.name) ? category.color : undefined, color: expandedCategories.has(category.name) ? "white" : undefined }}
                >
                  {expandedCategories.has(category.name) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {category.name}
                </button>
                {expandedCategories.has(category.name) && (
                  <div className="p-2 space-y-2">
                    {category.blocks.map((block) => (
                      <div
                        key={block.type}
                        draggable
                        onDragStart={() => handleDragStart(block.type, block.label)}
                        className="cursor-move rounded-lg px-3 py-2 text-white font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
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
            className="flex-1 relative overflow-auto"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              backgroundColor: "#ffffff",
              backgroundImage: `
                linear-gradient(#e0e0e0 1px, transparent 1px),
                linear-gradient(90deg, #e0e0e0 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
            }}
          >
            {blocks.map((block) => {
              const category = BLOCK_CATEGORIES.find((cat) =>
                cat.blocks.some((b) => b.type === block.type)
              );
              const color = category?.color || "#90A4AE";

              return (
                <div
                  key={block.id}
                  className="absolute cursor-move rounded-lg px-4 py-3 text-white font-medium shadow-lg"
                  style={{
                    backgroundColor: color,
                    left: block.x,
                    top: block.y,
                    minWidth: "240px",
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("blockId", block.id);
                  }}
                >
                  {block.label}
                  <button
                    onClick={() => setBlocks(blocks.filter((b) => b.id !== block.id))}
                    className="ml-2 px-2 py-1 bg-white/20 rounded hover:bg-white/30 text-xs"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
