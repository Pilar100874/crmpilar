import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft, Download, Upload, Play, MoreVertical, Copy, Trash2, StickyNote } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  inicio: { primary: "#4CAF50", dark: "#43A047", darker: "#388E3C" },
  desconto_valor_compra: { primary: "#5C6BC0", dark: "#3949AB", darker: "#283593" },
  desconto_quantidade_compras: { primary: "#7E57C2", dark: "#5E35B1", darker: "#4527A0" },
  desconto_produtos_grupo: { primary: "#FF7043", dark: "#F4511E", darker: "#D84315" },
  desconto_pagamento_antecipado: { primary: "#FFA726", dark: "#FB8C00", darker: "#EF6C00" },
  desconto_aniversario_cliente: { primary: "#EC407A", dark: "#D81B60", darker: "#AD1457" },
  desconto_aniversario_empresa: { primary: "#AB47BC", dark: "#8E24AA", darker: "#6A1B9A" },
  desconto_data_especial: { primary: "#EF5350", dark: "#E53935", darker: "#C62828" },
  desconto_historico_crescimento: { primary: "#26A69A", dark: "#00897B", darker: "#00695C" },
  desconto_tempo_desde_ultimo: { primary: "#29B6F6", dark: "#039BE5", darker: "#0277BD" },
  aplicar_desconto: { primary: "#66BB6A", dark: "#43A047", darker: "#2E7D32" },
  fim: { primary: "#78909C", dark: "#546E7A", darker: "#37474F" },
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
                radial-gradient(circle, #d0d0d0 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
            }}
          >
            <div className="max-w-4xl mx-auto py-4">
              {blocks.map((block) => (
                <BlocklyBlock
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

interface BlocklyBlockProps {
  block: BlockData;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddNote: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isSelected: boolean;
}

function BlocklyBlock({
  block,
  onSelect,
  onDelete,
  onDuplicate,
  onAddNote,
  onDrop,
  onDragOver,
  isSelected,
}: BlocklyBlockProps) {
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
          ? `drop-shadow(0 0 8px ${colors.primary})`
          : "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
      }}
    >
      {/* Encaixe Superior (notch de entrada) */}
      {!isStart && (
        <svg
          width="200"
          height="12"
          viewBox="0 0 200 12"
          style={{ display: "block", margin: "0 auto" }}
        >
          <path
            d="M 0,12 L 0,0 L 40,0 L 45,5 L 50,0 L 200,0 L 200,12 Z"
            fill={colors.primary}
          />
          <path
            d="M 0,0 L 40,0 L 45,5 L 50,0 L 200,0"
            fill="none"
            stroke={colors.darker}
            strokeWidth="1"
          />
        </svg>
      )}

      {/* Corpo Principal do Bloco */}
      <div
        style={{
          backgroundColor: colors.primary,
          position: "relative",
          minWidth: "200px",
        }}
      >
        {/* Borda superior escura (efeito 3D) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            backgroundColor: colors.dark,
          }}
        />

        {/* Conteúdo do Bloco */}
        <div style={{ padding: "8px 12px", paddingTop: "12px" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div
                style={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "14px",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  marginBottom: "2px",
                }}
              >
                {block.label}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNote();
                  }}
                >
                  <StickyNote className="h-4 w-4 mr-2" />
                  {block.note ? "Editar Nota" : "Adicionar Nota"}
                </DropdownMenuItem>
                {!isStart && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nota */}
          {block.note && (
            <div
              style={{
                marginTop: "8px",
                padding: "6px 8px",
                backgroundColor: colors.darker,
                borderRadius: "4px",
                color: "white",
                fontSize: "12px",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              📝 {block.note}
            </div>
          )}
        </div>

        {/* Borda inferior clara (efeito 3D) */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2px",
            backgroundColor: colors.darker,
          }}
        />
      </div>

      {/* Encaixe Inferior (notch de saída) */}
      {!isEnd && (
        <svg
          width="200"
          height="8"
          viewBox="0 0 200 8"
          style={{ display: "block", margin: "0 auto" }}
        >
          <path
            d="M 0,0 L 0,8 L 50,8 L 45,3 L 40,8 L 200,8 L 200,0 Z"
            fill={colors.primary}
          />
          <path
            d="M 0,8 L 50,8 L 45,3 L 40,8 L 200,8"
            fill="none"
            stroke={colors.darker}
            strokeWidth="1"
          />
        </svg>
      )}
    </div>
  );
}
