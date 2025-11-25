/**
 * Página Editor de Regras com React Flow (sistema visual do bot)
 */

import { useCallback, useRef, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AutomacaoFlowNode } from "@/components/automacao-vendas/AutomacaoFlowNode";
import { AutomacaoBlockLibrary } from "@/components/automacao-vendas/AutomacaoBlockLibrary";
import { AutomacaoPropertiesPanel } from "@/components/automacao-vendas/AutomacaoPropertiesPanel";
import { toast } from "@/lib/toast-config";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";

const nodeTypes = {
  custom: AutomacaoFlowNode,
};

let id = 0;
const getId = () => `node_${Date.now()}_${id++}`;

function EditorRegrasContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const regraIdFromUrl = searchParams.get("id");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const initialNodes: Node[] = [
    {
      id: "start_node",
      type: "custom",
      position: { x: 250, y: 100 },
      data: {
        label: "Iniciar Validação",
        type: "iniciar_validacao",
        config: {},
      },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [currentRegraId, setCurrentRegraId] = useState<string | null>(null);
  const [nomeRegra, setNomeRegra] = useState("Nova Regra");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(1);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(true);

  useEffect(() => {
    if (regraIdFromUrl) {
      loadRegra(regraIdFromUrl);
    }
  }, [regraIdFromUrl]);

  const loadRegra = async (regraId: string) => {
    try {
      const { data, error } = await supabase
        .from("automacoes_vendas")
        .select("*")
        .eq("id", regraId)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentRegraId(data.id);
        setNomeRegra(data.nome);
        setIsAtiva(data.ativo);
        setPrioridade(data.prioridade || 1);

        if (data.flow_data) {
          const flowData = typeof data.flow_data === "string" 
            ? JSON.parse(data.flow_data) 
            : data.flow_data;
          
          if (flowData.nodes) setNodes(flowData.nodes);
          if (flowData.edges) setEdges(flowData.edges);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar regra:", error);
      toast.error("Não foi possível carregar a regra");
    }
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as AutomacaoVendasBlockType;

      if (typeof type === "undefined" || !type || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: getId(),
        type: "custom",
        position,
        data: {
          label: type.replace(/_/g, " "),
          type: type,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, type: AutomacaoVendasBlockType) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleSave = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const flowData = {
        nodes,
        edges,
      };

      const regraData = {
        estabelecimento_id: estabelecimentoId,
        nome: nomeRegra,
        ativo: isAtiva,
        prioridade: prioridade,
        flow_data: flowData as any,
      };

      if (currentRegraId) {
        const { error } = await supabase
          .from("automacoes_vendas")
          .update(regraData)
          .eq("id", currentRegraId);

        if (error) throw error;

        toast.success("Regra atualizada com sucesso");
      } else {
        const { data, error } = await supabase
          .from("automacoes_vendas")
          .insert([regraData])
          .select()
          .single();

        if (error) throw error;

        setCurrentRegraId(data.id);
        navigate(`/editor-regras?id=${data.id}`, { replace: true });

        toast.success("Regra criada com sucesso");
      }
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
      toast.error("Não foi possível salvar a regra");
    }
  };

  const handleUpdateNode = (updatedNode: Node) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === updatedNode.id ? updatedNode : node))
    );
    setSelectedNode(updatedNode);
  };

  const handleSelectBlock = (blockId: string) => {
    const node = nodes.find((n) => n.id === blockId);
    if (node) {
      setSelectedNode(node);
      reactFlowInstance?.fitView({
        nodes: [node],
        duration: 300,
        padding: 0.5,
      });
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4 bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Input
          value={nomeRegra}
          onChange={(e) => setNomeRegra(e.target.value)}
          className="max-w-md"
          placeholder="Nome da regra"
        />

        <div className="flex items-center gap-2">
          <Switch
            checked={isAtiva}
            onCheckedChange={setIsAtiva}
            id="ativa"
          />
          <Label htmlFor="ativa">Ativa</Label>
        </div>

        <div className="flex items-center gap-2">
          <Label>Prioridade:</Label>
          <Input
            type="number"
            value={prioridade}
            onChange={(e) => setPrioridade(parseInt(e.target.value) || 1)}
            className="w-20"
            min="1"
          />
        </div>

        <div className="ml-auto flex gap-2">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <AutomacaoBlockLibrary
          onDragStart={onDragStart}
          isExpanded={isBlockLibraryExpanded}
          onToggleExpand={() => setIsBlockLibraryExpanded(!isBlockLibraryExpanded)}
          blocks={nodes.map((node) => ({
            id: node.id,
            type: (node.data as any).type,
            label: (node.data as any).label,
            config: (node.data as any).config,
            note: (node.data as any).note,
          }))}
          onSelectBlock={handleSelectBlock}
        />

        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {selectedNode && (
          <AutomacaoPropertiesPanel
            block={{
              id: selectedNode.id,
              type: (selectedNode.data as any).type,
              label: (selectedNode.data as any).label,
              config: (selectedNode.data as any).config,
              note: (selectedNode.data as any).note,
            }}
            onClose={() => setSelectedNode(null)}
            onUpdate={(updatedBlock) => {
              handleUpdateNode({
                ...selectedNode,
                data: {
                  ...selectedNode.data,
                  label: updatedBlock.label,
                  config: updatedBlock.config,
                  note: updatedBlock.note,
                },
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function EditorRegras() {
  return (
    <ReactFlowProvider>
      <EditorRegrasContent />
    </ReactFlowProvider>
  );
}
