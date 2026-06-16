import { FloatingAddBlockButton } from "@/components/workflow/FloatingAddBlockButton";
import { useCallback, useRef, useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { WorkflowBuilderLayout } from "@/components/workflow/WorkflowBuilderLayout";
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
import { AutomacaoFlowNode } from "@/components/automacao-vendas/AutomacaoFlowNode";
import { AutomacaoBlockLibrary } from "@/components/automacao-vendas/AutomacaoBlockLibrary";
import { AutomacaoPropertiesPanel } from "@/components/automacao-vendas/AutomacaoPropertiesPanel";
import { BlockNoteDialog } from "@/components/automacao-vendas/BlockNoteDialog";
import { AUTOMACAO_VENDAS_BLOCKS } from "@/types/automacaoVendas";
import { toast } from "@/hooks/use-toast";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";
import { WorkflowAIGenerator } from "@/components/workflow/WorkflowAIGenerator";
import { WorkflowSimulator } from "@/components/workflow-simulator/WorkflowSimulator";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";

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
  const location = useLocation();
  const regraIdFromUrl = searchParams.get("id");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Captura a URL de origem para retornar ao fechar
  const [originUrl] = useState(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || "/vendas-config?tab=automacao";
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [currentRegraId, setCurrentRegraId] = useState<string | null>(null);
  const [nomeRegra, setNomeRegra] = useState(((location.state as any)?.initialName as string) || "Nova Regra");
  const [descricaoRegra, setDescricaoRegra] = useState<string>(((location.state as any)?.initialDescription as string) || "");

  const [isAtiva, setIsAtiva] = useState(true);
  const [prioridade, setPrioridade] = useState(1);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNoteNodeId, setCurrentNoteNodeId] = useState<string | null>(null);
  const [currentNoteValue, setCurrentNoteValue] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

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
        
        setHasUnsavedChanges(true);
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
    } else {
      // Nova regra: criar bloco inicial automaticamente
      const initialNode: Node = {
        id: getId(),
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
      };
      setNodes([initialNode]);
      setEdges([]);
    }
  }, [regraIdFromUrl, handleDuplicateNode, handleDeleteNode, handleAddNote, setNodes, setEdges]);

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
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges]
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
    const blockDef = AUTOMACAO_VENDAS_BLOCKS.find((b) => b.type === type);
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
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => addEdge(
      connectMenu.handleType === 'source'
        ? { source: connectMenu.fromNodeId, target: newNode.id }
        : { source: newNode.id, target: connectMenu.fromNodeId },
      eds
    ));
    setHasUnsavedChanges(true);
  }, [connectMenu, setNodes, setEdges, handleDuplicateNode, handleDeleteNode, handleAddNote]);

  const smartBlockOptions: SmartBlockOption[] = AUTOMACAO_VENDAS_BLOCKS
    .filter((b: any) => b.type !== 'gatilho_inicio')
    .map((b: any) => ({ type: b.type, label: b.label, description: b.description, category: b.category }));

  const onEdgesDelete = useCallback(
    (_edgesToDelete: Edge[]) => {
      setHasUnsavedChanges(true);
      toast({
        title: "Conexão excluída",
        description: "Conexão removida com sucesso!",
      });
    },
    []
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
      setSelectedNode(null);
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
      setHasUnsavedChanges(true);
      
      toast({
        title: "Bloco adicionado",
        description: `Bloco "${blockDef.label}" adicionado com sucesso!`,
      });
    },
    [reactFlowInstance, setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail?.type;
      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;
      const blockDef = AUTOMACAO_VENDAS_BLOCKS.find((b) => b.type === type);
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
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      setHasUnsavedChanges(true);
      toast({ title: "Bloco adicionado", description: `Bloco "${blockDef.label}" adicionado com sucesso!` });
    };
    window.addEventListener("workflow:add-block", handler);
    return () => window.removeEventListener("workflow:add-block", handler);
  }, [reactFlowInstance, setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdgeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdgeId(null);
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
      setHasUnsavedChanges(true);
    },
    [setNodes, handleDuplicateNode, handleDeleteNode, handleAddNote]
  );

  const handleSave = async () => {
    setIsSaving(true);
    if (!nomeRegra.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um nome para a regra.",
        variant: "destructive",
      });
      setIsSaving(false);
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
      setIsSaving(false);
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
        setIsSaving(false);
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
        setHasUnsavedChanges(false);
      } else {
        const { data, error } = await supabase
          .from("automacoes_vendas")
          .insert([regraData])
          .select()
          .single();

        if (error) throw error;

        setCurrentRegraId(data.id);
        setHasUnsavedChanges(false);
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
    } finally {
      setIsSaving(false);
    }
  };

  useUnsavedChanges("editor-regras", hasUnsavedChanges, async () => { await handleSave(); return !hasUnsavedChanges; }, nomeRegra || "Regra");

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      navigate(originUrl);
    }
  };

  const handleDeleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setHasUnsavedChanges(true);
    toast({
      title: "Conexão excluída",
      description: "Conexão removida com sucesso!",
    });
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    setHasUnsavedChanges(false);
    navigate(originUrl);
  };

  // Zoom handlers
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
      reactFlowInstance.fitView({ 
        padding: 0.2,
        duration: 300,
        maxZoom: 1.2
      });
    }
  }, [reactFlowInstance]);

  const handleToggleLock = useCallback(() => {
    setIsLocked(prev => {
      toast({
        title: !prev ? "Canvas bloqueado" : "Canvas desbloqueado",
        description: !prev ? "O canvas está bloqueado para edição" : "O canvas está desbloqueado para edição",
      });
      return !prev;
    });
  }, []);

  // Rastrear mudanças via snapshot (ignora posições/callbacks)
  const baselineSignatureRef = useRef<string | null>(null);
  const buildSignature = useCallback(() => {
    return JSON.stringify({
      n: nodes.map((n) => ({
        id: n.id,
        type: (n.data as any).type,
        label: (n.data as any).label,
        config: (n.data as any).config,
        note: (n.data as any).note,
      })),
      e: edges.map((e) => ({ s: e.source, t: e.target, sh: e.sourceHandle, th: e.targetHandle })),
      name: nomeRegra,
      ativo: isAtiva,
      prioridade,
    });
  }, [nodes, edges, nomeRegra, isAtiva, prioridade]);

  useEffect(() => {
    const sig = buildSignature();
    // Aguarda a primeira carga de nodes para estabelecer baseline
    if (baselineSignatureRef.current === null) {
      if (nodes.length > 0) {
        baselineSignatureRef.current = sig;
        setHasUnsavedChanges(false);
      }
      return;
    }
    setHasUnsavedChanges(sig !== baselineSignatureRef.current);
  }, [buildSignature, nodes.length]);

  // Reseta baseline após salvar com sucesso
  useEffect(() => {
    if (!hasUnsavedChanges && baselineSignatureRef.current !== null) {
      baselineSignatureRef.current = buildSignature();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaving]);

  return (
    <WorkflowBuilderLayout
      title="Regras para o Orçamento"
      flowName={nomeRegra}
      onFlowNameChange={setNomeRegra}
      onSave={handleSave}
      isSaving={isSaving}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onFitView={handleFitView}
      isLocked={isLocked}
      onToggleLock={handleToggleLock}
      onTest={() => { if (!showSimulator) setSelectedNode(null); setShowSimulator((v) => !v); }}
      showTest={showSimulator}
      isTestActive={showSimulator}
      testLabel="Simular"
      hasUnsavedChanges={hasUnsavedChanges}
      defaultReturnUrl="/vendas-config?tab=automacao"
      aiGeneratorContent={
        <WorkflowAIGenerator
          workflowType="Automação de Vendas"
          blockDefinitions={AUTOMACAO_VENDAS_BLOCKS}
          onGenerated={(newNodes, newEdges) => {
            setNodes(nds => [...nds, ...newNodes]);
            setEdges(eds => [...eds, ...newEdges]);
            setHasUnsavedChanges(true);
          }}
        />
      }
      rightContent={
        <>
          <WorkflowFilesMenu
            nodes={nodes}
            edges={edges}
            selectedNodes={nodes.filter((n) => n.selected)}
            onImport={(n, e) => { setNodes(n as any); setEdges(e as any); }}
            onLoadTemplate={(newNodes, newEdges) => {
              setNodes((nds) => [...nds, ...newNodes]);
              setEdges((eds) => [...eds, ...newEdges]);
            }}
          />
          {selectedEdgeId ? (
            <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm px-2 sm:px-3" onClick={handleDeleteSelectedEdge}>
              <span className="hidden sm:inline">Remover conexão</span>
              <span className="sm:hidden">Remover</span>
            </Button>
          ) : null}
        </>
      }
    >
      {/* Block Library */}
      <AutomacaoBlockLibrary 
        onDragStart={onDragStart}
        isExpanded={isBlockLibraryExpanded}
        onToggleExpanded={setIsBlockLibraryExpanded}
      />

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 bg-muted/20 relative">
        {!isBlockLibraryExpanded && (
          <FloatingAddBlockButton onClick={() => setIsBlockLibraryExpanded(true)} />
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges.map((edge) => ({
            ...edge,
            style: {
              stroke: edge.selected ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
              strokeWidth: edge.selected ? 2.5 : 1.33,
            },
            markerEnd: {
              type: 'arrowclosed',
              width: 20,
              height: 20,
              color: edge.selected ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
            },
            type: 'smoothstep',
          }))}
          onNodesChange={isLocked ? undefined : onNodesChange}
          onEdgesChange={isLocked ? undefined : onEdgesChange}
          onConnect={isLocked ? undefined : onConnect}
          onConnectStart={isLocked ? undefined : onConnectStart}
          onConnectEnd={isLocked ? undefined : onConnectEnd}
          onEdgesDelete={isLocked ? undefined : onEdgesDelete}
          onInit={(instance) => {
            setReactFlowInstance(instance);
            setTimeout(() => {
              instance.fitView({ padding: 0.2, duration: 400, maxZoom: 1.0, minZoom: 0.5 });
            }, 100);
          }}
          onDrop={isLocked ? undefined : onDrop}
          onDragOver={isLocked ? undefined : onDragOver}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.33 }}
          {...boxSelectionProps({ disabled: isLocked })}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={!isLocked}
          onBeforeDelete={async ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
            const filtered = nodesToDelete.filter(n => (n.data as any)?.type !== "iniciar_validacao");
            if (filtered.length === nodesToDelete.length) return true;
            if (filtered.length === 0 && edgesToDelete.length === 0) {
              toast({ title: "Ação não permitida", description: "O bloco inicial não pode ser excluído!", variant: "destructive" });
              return false;
            }
            return { nodes: filtered, edges: edgesToDelete };
          }}
          className="bg-background"
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
            markerEnd: {
              type: 'arrowclosed',
              width: 20,
              height: 20,
              color: 'hsl(var(--primary))',
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
              showInteractive={true}
            />
          <MiniMap 
            className="bg-card border border-border shadow-lg rounded-lg"
            nodeColor="#8B5CF6"
            maskColor="rgba(0, 0, 0, 0.1)"
          />
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

      {/* Properties Panel */}
      {selectedNode && !showSimulator && (
        <AutomacaoPropertiesPanel
          node={selectedNode}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Simulator Panel */}
      {showSimulator && (
        <WorkflowSimulator
          open={showSimulator}
          onClose={() => setShowSimulator(false)}
          nodes={nodes}
          edges={edges}
          kind="automacao-vendas"
          blockDefinitions={AUTOMACAO_VENDAS_BLOCKS}
        />
      )}

      {/* Dialog de nota */}
      <BlockNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        currentNote={currentNoteValue}
        onSave={handleSaveNote}
      />

      {/* Dialog de confirmação de saída */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar mudanças?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Se sair agora, essas alterações serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive hover:bg-destructive/90">
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkflowBuilderLayout>
  );
}

export default function EditorRegras() {
  return (
    <ReactFlowProvider>
      <EditorRegrasContent />
    </ReactFlowProvider>
  );
}
