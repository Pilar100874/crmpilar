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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft, Plus, Download, Upload, Play } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import type { AutomacaoVendasBlockType, AutomacaoVendasNode, AutomacaoVendasEdge, AutomacaoVendasFlowData } from "@/types/automacaoVendas";

// Importar componentes que criaremos
import { AutomacaoFlowNode } from "@/components/automacao-vendas/AutomacaoFlowNode";
import { AutomacaoBlockLibrary } from "@/components/automacao-vendas/AutomacaoBlockLibrary";
import { AutomacaoPropertiesPanel } from "@/components/automacao-vendas/AutomacaoPropertiesPanel";

const nodeTypes: NodeTypes = {
  custom: AutomacaoFlowNode,
};

const initialNodes: AutomacaoVendasNode[] = [
  {
    id: "start_node",
    type: "custom",
    position: { x: 400, y: 50 },
    data: {
      type: "inicio",
      label: "Início da Automação",
      config: {},
    },
  },
];

export default function AutomacaoVendas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState<AutomacaoVendasNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<AutomacaoVendasNode | null>(null);
  const [automacaoNome, setAutomacaoNome] = useState("Nova Automação de Vendas");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [draggedType, setDraggedType] = useState<AutomacaoVendasBlockType | null>(null);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Carregar automação existente
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
        if (flowData && flowData.nodes && flowData.edges) {
          setNodes(flowData.nodes);
          setEdges(flowData.edges);
        }
        
        toast.success("Automação carregada com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro ao carregar automação:", error);
      toast.error("Erro ao carregar automação: " + error.message);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: AutomacaoVendasBlockType) => {
    setDraggedType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedType || !reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: AutomacaoVendasNode = {
        id: `${draggedType}_${Date.now()}`,
        type: "custom",
        position,
        data: {
          type: draggedType,
          label: draggedType.replace(/_/g, " "),
          config: {},
          onDelete: handleDeleteNode,
          onDuplicate: handleDuplicateNode,
          onAddNote: handleAddNote,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setDraggedType(null);
    },
    [draggedType, reactFlowInstance, setNodes]
  );

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleDuplicateNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newNode: AutomacaoVendasNode = {
      ...node,
      id: `${node.data.type}_${Date.now()}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleAddNote = (nodeId: string) => {
    const note = prompt("Digite a nota para este bloco:");
    if (note !== null) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, note } }
            : n
        )
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

      const flowData: AutomacaoVendasFlowData = {
        nodes,
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
        // Atualizar existente
        const { error } = await supabase
          .from("automacoes_vendas")
          .update(automacaoData)
          .eq("id", id);

        if (error) throw error;
        toast.success("Automação atualizada com sucesso!");
      } else {
        // Criar nova
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
            <div className="flex items-center gap-4">
              <Input
                value={automacaoNome}
                onChange={(e) => setAutomacaoNome(e.target.value)}
                className="w-64"
                placeholder="Nome da automação"
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="ativa"
                  checked={isAtiva}
                  onCheckedChange={setIsAtiva}
                />
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
            nodes={nodes}
            onSelectNode={(nodeId) => {
              const node = nodes.find((n) => n.id === nodeId);
              if (node) setSelectedNode(node);
            }}
          />

          {/* Flow Canvas */}
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={(_, node) => setSelectedNode(node as AutomacaoVendasNode)}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          {/* Properties Panel */}
          {selectedNode && (
            <AutomacaoPropertiesPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onUpdate={(updatedNode) => {
                setNodes((nds) =>
                  nds.map((n) => (n.id === updatedNode.id ? updatedNode : n))
                );
                setSelectedNode(updatedNode);
              }}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
