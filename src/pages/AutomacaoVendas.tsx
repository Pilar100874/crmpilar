import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft, Download, Upload, Play } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";
import { AutomacaoBlockLibrary } from "@/components/automacao-vendas/AutomacaoBlockLibrary";
import { AutomacaoPropertiesPanel } from "@/components/automacao-vendas/AutomacaoPropertiesPanel";

interface BlockData {
  id: string;
  type: AutomacaoVendasBlockType;
  label: string;
  config: any;
  note?: string;
  nextBlockId?: string;
}

const BLOCK_COLORS: Record<string, { primary: string; dark: string; darker: string }> = {
  inicio: { primary: "#5CB85C", dark: "#4CAE4C", darker: "#449D44" },
  desconto_valor_compra: { primary: "#5C6BC0", dark: "#3F51B5", darker: "#303F9F" },
  desconto_quantidade_compras: { primary: "#9575CD", dark: "#673AB7", darker: "#512DA8" },
  desconto_produtos_grupo: { primary: "#FF8A65", dark: "#FF7043", darker: "#F4511E" },
  desconto_pagamento_antecipado: { primary: "#FFD54F", dark: "#FFCA28", darker: "#FFC107" },
  desconto_aniversario_cliente: { primary: "#F06292", dark: "#EC407A", darker: "#E91E63" },
  desconto_aniversario_empresa: { primary: "#BA68C8", dark: "#AB47BC", darker: "#9C27B0" },
  desconto_data_especial: { primary: "#EF5350", dark: "#F44336", darker: "#E53935" },
  desconto_historico_crescimento: { primary: "#4DB6AC", dark: "#26A69A", darker: "#009688" },
  desconto_tempo_desde_ultimo: { primary: "#4FC3F7", dark: "#29B6F6", darker: "#03A9F4" },
  aplicar_desconto: { primary: "#81C784", dark: "#66BB6A", darker: "#4CAF50" },
  fim: { primary: "#90A4AE", dark: "#78909C", darker: "#607D8B" },
};

export default function AutomacaoVendas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<BlockData[]>([
    {
      id: "start_block",
      type: "inicio",
      label: "Início da Automação",
      config: {},
    },
  ]);
  const [selectedBlock, setSelectedBlock] = useState<BlockData | null>(null);
  const [automacaoNome, setAutomacaoNome] = useState("Nova Automação de Vendas");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedType, setDraggedType] = useState<AutomacaoVendasBlockType | null>(null);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(true);

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

      const newBlock: BlockData = {
        id: `${draggedType}_${Date.now()}`,
        type: draggedType,
        label: draggedType.replace(/_/g, " "),
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
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Testar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Block Library */}
          <AutomacaoBlockLibrary
            onDragStart={onDragStart}
            isExpanded={isBlockLibraryExpanded}
            onToggleExpand={() => setIsBlockLibraryExpanded(!isBlockLibraryExpanded)}
            blocks={blocks}
            onSelectBlock={(blockId) => {
              const block = blocks.find((b) => b.id === blockId);
              if (block) setSelectedBlock(block);
            }}
          />

          {/* Workspace Canvas */}
          <div
            className="flex-1 overflow-auto p-8"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e)}
            style={{
              backgroundColor: "#ffffff",
              backgroundImage: `
                radial-gradient(circle at 1px 1px, #d0d0d0 1px, transparent 1px)
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
  const colors = BLOCK_COLORS[block.type] || BLOCK_COLORS.fim;
  const isStart = block.type === "inicio";
  const isEnd = block.type === "fim";

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
          ? `drop-shadow(0 0 10px ${colors.primary})`
          : "drop-shadow(0 3px 5px rgba(0,0,0,0.2))",
      }}
    >
      {/* Notch de Entrada */}
      {!isStart && (
        <svg
          width="240"
          height="15"
          viewBox="0 0 240 15"
          style={{ display: "block" }}
        >
          <path
            d="M 0,15 L 0,0 L 60,0 L 70,7 L 80,0 L 240,0 L 240,15 Z"
            fill={colors.primary}
            stroke={colors.darker}
            strokeWidth="1.5"
          />
        </svg>
      )}

      {/* Corpo do Bloco */}
      <div
        style={{
          backgroundColor: colors.primary,
          position: "relative",
          minWidth: "240px",
          border: `2px solid ${colors.darker}`,
          borderTop: isStart ? `2px solid ${colors.darker}` : "none",
          borderBottom: isEnd ? `2px solid ${colors.darker}` : "none",
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
                className="px-2 py-1 rounded text-xs font-semibold"
                style={{
                  backgroundColor: colors.darker,
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
                className="px-2 py-1 rounded text-xs font-semibold"
                style={{
                  backgroundColor: colors.darker,
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
                  className="px-2 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: colors.darker,
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
                backgroundColor: colors.darker,
                color: "white",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              📝 {block.note}
            </div>
          )}
        </div>
      </div>

      {/* Notch de Saída */}
      {!isEnd && (
        <svg
          width="240"
          height="10"
          viewBox="0 0 240 10"
          style={{ display: "block" }}
        >
          <path
            d="M 0,0 L 0,10 L 80,10 L 70,3 L 60,10 L 240,10 L 240,0 Z"
            fill={colors.primary}
            stroke={colors.darker}
            strokeWidth="1.5"
          />
        </svg>
      )}
    </div>
  );
}
