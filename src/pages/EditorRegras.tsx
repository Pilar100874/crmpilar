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
import { BlockNoteDialog } from "@/components/automacao-vendas/BlockNoteDialog";
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [currentRegraId, setCurrentRegraId] = useState<string | null>(null);
  const [nomeRegra, setNomeRegra] = useState("Nova Regra");
  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(1);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNoteNodeId, setCurrentNoteNodeId] = useState<string | null>(null);
  const [currentNoteValue, setCurrentNoteValue] = useState("");

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const nodeToDuplicate = nds.find((n) => n.id === nodeId);
        if (!nodeToDuplicate) return nds;

        const newNode: Node = {
          id: getId(),
          type: "custom",
          position: {
            x: nodeToDuplicate.position.x + 50,
            y: nodeToDuplicate.position.y + 50,
          },
          data: {
            ...JSON.parse(JSON.stringify(nodeToDuplicate.data)),
            onDuplicate: handleDuplicateNode,
            onDelete: handleDeleteNode,
            onAddNote: handleAddNote,
          },
        };

        toast({
          title: "Bloco duplicado",
          description: "Bloco duplicado com sucesso!",
        });

        return [...nds, newNode];
      });
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const nodeToDelete = nds.find(n => n.id === nodeId);
        if (nodeToDelete && (nodeToDelete.data as any).type === "iniciar_validacao") {
          toast({
            title: "Ação não permitida",
            description: "O bloco inicial não pode ser excluído!",
            variant: "destructive",
          });
          return nds;
        }

        toast({
          title: "Bloco excluído",
          description: "Bloco removido com sucesso!",
        });

        setSelectedNode(null);
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        
        return nds.filter((node) => node.id !== nodeId);
      });
    },
    [setNodes, setEdges]
  );

  const handleAddNote = useCallback(
    (nodeId: string) => {
      console.log("handleAddNote called with nodeId:", nodeId);
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId);
        console.log("Found node:", node);
        if (!node) return nds;

        setCurrentNoteNodeId(nodeId);
        setCurrentNoteValue((node.data as any).note || "");
        setNoteDialogOpen(true);
        console.log("Dialog should open now");

        return nds;
      });
    },
    [setNodes]
  );

  const handleSaveNote = useCallback(
    (note: string) => {
      if (!currentNoteNodeId) return;

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === currentNoteNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                note: note,
                onDuplicate: handleDuplicateNode,
                onDelete: handleDeleteNode,
                onAddNote: handleAddNote,
              },
            };
          }
          return n;
        })
      );
      toast({
        title: note ? "Nota adicionada" : "Nota removida",
        description: note ? "Nota adicionada com sucesso!" : "Nota removida com sucesso!",
      });
      setCurrentNoteNodeId(null);
    },
    [currentNoteNodeId, setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote]
  );

  // Initialize with start node
  useEffect(() => {
    if (nodes.length === 0 && !regraIdFromUrl) {
      setNodes([
        {
          id: "start_node",
          type: "custom",
          position: { x: 250, y: 100 },
          data: {
            label: "Iniciar Validação",
            type: "iniciar_validacao",
            config: {},
            onDuplicate: handleDuplicateNode,
            onDelete: handleDeleteNode,
            onAddNote: handleAddNote,
          },
        },
      ]);
    }
  }, [handleDuplicateNode, handleDeleteNode, handleAddNote, regraIdFromUrl]);

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
          
          if (flowData.nodes) {
            const nodesWithCallbacks = flowData.nodes.map((node: Node) => ({
              ...node,
              data: {
                ...node.data,
                onDuplicate: handleDuplicateNode,
                onDelete: handleDeleteNode,
                onAddNote: handleAddNote,
              },
            }));
            setNodes(nodesWithCallbacks);
          }
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
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
          onAddNote: handleAddNote,
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
                onDuplicate: handleDuplicateNode,
                onDelete: handleDeleteNode,
                onAddNote: handleAddNote,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote]
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

    // Validar se existe pelo menos um bloco fim
    const hasEndBlock = nodes.some((node) => (node.data as any).type === "fim");
    if (!hasEndBlock) {
      toast({
        title: "Erro de Validação",
        description: "É necessário adicionar pelo menos um bloco 'Fim' antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    // Validar se todos os blocos estão conectados
    const connectedNodeIds = new Set<string>();
    
    // Adicionar o nó inicial
    const startNode = nodes.find((n) => (n.data as any).type === "iniciar_validacao");
    if (startNode) {
      connectedNodeIds.add(startNode.id);
    }

    // Percorrer edges para marcar nós conectados
    let changed = true;
    while (changed) {
      changed = false;
      edges.forEach((edge) => {
        if (connectedNodeIds.has(edge.source)) {
          if (!connectedNodeIds.has(edge.target)) {
            connectedNodeIds.add(edge.target);
            changed = true;
          }
        }
      });
    }

    // Verificar se há blocos desconectados (exceto o inicial se estiver sozinho)
    const disconnectedNodes = nodes.filter((node) => !connectedNodeIds.has(node.id));
    if (disconnectedNodes.length > 0) {
      const disconnectedLabels = disconnectedNodes
        .map((n) => (n.data as any).label || (n.data as any).type)
        .join(", ");
      toast({
        title: "Erro de Validação",
        description: `Os seguintes blocos não estão conectados: ${disconnectedLabels}. Todos os blocos devem estar conectados ao fluxo.`,
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
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#8B5CF6', strokeWidth: 2 },
              markerEnd: {
                type: 'arrowclosed',
                width: 20,
                height: 20,
                color: '#8B5CF6',
              },
              type: 'smoothstep',
            }}
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

      {/* Dialog de nota */}
      <BlockNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        currentNote={currentNoteValue}
        onSave={handleSaveNote}
      />
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
