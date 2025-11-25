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
  const workspaceRef = useRef<HTMLDivElement>(null);

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
          // Inserir após o bloco alvo
          const targetIndex = prevBlocks.findIndex((b) => b.id === targetBlockId);
          if (targetIndex !== -1) {
            const newBlocks = [...prevBlocks];
            // Conectar: bloco alvo -> novo bloco -> próximo bloco antigo
            newBlock.nextBlockId = prevBlocks[targetIndex].nextBlockId;
            newBlocks[targetIndex].nextBlockId = newBlock.id;
            newBlocks.splice(targetIndex + 1, 0, newBlock);
            return newBlocks;
          }
        }
        // Adicionar ao final se não houver alvo
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

      // Reconectar: bloco anterior -> próximo bloco do deletado
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
            ref={workspaceRef}
            className="flex-1 bg-muted/20 overflow-auto p-8"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e)}
          >
            <div className="max-w-4xl mx-auto space-y-2">
              {blocks.map((block) => (
                <div key={block.id} className="relative">
                  <BlockComponent
                    block={block}
                    onSelect={() => setSelectedBlock(block)}
                    onDelete={() => handleDeleteBlock(block.id)}
                    onDuplicate={() => handleDuplicateBlock(block.id)}
                    onAddNote={() => handleAddNote(block.id)}
                    onDrop={(e) => onDrop(e, block.id)}
                    onDragOver={onDragOver}
                    isSelected={selectedBlock?.id === block.id}
                  />
                </div>
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

// Componente de Bloco individual
interface BlockComponentProps {
  block: BlockData;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddNote: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isSelected: boolean;
}

function BlockComponent({
  block,
  onSelect,
  onDelete,
  onDuplicate,
  onAddNote,
  onDrop,
  onDragOver,
  isSelected,
}: BlockComponentProps) {
  const blockColors: Record<string, string> = {
    inicio: "bg-green-500",
    desconto_valor_compra: "bg-blue-500",
    desconto_quantidade_compras: "bg-purple-500",
    desconto_produtos_grupo: "bg-orange-500",
    desconto_pagamento_antecipado: "bg-yellow-500",
    desconto_aniversario_cliente: "bg-pink-500",
    desconto_aniversario_empresa: "bg-indigo-500",
    desconto_data_especial: "bg-red-500",
    desconto_historico_crescimento: "bg-teal-500",
    desconto_tempo_desde_ultimo: "bg-cyan-500",
    aplicar_desconto: "bg-emerald-500",
    fim: "bg-gray-500",
  };

  const color = blockColors[block.type] || "bg-gray-400";

  return (
    <div
      onClick={onSelect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`cursor-pointer transition-all ${isSelected ? "ring-4 ring-primary" : ""}`}
    >
      {/* Conector Superior (encaixe para receber) */}
      {block.type !== "inicio" && (
        <div className="flex justify-center">
          <div className={`w-8 h-4 ${color} rounded-t-lg`} />
        </div>
      )}

      {/* Corpo do Bloco */}
      <div className={`${color} text-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-lg">{block.label}</span>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"
            >
              📋
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddNote();
              }}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"
            >
              📝
            </button>
            {block.type !== "inicio" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        <div className="text-sm opacity-90">{block.type.replace(/_/g, " ")}</div>

        {block.note && (
          <div className="mt-2 p-2 bg-black/20 rounded text-sm">
            📝 {block.note}
          </div>
        )}
      </div>

      {/* Conector Inferior (encaixe para conectar) */}
      {block.type !== "fim" && (
        <div className="flex justify-center">
          <div className={`w-8 h-4 ${color} rounded-b-lg`} />
        </div>
      )}
    </div>
  );
}
