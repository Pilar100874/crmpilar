import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Layout from "@/components/Layout";
import { FlowNode } from "@/components/omnichannel-builder/FlowNode";
import { BlockLibrary } from "@/components/omnichannel-builder/BlockLibrary";
import { PropertiesPanel } from "@/components/omnichannel-builder/PropertiesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Play, ArrowLeft } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import type { OmnichannelBlockType, OmnichannelNode, OmnichannelFlowData } from "@/types/omnichannelFlow";

const nodeTypes: NodeTypes = {
  custom: FlowNode,
};

const initialNodes: OmnichannelNode[] = [
  {
    id: "start_node",
    type: "custom",
    position: { x: 400, y: 50 },
    data: {
      type: "inicio",
      label: "Início do Fluxo",
      config: {},
    },
  },
];

export default function OmnichannelBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState<OmnichannelNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<OmnichannelNode | null>(null);
  const [flowName, setFlowName] = useState("Novo Fluxo Omnichannel");
  const [isSaving, setIsSaving] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [draggedType, setDraggedType] = useState<OmnichannelBlockType | null>(null);

  // Carregar fluxo existente
  useEffect(() => {
    if (id) {
      loadFlow(id);
    }
  }, [id]);

  const loadFlow = async (flowId: string) => {
    try {
      const { data, error } = await supabase
        .from("omnichannel_flows")
        .select("*")
        .eq("id", flowId)
        .single();

      if (error) throw error;

      if (data) {
        setFlowName(data.nome);
        const flowData = data.flow_data as unknown as OmnichannelFlowData;
        setNodes(flowData.nodes || initialNodes);
        setEdges(flowData.edges || []);
      }
    } catch (error) {
      console.error("Erro ao carregar fluxo:", error);
      toast.error("Erro ao carregar fluxo");
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: "smoothstep",
        style: { stroke: "#06b6d4", strokeWidth: 1.33 },
        markerEnd: { type: "arrowclosed", color: "#06b6d4", width: 20, height: 20 },
      };
      setEdges((eds) => addEdge(edge as any, eds));
    },
    [setEdges]
  );

  const onDragStart = (type: OmnichannelBlockType) => {
    setDraggedType(type);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedType || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 130,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      const newNode: OmnichannelNode = {
        id: `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        type: "custom",
        position,
        data: {
          type: draggedType,
          label: `${draggedType.replace('_', ' ')} ${nodes.length}`,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setDraggedType(null);
    },
    [draggedType, nodes.length, setNodes]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNode(node as OmnichannelNode);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onUpdateNode = useCallback(
    (nodeId: string, updates: Partial<OmnichannelNode["data"]>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...updates },
            };
          }
          return node;
        })
      );
      // Atualizar também o nó selecionado
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) =>
          prev ? { ...prev, data: { ...prev.data, ...updates } } : null
        );
      }
    },
    [setNodes, selectedNode]
  );

  const handleSave = async () => {
    if (!flowName.trim()) {
      toast.error("Informe um nome para o fluxo");
      return;
    }

    setIsSaving(true);

    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        throw new Error("Estabelecimento não encontrado");
      }

      const flowData: OmnichannelFlowData = {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
      };

      if (id) {
        // Atualizar fluxo existente
        const { error } = await supabase
          .from("omnichannel_flows")
          .update({
            nome: flowName,
            flow_data: flowData as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;
        toast.success("Fluxo atualizado com sucesso!");
      } else {
        // Criar novo fluxo
        const { error } = await supabase
          .from("omnichannel_flows")
          .insert({
            estabelecimento_id: estabId,
            nome: flowName,
            flow_data: flowData as any,
            ativo: true,
          });

        if (error) throw error;
        toast.success("Fluxo criado com sucesso!");
        navigate("/config?section=omnichannel-flows");
      }
    } catch (error) {
      console.error("Erro ao salvar fluxo:", error);
      toast.error("Erro ao salvar fluxo");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-background border-b px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/config?section=omnichannel-flows")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="max-w-md"
              placeholder="Nome do fluxo"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Biblioteca de Blocos */}
          <div className="w-80 border-r p-4">
            <BlockLibrary onDragStart={onDragStart} />
          </div>

          {/* Canvas */}
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              defaultEdgeOptions={{
                type: "smoothstep",
                style: { stroke: "#06b6d4", strokeWidth: 1.33 },
                markerEnd: { type: "arrowclosed", color: "#06b6d4" },
              }}
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          {/* Painel de Propriedades */}
          <div className="w-80 border-l p-4">
            <PropertiesPanel
              selectedNode={selectedNode}
              onUpdateNode={onUpdateNode}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
