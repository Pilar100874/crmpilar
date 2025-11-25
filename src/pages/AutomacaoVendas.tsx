/**
 * Tela de Automação de Vendas
 * 
 * Editor visual tipo Google Blockly para criar regras de automação
 * que são aplicadas automaticamente aos orçamentos
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft, Download, Upload, Eye } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { BlockNode } from "@/components/automacao-vendas/BlockNode";
import { BlockPalette } from "@/components/automacao-vendas/BlockPalette";
import { BlockConfigPanel } from "@/components/automacao-vendas/BlockConfigPanel";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";
import { gerarDescricaoRegra } from "@/services/automacaoEngine";

const nodeTypes = {
  blockNode: BlockNode,
};

export default function AutomacaoVendas() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: "start",
      type: "blockNode",
      position: { x: 250, y: 50 },
      data: {
        label: "🚀 Quando calcular orçamento",
        type: "inicio" as AutomacaoVendasBlockType,
      },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [automacaoNome, setAutomacaoNome] = useState("Nova Regra de Automação");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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
        if (flowData?.nodes && flowData?.edges) {
          setNodes(flowData.nodes);
          setEdges(flowData.edges);
        }

        toast.success("Automação carregada!");
      }
    } catch (error: any) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar automação");
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleDragStart = (type: AutomacaoVendasBlockType, label: string) => {
    const dragData = { type, label };
    window.draggedBlockData = dragData;
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const dragData = window.draggedBlockData;
      if (!dragData) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 120,
        y: event.clientY - reactFlowBounds.top - 25,
      };

      const nodeId = `${dragData.type}_${Date.now()}`;
      
      const newNode: Node = {
        id: nodeId,
        type: "blockNode",
        position,
        data: {
          label: dragData.label,
          type: dragData.type,
          config: {},
          onDelete: () => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
          },
          onEdit: () => {
            setNodes((current) => {
              const node = current.find(n => n.id === nodeId);
              if (node) setSelectedNode(node);
              return current;
            });
          },
        },
      };

      setNodes((nds) => [...nds, newNode] as typeof nds);
      window.draggedBlockData = null;
    },
    [setNodes, setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não identificado");
        return;
      }

      const flowData = {
        nodes: nodes.map(n => ({ ...n, data: { ...n.data, onDelete: undefined, onEdit: undefined } })),
        edges,
      };

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
        toast.success("Regra atualizada!");
      } else {
        const { data, error } = await supabase
          .from("automacoes_vendas")
          .insert(automacaoData)
          .select()
          .single();

        if (error) throw error;
        toast.success("Regra criada!");
        navigate(`/automacao-vendas/${data.id}`);
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const data = JSON.stringify({ nodes, edges, name: automacaoNome }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${automacaoNome}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Regra exportada!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          if (data.name) setAutomacaoNome(data.name);
          toast.success("Regra importada!");
        }
      } catch (error) {
        toast.error("Erro ao importar");
      }
    };
    reader.readAsText(file);
  };

  const handleConfigSave = (config: any) => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              config,
            },
          };
          return updatedNode;
        }
        return node;
      })
    );
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
              placeholder="Nome da regra"
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Ocultar" : "Prévia"}
            </Button>
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

        {/* Preview em texto */}
        {showPreview && (
          <div className="p-4 bg-blue-50 border-b">
            <div className="text-sm font-semibold mb-2">Prévia da regra em texto:</div>
            <div className="text-sm text-gray-700 italic">
              Esta regra será aplicada quando o orçamento for calculado.
              Configure os blocos para definir condições e ações.
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Paleta de blocos */}
          <BlockPalette onDragStart={handleDragStart} />

          {/* Canvas do React Flow */}
          <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
            >
              <Background gap={20} size={1} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          {/* Painel de configuração */}
          {selectedNode && selectedNode.data?.type && (
            <BlockConfigPanel
              blockId={selectedNode.id}
              blockType={selectedNode.data.type as AutomacaoVendasBlockType}
              config={selectedNode.data.config || {}}
              onClose={() => setSelectedNode(null)}
              onSave={handleConfigSave}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

// Estender window para armazenar dados de drag temporariamente
declare global {
  interface Window {
    draggedBlockData: { type: AutomacaoVendasBlockType; label: string } | null;
  }
}
