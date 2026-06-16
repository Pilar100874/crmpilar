import { FloatingAddBlockButton } from "@/components/workflow/FloatingAddBlockButton";
import { useCallback, useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus, Play, ZoomIn, ZoomOut, Maximize2, Blocks, Zap, Copy, Trash2, Edit } from "lucide-react";
import { WorkflowCard, WorkflowCardGrid } from "@/components/ui/workflow-card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { WorkflowFilesMenu } from "@/components/workflow/WorkflowFilesMenu";
import { boxSelectionProps } from "@/lib/flowSelection";
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
import { WorkflowAIGenerator } from "@/components/workflow/WorkflowAIGenerator";
import { WorkflowBuilderLayout } from "@/components/workflow/WorkflowBuilderLayout";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";

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
  onBack,
  initialName,
}: { 
  automacaoId: string | null; 
  onBack: () => void;
  initialName?: string;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(automacaoId);
  const [nomeAutomacao, setNomeAutomacao] = useState(initialName || "Nova Automação");

  const [isAtiva, setIsAtiva] = useState(true);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(true);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNoteNodeId, setCurrentNoteNodeId] = useState<string | null>(null);
  const [currentNoteValue, setCurrentNoteValue] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const baselineSignatureRef = useRef<string | null>(null);
  const buildSignature = useCallback(() => {
    return JSON.stringify({
      n: nodes.map((n) => ({
        id: n.id,
        type: (n.data as any)?.type,
        label: (n.data as any)?.label,
        config: (n.data as any)?.config,
        note: (n.data as any)?.note,
      })),
      e: edges.map((e) => ({ s: e.source, t: e.target, sh: e.sourceHandle, th: e.targetHandle })),
      name: nomeAutomacao,
      ativo: isAtiva,
    });
  }, [nodes, edges, nomeAutomacao, isAtiva]);
  useEffect(() => {
    const sig = buildSignature();
    if (baselineSignatureRef.current === null) {
      if (nodes.length > 0) {
        baselineSignatureRef.current = sig;
        setHasUnsavedChanges(false);
      }
      return;
    }
    setHasUnsavedChanges(sig !== baselineSignatureRef.current);
  }, [buildSignature, nodes.length]);
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

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, isCollapsed: !(node.data as any).isCollapsed } }
          : node
      )
    );
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const handleCollapseAll = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({ ...node, data: { ...node.data, isCollapsed: true } }))
    );
    toast({ title: "Todos os blocos encolhidos" });
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const handleExpandAll = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({ ...node, data: { ...node.data, isCollapsed: false } }))
    );
    toast({ title: "Todos os blocos ampliados" });
    setHasUnsavedChanges(true);
  }, [setNodes]);

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
                onToggleCollapse: handleToggleCollapse,
              },
            };
          }
          return n;
        })
      );
      toast({ title: note ? "Nota salva" : "Nota removida" });
      setCurrentNoteNodeId(null);
    },
    [currentNoteNodeId, setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote, handleToggleCollapse]
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
          onToggleCollapse: handleToggleCollapse,
        },
      };
      setNodes([initialNode]);
      setEdges([]);
    }
  }, [automacaoId, handleDuplicateNode, handleDeleteNode, handleAddNote, handleSetBreakpoint, handleSetSkip, handleClearDebug, handleToggleCollapse, setNodes, setEdges]);

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
                onToggleCollapse: handleToggleCollapse,
              },
            }));
            setNodes(nodesWithCallbacks);
          }
          if (flowData.edges) setEdges(flowData.edges);
          baselineSignatureRef.current = null; // re-baselina após carga
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

  // ===== Smart connect =====
  const connectStartRef = useRef<{ nodeId: string | null; handleType: 'source' | 'target' } | null>(null);
  const [connectMenu, setConnectMenu] = useState<null | { x: number; y: number; flowX: number; flowY: number; fromNodeId: string; handleType: 'source' | 'target' }>(null);

  const onConnectStart = useCallback((_: any, params: any) => {
    connectStartRef.current = { nodeId: params.nodeId, handleType: params.handleType };
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    if (!start || !start.nodeId || !reactFlowInstance) return;
    const target = event.target as HTMLElement;
    if (!target?.classList?.contains('react-flow__pane')) return;
    const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX;
    const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY;
    if (clientX == null) return;
    const flowPos = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
    setConnectMenu({ x: clientX, y: clientY, flowX: flowPos.x, flowY: flowPos.y, fromNodeId: start.nodeId, handleType: start.handleType });
  }, [reactFlowInstance]);

  const handleSmartPick = useCallback((type: string) => {
    if (!connectMenu) return;
    const blockDef = LOGISTICA_BLOCKS.find((b) => b.type === type);
    if (!blockDef) return;
    const newNode: Node = {
      id: getId(),
      type: 'custom',
      position: { x: connectMenu.flowX - 100, y: connectMenu.flowY - 40 },
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
        onToggleCollapse: handleToggleCollapse,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => addEdge(
      connectMenu.handleType === 'source'
        ? { ...defaultEdgeOptions, source: connectMenu.fromNodeId, target: newNode.id }
        : { ...defaultEdgeOptions, source: newNode.id, target: connectMenu.fromNodeId },
      eds
    ));
    setHasUnsavedChanges(true);
  }, [connectMenu, setNodes, setEdges, handleDuplicateNode, handleDeleteNode, handleAddNote, handleSetBreakpoint, handleSetSkip, handleClearDebug, handleToggleCollapse]);

  const smartBlockOptions: SmartBlockOption[] = LOGISTICA_BLOCKS
    .filter((b: any) => b.type !== 'inicio')
    .map((b: any) => ({ type: b.type, label: b.label, description: b.description, category: b.category }));

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
          onToggleCollapse: handleToggleCollapse,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      setHasUnsavedChanges(true);
      toast({ title: `Bloco "${blockDef.label}" adicionado` });
    },
    [reactFlowInstance, setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote, handleSetBreakpoint, handleSetSkip, handleClearDebug, handleToggleCollapse]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail?.type;
      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;
      const blockDef = LOGISTICA_BLOCKS.find((b) => b.type === type);
      if (!blockDef) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
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
          onToggleCollapse: handleToggleCollapse,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      setHasUnsavedChanges(true);
      toast({ title: `Bloco "${blockDef.label}" adicionado` });
    };
    window.addEventListener("workflow:add-block", handler);
    return () => window.removeEventListener("workflow:add-block", handler);
  }, [reactFlowInstance, setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote, handleSetBreakpoint, handleSetSkip, handleClearDebug, handleToggleCollapse]);

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

      baselineSignatureRef.current = buildSignature();
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

  useUnsavedChanges("logistica-automacao", hasUnsavedChanges, async () => { await handleSave(); return !hasUnsavedChanges; }, nomeAutomacao || "Automação");

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      onBack();
    }
  };

  return (
    <WorkflowBuilderLayout
      title="LOGÍSTICA"
      subtitle="Arraste blocos para criar seu fluxo"
      flowName={nomeAutomacao}
      onFlowNameChange={(v) => { setNomeAutomacao(v); setHasUnsavedChanges(true); }}
      onSave={handleSave}
      onTest={handleToggleSimulator}
      showTest={showSimulator}
      testLabel="Testar"
      isTestActive={showSimulator}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onFitView={handleFitView}
      onClose={onBack}
      aiGeneratorContent={
        <WorkflowAIGenerator
          workflowType="Logística"
          blockDefinitions={LOGISTICA_BLOCKS}
          onGenerated={(newNodes, newEdges) => {
            setNodes(nds => [...nds, ...newNodes]);
            setEdges(eds => [...eds, ...newEdges]);
            setHasUnsavedChanges(true);
          }}
        />
      }
      rightContent={
        <WorkflowFilesMenu
          nodes={nodes}
          edges={edges}
          selectedNodes={nodes.filter((n) => n.selected)}
          onImport={(n, e) => { setNodes(n as any); setEdges(e as any); }}
          onLoadTemplate={(newNodes, newEdges) => {
            setNodes((nds) => [...nds, ...newNodes]);
            setEdges((eds) => [...eds, ...newEdges]);
            setHasUnsavedChanges(true);
          }}
        />
      }
    >

      <div className="flex-1 flex overflow-hidden">
        {/* Block Library */}
        <LogisticaBlockLibrary
          onDragStart={onDragStart}
          isExpanded={isBlockLibraryExpanded}
          onToggleExpand={() => setIsBlockLibraryExpanded(!isBlockLibraryExpanded)}
        />

        {/* Flow Canvas */}
        <div ref={reactFlowWrapper} className={`${showSimulator ? "mr-[350px]" : ""} flex-1 relative`}>
          {!isBlockLibraryExpanded && (
            <FloatingAddBlockButton onClick={() => setIsBlockLibraryExpanded(true)} />
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges.map((edge) => ({
              ...edge,
              selected: edge.id === selectedEdgeId,
              style: {
                stroke: edge.selected || edge.id === selectedEdgeId ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
                strokeWidth: edge.selected || edge.id === selectedEdgeId ? 2.5 : 1.33,
              },
              markerEnd: {
                type: 'arrowclosed' as any,
                width: 20,
                height: 20,
                color: edge.selected || edge.id === selectedEdgeId ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
              },
              type: 'smoothstep',
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onReconnect={onReconnect}
            onEdgesDelete={onEdgesDelete}
            onInit={(instance) => {
              setReactFlowInstance(instance);
              setTimeout(() => {
                instance.fitView({ padding: 0.2, duration: 400, maxZoom: 1.0, minZoom: 0.5 });
              }, 100);
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgesReconnectable
            elementsSelectable
            edgesFocusable
            className="bg-background"
            connectOnClick={false}
            autoPanOnConnect={false}
            {...boxSelectionProps()}
            autoPanOnNodeDrag={true}
            onBeforeDelete={async ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
              const filtered = nodesToDelete.filter(n => (n.data as any)?.type !== "iniciar_automacao");
              if (filtered.length === nodesToDelete.length) return true;
              if (filtered.length === 0 && edgesToDelete.length === 0) {
                toast({ title: "Ação não permitida", description: "O bloco inicial não pode ser excluído!", variant: "destructive" });
                return false;
              }
              return { nodes: filtered, edges: edgesToDelete };
            }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
              markerEnd: {
                type: 'arrowclosed' as any,
                width: 20,
                height: 20,
                color: 'hsl(var(--primary))',
              },
              type: 'smoothstep',
            }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1.5}
              color="#cbd5e1"
              className="opacity-40"
            />
            <Controls
              className="bg-card border border-border shadow-lg rounded-lg"
              showInteractive={true}
            />
            <MiniMap
              nodeColor={() => "#06b6d4"}
              className="bg-card border border-border rounded-lg shadow-lg"
              maskColor="rgba(255, 255, 255, 0.8)"
            />
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
          {connectMenu && (
            <SmartConnectMenu
              x={connectMenu.x}
              y={connectMenu.y}
              blocks={smartBlockOptions}
              onPick={handleSmartPick}
              onClose={() => setConnectMenu(null)}
            />
          )}
        </div>

        {/* Simulator Panel */}
        {showSimulator && (
          <div className="fixed right-0 top-[90px] w-[350px] h-[calc(100vh-90px)] min-h-0 overflow-hidden flex flex-col bg-card backdrop-blur-sm border-l border-border z-40">
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
        {!showSimulator && selectedNode && (
          <LogisticaPropertiesPanel
            selectedNode={nodes.find(n => n.id === selectedNode.id) || selectedNode}
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
    </WorkflowBuilderLayout>
  );
}

function ListContent({ onEdit, onNew }: { onEdit: (id: string) => void; onNew: () => void }) {
  const [automacoes, setAutomacoes] = useState<AutomacaoLogistica[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedAutomacao, setSelectedAutomacao] = useState<AutomacaoLogistica | null>(null);
  const [renameName, setRenameName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automacaoToDelete, setAutomacaoToDelete] = useState<AutomacaoLogistica | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = (automacao: AutomacaoLogistica) => {
    setAutomacaoToDelete(automacao);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!automacaoToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from("logistica_automacoes")
        .delete()
        .eq("id", automacaoToDelete.id);

      if (error) throw error;
      setAutomacoes(prev => prev.filter(a => a.id !== automacaoToDelete.id));
      toast({ title: "Automação excluída" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAutomacaoToDelete(null);
      setTimeout(() => { document.body.style.pointerEvents = ""; }, 100);
    }
  };

  const handleDuplicate = async (automacao: AutomacaoLogistica) => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await (supabase as any)
        .from("logistica_automacoes")
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: `${automacao.nome} (Cópia)`,
          ativo: false,
          flow_data: automacao.flow_data,
        })
        .select()
        .single();

      if (error) throw error;
      setAutomacoes(prev => [data, ...prev]);
      toast({ title: "Automação duplicada com sucesso" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível duplicar a automação",
        variant: "destructive",
      });
    }
  };

  const handleRename = async () => {
    if (!renameName.trim() || !selectedAutomacao) return;

    setIsRenaming(true);
    try {
      const { error } = await (supabase as any)
        .from("logistica_automacoes")
        .update({ nome: renameName.trim() })
        .eq("id", selectedAutomacao.id);

      if (error) throw error;
      setAutomacoes(prev => prev.map(a => a.id === selectedAutomacao.id ? { ...a, nome: renameName.trim() } : a));
      toast({ title: "Automação renomeada com sucesso" });
      setRenameDialogOpen(false);
      setSelectedAutomacao(null);
      setRenameName("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível renomear a automação",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Automações de Logística</h1>
          <p className="text-sm text-muted-foreground">
            Configure regras automáticas para monitoramento de veículos
          </p>
        </div>
        <Button onClick={onNew} className="w-full sm:w-auto flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <WorkflowCardGrid>
          {automacoes.map((automacao) => (
            <WorkflowCard
              key={automacao.id}
              id={automacao.id}
              title={automacao.nome}
              isActive={automacao.ativo}
              blocksCount={automacao.flow_data?.nodes?.length || 0}
              createdAt={automacao.created_at}
              menuOpen={openMenuId === automacao.id}
              onMenuOpenChange={(open) => setOpenMenuId(open ? automacao.id : null)}
              onEdit={() => {
                setOpenMenuId(null);
                onEdit(automacao.id);
              }}
              onRename={() => {
                setOpenMenuId(null);
                setSelectedAutomacao(automacao);
                setRenameName(automacao.nome);
                setRenameDialogOpen(true);
              }}
              onDuplicate={() => {
                setOpenMenuId(null);
                handleDuplicate(automacao);
              }}
              onToggleActive={() => {
                setOpenMenuId(null);
                toggleAtivo(automacao.id, !automacao.ativo);
              }}
              onDelete={() => {
                setOpenMenuId(null);
                handleDelete(automacao);
              }}
              onOpenEditor={() => onEdit(automacao.id)}
            />
          ))}

          {automacoes.length === 0 && (
            <Card className="col-span-full">
              <div className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhuma automação criada</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie regras automáticas para monitoramento de veículos
                </p>
                <Button onClick={onNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Automação
                </Button>
              </div>
            </Card>
          )}
        </WorkflowCardGrid>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Automação</DialogTitle>
            <DialogDescription>
              Digite um novo nome para a automação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-name">Nome</Label>
              <Input
                id="rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Nome da automação"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !renameName.trim()}>
              {isRenaming ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={automacaoToDelete?.nome}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default function LogisticaAutomacoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialName, setInitialName] = useState<string | undefined>(undefined);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setEditingId(id);
      setView('editor');
    }
  }, [searchParams]);

  const handleNew = () => {
    setCreateName("");
    setCreateDialogOpen(true);
  };

  const handleConfirmCreate = () => {
    if (!createName.trim()) return;
    setEditingId(null);
    setInitialName(createName.trim());
    setView('editor');
    setCreateDialogOpen(false);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setInitialName(undefined);
    setView('editor');
  };

  const handleBack = () => {
    setEditingId(null);
    setInitialName(undefined);
    setView('list');
    setSearchParams({});
  };

  return (
    <ReactFlowProvider>
      {view === 'list' ? (
        <ListContent onEdit={handleEdit} onNew={handleNew} />
      ) : (
        <EditorContent automacaoId={editingId} onBack={handleBack} initialName={initialName} />
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Automação</DialogTitle>
            <DialogDescription>Dê um nome para sua nova automação antes de começar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da automação</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: Alerta de Velocidade"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleConfirmCreate(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button disabled={!createName.trim()} onClick={handleConfirmCreate}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ReactFlowProvider>
  );
}

