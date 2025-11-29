import { useCallback, useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, ArrowLeft, Plus, Play, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { LogisticaFlowNode } from "@/components/logistica/automacao/LogisticaFlowNode";
import { LogisticaBlockLibrary } from "@/components/logistica/automacao/LogisticaBlockLibrary";
import { LogisticaPropertiesPanel } from "@/components/logistica/automacao/LogisticaPropertiesPanel";
import { LogisticaSimulator } from "@/components/logistica/automacao/LogisticaSimulator";
import { BlockNoteDialog } from "@/components/automacao-vendas/BlockNoteDialog";
import { LOGISTICA_BLOCKS } from "@/types/automacaoLogistica";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2 } from "lucide-react";

const nodeTypes = {
  custom: LogisticaFlowNode,
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  selectable: true,
  focusable: true,
  style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: 'hsl(var(--primary))',
  },
};

let id = 0;
const getId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `node_${timestamp}_${id++}_${random}`;
};

interface AutomacaoLogistica {
  id: string;
  nome: string;
  ativo: boolean;
  flow_data: any;
  created_at: string;
}

function EditorContent({ 
  automacaoId, 
  onBack 
}: { 
  automacaoId: string | null; 
  onBack: () => void;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(automacaoId);
  const [nomeAutomacao, setNomeAutomacao] = useState("Nova Automação");
  const [isAtiva, setIsAtiva] = useState(true);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(true);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNoteNodeId, setCurrentNoteNodeId] = useState<string | null>(null);
  const [currentNoteValue, setCurrentNoteValue] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [breakpointNodes, setBreakpointNodes] = useState<Set<string>>(new Set());
  const [skipNodes, setSkipNodes] = useState<Set<string>>(new Set());

  const handleSetBreakpoint = useCallback((nodeId: string) => {
    setBreakpointNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          const isBreakpoint = !breakpointNodes.has(nodeId);
          return {
            ...n,
            data: { ...n.data, isBreakpoint },
          };
        }
        return n;
      })
    );
    toast({ title: breakpointNodes.has(nodeId) ? "Pausa removida" : "Pausa adicionada" });
  }, [breakpointNodes, setNodes]);

  const handleSetSkip = useCallback((nodeId: string) => {
    setSkipNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          const isSkipped = !skipNodes.has(nodeId);
          return {
            ...n,
            data: { ...n.data, isSkipped },
          };
        }
        return n;
      })
    );
    toast({ title: skipNodes.has(nodeId) ? "Bloco não será mais pulado" : "Bloco será pulado" });
  }, [skipNodes, setNodes]);

  const handleClearDebug = useCallback((nodeId: string) => {
    setBreakpointNodes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });
    setSkipNodes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: { ...n.data, isBreakpoint: false, isSkipped: false },
          };
        }
        return n;
      })
    );
    toast({ title: "Bloco liberado" });
  }, [setNodes]);

  const handleHighlightNode = useCallback((nodeId: string | null) => {
    setHighlightedNodeId(nodeId);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, isHighlighted: n.id === nodeId },
      }))
    );
  }, [setNodes]);

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

        toast({ title: "Bloco duplicado" });
        setHasUnsavedChanges(true);
        return [...nds, newNode];
      });
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const nodeToDelete = nds.find(n => n.id === nodeId);
        if (nodeToDelete && (nodeToDelete.data as any).type === "iniciar_automacao") {
          toast({
            title: "Ação não permitida",
            description: "O bloco inicial não pode ser excluído!",
            variant: "destructive",
          });
          return nds;
        }

        toast({ title: "Bloco excluído" });
        setSelectedNode(null);
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setHasUnsavedChanges(true);
        return nds.filter((node) => node.id !== nodeId);
      });
    },
    [setNodes, setEdges]
  );

  const handleAddNote = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId);
        if (!node) return nds;
        setCurrentNoteNodeId(nodeId);
        setCurrentNoteValue((node.data as any).note || "");
        setNoteDialogOpen(true);
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
      toast({ title: note ? "Nota salva" : "Nota removida" });
      setCurrentNoteNodeId(null);
    },
    [currentNoteNodeId, setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote]
  );

  // Initialize
  useEffect(() => {
    if (automacaoId) {
      loadAutomacao(automacaoId);
    } else {
      const initialNode: Node = {
        id: getId(),
        type: "custom",
        position: { x: 250, y: 100 },
        data: {
          label: "Iniciar Automação",
          type: "iniciar_automacao",
          config: {},
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
          onAddNote: handleAddNote,
          onSetBreakpoint: handleSetBreakpoint,
          onSetSkip: handleSetSkip,
          onClearDebug: handleClearDebug,
        },
      };
      setNodes([initialNode]);
      setEdges([]);
    }
  }, [automacaoId, handleDuplicateNode, handleDeleteNode, handleAddNote, handleSetBreakpoint, handleSetSkip, handleClearDebug, setNodes, setEdges]);

  const loadAutomacao = async (id: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("logistica_automacoes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentId(data.id);
        setNomeAutomacao(data.nome);
        setIsAtiva(data.ativo);

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
                onSetBreakpoint: handleSetBreakpoint,
                onSetSkip: handleSetSkip,
                onClearDebug: handleClearDebug,
              },
            }));
            setNodes(nodesWithCallbacks);
          }
          if (flowData.edges) setEdges(flowData.edges);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar automação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a automação",
        variant: "destructive",
      });
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => {
        const filtered = els.filter((e) => e.id !== oldEdge.id);
        return addEdge({ ...newConnection, ...defaultEdgeOptions }, filtered);
      });
      setHasUnsavedChanges(true);
      toast({ title: "Conexão movida" });
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      setHasUnsavedChanges(true);
      toast({ title: `${deleted.length} conexão(ões) removida(s)` });
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const blockDef = LOGISTICA_BLOCKS.find((b) => b.type === type);
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
          onSetBreakpoint: handleSetBreakpoint,
          onSetSkip: handleSetSkip,
          onClearDebug: handleClearDebug,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      setHasUnsavedChanges(true);
      toast({ title: `Bloco "${blockDef.label}" adicionado` });
    },
    [reactFlowInstance, setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote, handleSetBreakpoint, handleSetSkip, handleClearDebug]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNode(null);
  }, []);

  const handleDeleteSelectedEdge = useCallback(() => {
    if (selectedEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      setHasUnsavedChanges(true);
      toast({ title: "Conexão removida" });
    }
  }, [selectedEdgeId, setEdges]);

  // Keyboard listener for edge deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdgeId) {
        event.preventDefault();
        handleDeleteSelectedEdge();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, handleDeleteSelectedEdge]);

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
                onSetBreakpoint: handleSetBreakpoint,
                onSetSkip: handleSetSkip,
                onClearDebug: handleClearDebug,
              },
            };
          }
          return node;
        })
      );
      setHasUnsavedChanges(true);
    },
    [setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote, handleSetBreakpoint, handleSetSkip, handleClearDebug]
  );

  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn({ duration: 200 });
    }
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut({ duration: 200 });
    }
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
    }
  }, [reactFlowInstance]);

  const handleToggleSimulator = useCallback(() => {
    setShowSimulator((prev) => !prev);
    if (showSimulator) {
      handleHighlightNode(null);
    }
  }, [showSimulator, handleHighlightNode]);

  const handleSave = async () => {
    if (!nomeAutomacao.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um nome para a automação.",
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

      const flowData = { nodes, edges };

      const automacaoData = {
        estabelecimento_id: estabelecimentoId,
        nome: nomeAutomacao,
        ativo: isAtiva,
        flow_data: flowData,
      };

      if (currentId) {
        const { error } = await (supabase as any)
          .from("logistica_automacoes")
          .update(automacaoData)
          .eq("id", currentId);

        if (error) throw error;
        toast({ title: "Automação atualizada!" });
      } else {
        const { data, error } = await (supabase as any)
          .from("logistica_automacoes")
          .insert([automacaoData])
          .select()
          .single();

        if (error) throw error;
        setCurrentId(data.id);
        toast({ title: "Automação criada!" });
      }

      setHasUnsavedChanges(false);
      onBack();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a automação",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      onBack();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={nomeAutomacao}
            onChange={(e) => {
              setNomeAutomacao(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 w-[200px]"
          />
          <div className="flex items-center gap-1 border-l pl-4">
            <Button variant="outline" size="icon" onClick={handleZoomIn} className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut} className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleFitView} className="h-8 w-8">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={showSimulator ? "default" : "outline"} 
            size="sm"
            onClick={handleToggleSimulator}
          >
            <Play className="h-4 w-4 mr-2" />
            {showSimulator ? "Fechar Simulador" : "Simular"}
          </Button>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ativa"
              checked={isAtiva}
              onCheckedChange={(checked) => {
                setIsAtiva(checked as boolean);
                setHasUnsavedChanges(true);
              }}
            />
            <Label htmlFor="ativa">Ativa</Label>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block Library */}
        <LogisticaBlockLibrary
          onDragStart={onDragStart}
          isExpanded={isBlockLibraryExpanded}
          onToggleExpand={() => setIsBlockLibraryExpanded(!isBlockLibraryExpanded)}
        />

        {/* Flow Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges.map(e => ({
              ...e,
              selected: e.id === selectedEdgeId,
              style: {
                ...e.style,
                strokeWidth: e.id === selectedEdgeId ? 4 : 2,
                stroke: e.id === selectedEdgeId ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
              },
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onEdgesDelete={onEdgesDelete}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            edgesReconnectable
            elementsSelectable
            edgesFocusable
            deleteKeyCode={null}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap />
            {/* Delete Edge Button */}
            {selectedEdgeId && (
              <div className="absolute top-4 right-4 z-10">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelectedEdge}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Conexão
                </Button>
              </div>
            )}
          </ReactFlow>
        </div>

        {/* Simulator Panel */}
        {showSimulator && (
          <div className="w-[350px] border-l">
            <LogisticaSimulator
              nodes={nodes}
              edges={edges}
              onHighlightNode={handleHighlightNode}
              breakpointNodes={breakpointNodes}
              skipNodes={skipNodes}
            />
          </div>
        )}

        {/* Properties Panel */}
        {!showSimulator && (
          <LogisticaPropertiesPanel
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
          />
        )}
      </div>

      {/* Note Dialog */}
      <BlockNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        currentNote={currentNoteValue}
        onSave={handleSaveNote}
      />

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onBack}>Sair sem salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ListContent({ onEdit, onNew }: { onEdit: (id: string) => void; onNew: () => void }) {
  const [automacoes, setAutomacoes] = useState<AutomacaoLogistica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAutomacoes();
  }, []);

  const loadAutomacoes = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await (supabase as any)
        .from("logistica_automacoes")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAutomacoes(data || []);
    } catch (error) {
      console.error("Erro ao carregar automações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as automações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("logistica_automacoes")
        .update({ ativo })
        .eq("id", id);

      if (error) throw error;
      setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativo } : a));
      toast({ title: ativo ? "Automação ativada" : "Automação desativada" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta automação?")) return;

    try {
      const { error } = await (supabase as any)
        .from("logistica_automacoes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setAutomacoes(prev => prev.filter(a => a.id !== id));
      toast({ title: "Automação excluída" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automações de Logística</h1>
          <p className="text-muted-foreground">
            Configure regras automáticas para monitoramento de veículos
          </p>
        </div>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : automacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma automação cadastrada
                </TableCell>
              </TableRow>
            ) : (
              automacoes.map((automacao) => (
                <TableRow key={automacao.id}>
                  <TableCell className="font-medium">{automacao.nome}</TableCell>
                  <TableCell>
                    <Switch
                      checked={automacao.ativo}
                      onCheckedChange={(checked) => toggleAtivo(automacao.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(automacao.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(automacao.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(automacao.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function LogisticaAutomacoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setEditingId(id);
      setView('editor');
    }
  }, [searchParams]);

  const handleNew = () => {
    setEditingId(null);
    setView('editor');
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView('editor');
  };

  const handleBack = () => {
    setEditingId(null);
    setView('list');
    setSearchParams({});
  };

  return (
    <ReactFlowProvider>
      {view === 'list' ? (
        <ListContent onEdit={handleEdit} onNew={handleNew} />
      ) : (
        <EditorContent automacaoId={editingId} onBack={handleBack} />
      )}
    </ReactFlowProvider>
  );
}
