import { FloatingAddBlockButton } from "@/components/workflow/FloatingAddBlockButton";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { toast } from "sonner";
import { isSingleEdgePerHandleAllowed, SINGLE_OUTPUT_TOAST } from "@/lib/flow-edge-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowCard, WorkflowCardGrid } from "@/components/ui/workflow-card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { 
  Plus, Play, Trash2, Edit, Zap, Loader2, Save, 
  ZoomIn, ZoomOut, Maximize2, X, Blocks, Minimize2, Copy
} from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { AdsAutomationTemplates } from "@/components/ads/AdsAutomationTemplates";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowFilesMenu } from "@/components/workflow/WorkflowFilesMenu";
import { boxSelectionProps } from "@/lib/flowSelection";
import { AdsFlowNode } from "@/components/ads-automation/AdsFlowNode";
import { AdsBlockLibrary } from "@/components/ads-automation/AdsBlockLibrary";
import { AdsPropertiesPanel } from "@/components/ads-automation/AdsPropertiesPanel";
import { BlockNoteDialog } from "@/components/omnichannel-builder/BlockNoteDialog";
import { ADS_BLOCK_DEFINITIONS, AdsFlowNodeData } from "@/types/adsFlow";
import { WorkflowAIGenerator } from "@/components/workflow/WorkflowAIGenerator";
import { WorkflowSimulator } from "@/components/workflow-simulator/WorkflowSimulator";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";
import { WorkflowBuilderLayout } from "@/components/workflow/WorkflowBuilderLayout";

const nodeTypes = {
  custom: AdsFlowNode,
};

let nodeIdCounter = 0;
const generateNodeId = () => `ads_node_${Date.now()}_${nodeIdCounter++}`;

function AdsAutomationContent() {
  const queryClient = useQueryClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newAutomation, setNewAutomation] = useState({ nome: "", descricao: "" });
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const baselineSignatureRef = useRef<string | null>(null);
  const buildSignature = useCallback(() => {
    return JSON.stringify({
      n: nodes.map((n: any) => ({
        id: n.id,
        type: (n.data as any)?.type,
        label: (n.data as any)?.label,
        config: (n.data as any)?.config,
        note: (n.data as any)?.note,
      })),
      e: edges.map((e: any) => ({ s: e.source, t: e.target, sh: e.sourceHandle, th: e.targetHandle })),
    });
  }, [nodes, edges]);
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
  const [isSaving, setIsSaving] = useState(false);
  
  // Note dialog state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNoteNodeId, setCurrentNoteNodeId] = useState<string | null>(null);
  const [currentNoteValue, setCurrentNoteValue] = useState("");

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameAutomation, setRenameAutomation] = useState<any>(null);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<any>(null);

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const { data: automations, isLoading } = useQuery({
    queryKey: ["ads_automacoes", estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from("ads_automacoes")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const createAutomationMutation = useMutation({
    mutationFn: async () => {
      if (!estabelecimentoId) throw new Error("Estabelecimento não encontrado");
      
      const { data, error } = await supabase
        .from("ads_automacoes")
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: newAutomation.nome,
          descricao: newAutomation.descricao,
          flow_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
          ativo: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] });
      setShowCreateDialog(false);
      setNewAutomation({ nome: "", descricao: "" });
      loadAutomation(data);
      toast.success("Automação criada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar automação: " + error.message);
    },
  });

  const updateAutomationMutation = useMutation({
    mutationFn: async (data: { id: string; flow_data?: any; ativo?: boolean; nome?: string; descricao?: string }) => {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (data.flow_data !== undefined) updateData.flow_data = data.flow_data;
      if (data.ativo !== undefined) updateData.ativo = data.ativo;
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      
      const { error } = await supabase
        .from("ads_automacoes")
        .update(updateData)
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] });
      baselineSignatureRef.current = buildSignature();
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads_automacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] });
      setSelectedAutomation(null);
      setIsEditing(false);
      toast.success("Automação removida");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const duplicateAutomationMutation = useMutation({
    mutationFn: async (automation: any) => {
      if (!estabelecimentoId) throw new Error("Estabelecimento não encontrado");
      
      const { data, error } = await supabase
        .from("ads_automacoes")
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: `${automation.nome} (Cópia)`,
          descricao: automation.descricao,
          flow_data: automation.flow_data,
          ativo: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] });
      toast.success("Automação duplicada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao duplicar: " + error.message);
    },
  });

  const renameAutomationMutation = useMutation({
    mutationFn: async (data: { id: string; nome: string; descricao: string }) => {
      const { error } = await supabase
        .from("ads_automacoes")
        .update({ nome: data.nome, descricao: data.descricao, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] });
      toast.success("Automação renomeada com sucesso");
      setRenameDialogOpen(false);
      setRenameAutomation(null);
      setRenameName("");
      setRenameDescription("");
    },
    onError: (error: any) => {
      toast.error("Erro ao renomear: " + error.message);
    },
  });

  const isValidConnection = useCallback(
    (conn: Connection) => isSingleEdgePerHandleAllowed(conn, edges),
    [edges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!isSingleEdgePerHandleAllowed(params, edges)) {
        toast.error(SINGLE_OUTPUT_TOAST);
        return;
      }
      setEdges((eds) => addEdge(params, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges, edges]
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
    if (start.handleType === 'source' && !isSingleEdgePerHandleAllowed({ source: start.nodeId, sourceHandle: null } as any, edges)) {
      toast.error(SINGLE_OUTPUT_TOAST);
      return;
    }
    const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX;
    const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY;
    if (clientX == null) return;
    const flowPos = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
    setConnectMenu({ x: clientX, y: clientY, flowX: flowPos.x, flowY: flowPos.y, fromNodeId: start.nodeId, handleType: start.handleType });
  }, [reactFlowInstance, edges]);

  const onEdgesDelete = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const loadAutomation = (automation: any) => {
    setSelectedAutomation(automation);
    const flowData = automation.flow_data || { nodes: [], edges: [] };
    
    // Add callbacks to nodes
    const nodesWithCallbacks = (flowData.nodes || []).map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        onSetBreakpoint: handleSetBreakpoint,
        onSetSkip: handleSetSkip,
        onDuplicate: handleDuplicate,
        onDelete: handleDeleteNode,
        onClearDebug: handleClearDebug,
        onAddNote: handleAddNote,
        onToggleCollapse: handleToggleCollapse,
      }
    }));
    
    baselineSignatureRef.current = null; // re-baselina após carregar
    setNodes(nodesWithCallbacks);
    setEdges(flowData.edges || []);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setSelectedNode(null);
  };

  const handleSave = useCallback(async () => {
    if (!selectedAutomation) return;
    setIsSaving(true);
    
    try {
      const flowData = {
        nodes: nodes.map(n => ({
          ...n,
          data: {
            label: (n.data as any).label,
            type: (n.data as any).type,
            config: (n.data as any).config,
            note: (n.data as any).note,
            isBreakpoint: (n.data as any).isBreakpoint,
            isSkipped: (n.data as any).isSkipped,
            isCollapsed: (n.data as any).isCollapsed,
          }
        })),
        edges,
        viewport: reactFlowInstance?.getViewport(),
      };

      await updateAutomationMutation.mutateAsync({
        id: selectedAutomation.id,
        flow_data: flowData,
      });
      
      toast.success("Automação salva com sucesso!");
    } finally {
      setIsSaving(false);
    }
  }, [selectedAutomation, nodes, edges, reactFlowInstance, updateAutomationMutation]);

  useUnsavedChanges("ads-automation", hasUnsavedChanges, async () => { await handleSave(); return true; }, selectedAutomation?.nome || "Automação");



  const handleSetBreakpoint = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, isBreakpoint: !(node.data as any).isBreakpoint } }
          : node
      )
    );
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const handleSetSkip = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, isSkipped: !(node.data as any).isSkipped } }
          : node
      )
    );
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const handleClearDebug = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, isBreakpoint: false, isSkipped: false } }
          : node
      )
    );
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const handleDuplicate = useCallback((nodeId: string) => {
    const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
    if (!nodeToDuplicate) return;

    const newNode: Node = {
      ...nodeToDuplicate,
      id: generateNodeId(),
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50,
      },
      data: {
        ...nodeToDuplicate.data,
        onSetBreakpoint: handleSetBreakpoint,
        onSetSkip: handleSetSkip,
        onDuplicate: handleDuplicate,
        onDelete: handleDeleteNode,
        onClearDebug: handleClearDebug,
        onAddNote: handleAddNote,
        onToggleCollapse: handleToggleCollapse,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    toast.success("Bloco duplicado!");
    setHasUnsavedChanges(true);
  }, [nodes, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    toast.success("Bloco excluído!");
    setHasUnsavedChanges(true);
  }, [setNodes, setEdges]);

  const handleAddNote = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setCurrentNoteNodeId(nodeId);
    setCurrentNoteValue((node.data as any).note || "");
    setNoteDialogOpen(true);
  }, [nodes]);

  const handleSaveNote = useCallback((note: string) => {
    if (!currentNoteNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === currentNoteNodeId
          ? { ...n, data: { ...n.data, note } }
          : n
      )
    );
    toast.success(note ? "Nota adicionada!" : "Nota removida!");
    setCurrentNoteNodeId(null);
    setHasUnsavedChanges(true);
  }, [currentNoteNodeId, setNodes]);

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
    toast.success("Todos os blocos encolhidos");
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const handleExpandAll = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({ ...node, data: { ...node.data, isCollapsed: false } }))
    );
    toast.success("Todos os blocos ampliados");
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const handleUpdateNode = useCallback((nodeId: string, data: Partial<AdsFlowNodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
                config: {
                  ...(node.data as any).config,
                  ...data.config,
                },
              },
            }
          : node
      )
    );
    setHasUnsavedChanges(true);
  }, [setNodes]);

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

      const blockDef = ADS_BLOCK_DEFINITIONS.find((b) => b.type === type);
      if (!blockDef) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: generateNodeId(),
        type: "custom",
        position,
        data: {
          label: blockDef.label,
          type: blockDef.type,
          config: JSON.parse(JSON.stringify(blockDef.defaultData || {})),
          onSetBreakpoint: handleSetBreakpoint,
          onSetSkip: handleSetSkip,
          onDuplicate: handleDuplicate,
          onDelete: handleDeleteNode,
          onClearDebug: handleClearDebug,
          onAddNote: handleAddNote,
          onToggleCollapse: handleToggleCollapse,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      toast.success(`Bloco "${blockDef.label}" adicionado!`);
      setHasUnsavedChanges(true);
    },
    [reactFlowInstance, setNodes, handleSetBreakpoint, handleSetSkip, handleDuplicate, handleDeleteNode, handleClearDebug, handleAddNote, handleToggleCollapse]
  );

  const handleSmartPick = useCallback((type: string) => {
    if (!connectMenu) return;
    const blockDef = ADS_BLOCK_DEFINITIONS.find((b) => b.type === type);
    if (!blockDef) return;
    const newNode: Node = {
      id: generateNodeId(),
      type: 'custom',
      position: { x: connectMenu.flowX - 100, y: connectMenu.flowY - 40 },
      data: {
        label: blockDef.label,
        type: blockDef.type,
        config: JSON.parse(JSON.stringify(blockDef.defaultData || {})),
        onSetBreakpoint: handleSetBreakpoint,
        onSetSkip: handleSetSkip,
        onDuplicate: handleDuplicate,
        onDelete: handleDeleteNode,
        onClearDebug: handleClearDebug,
        onAddNote: handleAddNote,
        onToggleCollapse: handleToggleCollapse,
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
    toast.success(`Bloco "${blockDef.label}" adicionado!`);
  }, [connectMenu, setNodes, setEdges, handleSetBreakpoint, handleSetSkip, handleDuplicate, handleDeleteNode, handleClearDebug, handleAddNote, handleToggleCollapse]);

  const smartBlockOptions: SmartBlockOption[] = ADS_BLOCK_DEFINITIONS
    .filter((b: any) => b.type !== 'campaign_trigger' && b.type !== 'trigger')
    .map((b: any) => ({ type: b.type, label: b.label, description: b.description, category: b.category }));


  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail?.type;
      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;
      const blockDef = ADS_BLOCK_DEFINITIONS.find((b) => b.type === type);
      if (!blockDef) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
      const newNode: Node = {
        id: generateNodeId(),
        type: "custom",
        position,
        data: {
          label: blockDef.label,
          type: blockDef.type,
          config: JSON.parse(JSON.stringify(blockDef.defaultData || {})),
          onSetBreakpoint: handleSetBreakpoint,
          onSetSkip: handleSetSkip,
          onDuplicate: handleDuplicate,
          onDelete: handleDeleteNode,
          onClearDebug: handleClearDebug,
          onAddNote: handleAddNote,
          onToggleCollapse: handleToggleCollapse,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      setHasUnsavedChanges(true);
      toast.success(`Bloco "${blockDef.label}" adicionado!`);
    };
    window.addEventListener("workflow:add-block", handler);
    return () => window.removeEventListener("workflow:add-block", handler);
  }, [reactFlowInstance, setNodes, handleSetBreakpoint, handleSetSkip, handleDuplicate, handleDeleteNode, handleClearDebug, handleAddNote, handleToggleCollapse]);

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

  const handleExport = useCallback(() => {
    const flowData = {
      nodes: nodes.map(n => ({
        ...n,
        data: {
          label: (n.data as any).label,
          type: (n.data as any).type,
          config: (n.data as any).config,
          note: (n.data as any).note,
        }
      })),
      edges,
      viewport: reactFlowInstance?.getViewport(),
    };
    const dataStr = JSON.stringify(flowData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ads-automation-${selectedAutomation?.nome || 'flow'}-${Date.now()}.json`;
    link.click();
    toast.success("Fluxo exportado!");
  }, [nodes, edges, reactFlowInstance, selectedAutomation]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const flow = JSON.parse(event.target?.result as string);
          const nodesWithCallbacks = (flow.nodes || []).map((node: any) => ({
            ...node,
            id: generateNodeId(),
            data: {
              ...node.data,
              onSetBreakpoint: handleSetBreakpoint,
              onSetSkip: handleSetSkip,
              onDuplicate: handleDuplicate,
              onDelete: handleDeleteNode,
              onClearDebug: handleClearDebug,
              onAddNote: handleAddNote,
              onToggleCollapse: handleToggleCollapse,
            }
          }));
          setNodes(nodesWithCallbacks);
          setEdges(flow.edges || []);
          if (flow.viewport && reactFlowInstance) {
            reactFlowInstance.setViewport(flow.viewport);
          }
          toast.success("Fluxo importado!");
          setHasUnsavedChanges(true);
        } catch (error) {
          toast.error("Erro ao importar fluxo. Verifique o arquivo.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges, reactFlowInstance, handleSetBreakpoint, handleSetSkip, handleDuplicate, handleDeleteNode, handleClearDebug, handleAddNote, handleToggleCollapse]);

  const styledEdges = useMemo(() => edges.map((edge) => ({
    ...edge,
    style: {
      stroke: edge.selected ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
      strokeWidth: edge.selected ? 2.5 : 1.33,
    },
    markerEnd: {
      type: 'arrowclosed' as any,
      width: 20,
      height: 20,
      color: edge.selected ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
    },
    type: 'smoothstep',
  })), [edges]);

  return (
    <div className="min-h-screen bg-background">
      {!isEditing ? (
        <div className="p-3 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                  Automações de Anúncios
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie regras automáticas para gerenciar seus anúncios
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdsAutomationTemplates onCreated={() => queryClient.invalidateQueries({ queryKey: ["ads_automacoes"] })} />
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 flex-shrink-0">
                      <Plus className="h-4 w-4" />
                      Nova Automação
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Automação</DialogTitle>
                    <DialogDescription>Crie uma nova regra de automação</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        placeholder="Ex: Pausar campanhas com ROAS baixo"
                        value={newAutomation.nome}
                        onChange={(e) => setNewAutomation(prev => ({ ...prev, nome: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        placeholder="Descreva o que esta automação faz..."
                        value={newAutomation.descricao}
                        onChange={(e) => setNewAutomation(prev => ({ ...prev, descricao: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
                    <Button
                      onClick={() => createAutomationMutation.mutate()}
                      disabled={!newAutomation.nome || createAutomationMutation.isPending}
                    >
                      {createAutomationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Criar
                    </Button>
                  </div>
                </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Lista de automações */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <WorkflowCardGrid>
                {automations?.map(automation => (
                  <WorkflowCard
                    key={automation.id}
                    id={automation.id}
                    title={automation.nome}
                    description={automation.descricao}
                    isActive={automation.ativo}
                    blocksCount={(automation.flow_data as any)?.nodes?.length || 0}
                    menuOpen={openMenuId === automation.id}
                    onMenuOpenChange={(open) => setOpenMenuId(open ? automation.id : null)}
                    onEdit={() => { setOpenMenuId(null); loadAutomation(automation); }}
                    onRename={() => {
                      setOpenMenuId(null);
                      setRenameAutomation(automation);
                      setRenameName(automation.nome);
                      setRenameDescription(automation.descricao || "");
                      setRenameDialogOpen(true);
                    }}
                    onDuplicate={() => { setOpenMenuId(null); duplicateAutomationMutation.mutate(automation); }}
                    onToggleActive={() => { setOpenMenuId(null); updateAutomationMutation.mutate({ id: automation.id, ativo: !automation.ativo }); }}
                    onDelete={() => { setOpenMenuId(null); setAutomationToDelete(automation); setDeleteDialogOpen(true); }}
                    onOpenEditor={() => loadAutomation(automation)}
                  />
                ))}

                {automations?.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Nenhuma automação criada</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Crie regras para automatizar a gestão dos seus anúncios
                      </p>
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Automação
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </WorkflowCardGrid>
            )}
          </div>
        </div>
      ) : (
        <WorkflowBuilderLayout
          title="Automação de Ads"
          subtitle="Gerencie campanhas publicitárias automatizadas"
          flowName={selectedAutomation?.nome || 'Automação de Anúncios'}
          onSave={handleSave}
          isSaving={isSaving}
          onTest={() => { if (!showSimulator) setSelectedNode(null); setShowSimulator((v) => !v); }}
          showTest={showSimulator}
          testLabel="Simular"
          isTestActive={showSimulator}
          onZoomIn={() => reactFlowInstance?.zoomIn({ duration: 200 })}
          onZoomOut={() => reactFlowInstance?.zoomOut({ duration: 200 })}
          onFitView={() => reactFlowInstance?.fitView({ duration: 300, padding: 0.2 })}
          hasUnsavedChanges={hasUnsavedChanges}
          onClose={() => { setIsEditing(false); setSelectedAutomation(null); }}
          aiGeneratorContent={
            <WorkflowAIGenerator
              workflowType="Automação de Ads"
              blockDefinitions={ADS_BLOCK_DEFINITIONS}
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
              }}
            />
          }
        >
            {/* Block Library */}
            <AdsBlockLibrary
              onDragStart={onDragStart}
              isExpanded={isBlockLibraryExpanded}
              onToggleExpanded={setIsBlockLibraryExpanded}
            />

            {/* Canvas */}
            <div className="flex-1 relative" ref={reactFlowWrapper}>
              {!isBlockLibraryExpanded && (
                <FloatingAddBlockButton onClick={() => setIsBlockLibraryExpanded(true)} />
              )}
              <ReactFlow
                nodes={nodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
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
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                className="bg-background"
                {...boxSelectionProps()}
                connectOnClick={false}
                autoPanOnConnect={false}
                autoPanOnNodeDrag={true}
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
                  nodeColor={(node) => {
                    const data = node.data as any;
                    const blockDef = ADS_BLOCK_DEFINITIONS.find(b => b.type === data?.type);
                    return blockDef?.color || '#06b6d4';
                  }}
                  className="bg-card border border-border rounded-lg shadow-lg"
                  maskColor="rgba(255, 255, 255, 0.8)"
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
              <AdsPropertiesPanel
                selectedNode={selectedNode}
                onUpdateNode={handleUpdateNode}
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
                kind="ads"
                blockDefinitions={ADS_BLOCK_DEFINITIONS as any}
              />
            )}
        </WorkflowBuilderLayout>
      )}

      {/* Note Dialog */}
      <BlockNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        currentNote={currentNoteValue}
        onSave={handleSaveNote}
      />

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Automação</DialogTitle>
            <DialogDescription>Digite um novo nome para a automação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} placeholder="Nome da automação" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={renameDescription} onChange={(e) => setRenameDescription(e.target.value)} placeholder="Descrição" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => renameAutomation && renameAutomationMutation.mutate({ id: renameAutomation.id, nome: renameName, descricao: renameDescription })} disabled={!renameName.trim() || renameAutomationMutation.isPending}>
              {renameAutomationMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (!automationToDelete) return;
          deleteAutomationMutation.mutate(automationToDelete.id, {
            onSettled: () => {
              setDeleteDialogOpen(false);
              setAutomationToDelete(null);
              setTimeout(() => { document.body.style.pointerEvents = ""; }, 100);
            },
          });
        }}
        itemName={automationToDelete?.nome}
        isLoading={deleteAutomationMutation.isPending}
      />
    </div>
  );
}

export default function AdsAutomation() {
  return (
    <ReactFlowProvider>
      <AdsAutomationContent />
    </ReactFlowProvider>
  );
}
