import { useCallback, useRef, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { AUTOMACAO_VENDAS_BLOCKS } from "@/types/automacaoVendas";
import { toast } from "@/hooks/use-toast";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";

const nodeTypes = {
  custom: AutomacaoFlowNode,
};

let id = 0;
const getId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `node_${timestamp}_${id++}_${random}`;
};

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
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(false);

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
      toast({
        title: "Erro",
        description: "Não foi possível carregar a regra",
        variant: "destructive",
      });
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const blockDef = AUTOMACAO_VENDAS_BLOCKS.find((b) => b.type === type);
      if (!blockDef) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: getId(),
        type: "custom",
        position,
        data: {
          label: blockDef.label,
          type: blockDef.type,
          config: JSON.parse(JSON.stringify(blockDef.defaultData || {})),
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      
      toast({
        title: "Bloco adicionado",
        description: `Bloco "${blockDef.label}" adicionado com sucesso!`,
      });
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleUpdateNode = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
                config: {
                  ...(node.data as any).config,
                  ...data.config,
                },
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (nodeToDelete && (nodeToDelete.data as any).type === "iniciar_validacao") {
        toast({
          title: "Ação não permitida",
          description: "O bloco inicial não pode ser excluído!",
          variant: "destructive",
        });
        return;
      }
      
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
      toast({
        title: "Bloco excluído",
        description: "Bloco removido com sucesso!",
      });
    },
    [setNodes, setEdges, nodes]
  );

  const handleSave = async () => {
    if (!nomeRegra.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um nome para a regra.",
        variant: "destructive",
      });
      return;
    }

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast({
          title: "Erro",
          description: "Estabelecimento não encontrado",
          variant: "destructive",
        });
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

        toast({
          title: "Sucesso!",
          description: "Regra atualizada com sucesso",
        });
        navigate("/automacoes-vendas");
      } else {
        const { data, error } = await supabase
          .from("automacoes_vendas")
          .insert([regraData])
          .select()
          .single();

        if (error) throw error;

        setCurrentRegraId(data.id);
        navigate(`/editor-regras?id=${data.id}`, { replace: true });

        toast({
          title: "Sucesso!",
          description: "Regra criada com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a regra",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-gradient-to-r from-primary/5 to-primary/10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/automacoes-vendas")}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="h-8 w-px bg-border" />
          
          <Button
            variant={isBlockLibraryExpanded ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsBlockLibraryExpanded(!isBlockLibraryExpanded)}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-2" />
            Blocos
          </Button>

          <div className="h-8 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Input
              value={nomeRegra}
              onChange={(e) => setNomeRegra(e.target.value)}
              placeholder="Nome da regra"
              className="h-8 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ativa"
              checked={isAtiva}
              onCheckedChange={(checked) => setIsAtiva(checked as boolean)}
            />
            <Label htmlFor="ativa" className="text-sm cursor-pointer">Ativa</Label>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Prioridade:</Label>
            <Input
              type="number"
              value={prioridade}
              onChange={(e) => setPrioridade(Number(e.target.value))}
              className="h-8 w-20"
              min="1"
              max="100"
            />
          </div>
        </div>

        <Button onClick={handleSave} size="sm" className="h-8">
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Block Library */}
        <AutomacaoBlockLibrary 
          onDragStart={onDragStart}
          isExpanded={isBlockLibraryExpanded}
          onToggleExpanded={setIsBlockLibraryExpanded}
        />

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 bg-muted/20">
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
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={16}
              size={1}
              color="hsl(var(--muted-foreground))"
              className="opacity-20"
            />
            <Controls 
              className="bg-card border border-border shadow-lg rounded-lg"
              showInteractive={false}
            />
            <MiniMap 
              className="bg-card border border-border shadow-lg rounded-lg"
              nodeColor="#8B5CF6"
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <AutomacaoPropertiesPanel
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
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
