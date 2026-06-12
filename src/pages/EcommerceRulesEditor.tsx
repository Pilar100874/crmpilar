import { useCallback, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
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
import { FlowTemplateManager } from "@/components/flow/FlowTemplateManager";
import { FlowExportImportGeneric } from "@/components/flow/FlowExportImportGeneric";
import { boxSelectionProps } from "@/lib/flowSelection";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { EcommerceFlowNode } from "@/components/ecommerce-rules/EcommerceFlowNode";
import { EcommerceBlockLibrary } from "@/components/ecommerce-rules/EcommerceBlockLibrary";
import { EcommercePropertiesPanel } from "@/components/ecommerce-rules/EcommercePropertiesPanel";
import { BlockNoteDialog } from "@/components/automacao-vendas/BlockNoteDialog";
import { ECOMMERCE_RULE_BLOCKS } from "@/types/ecommerceRules";
import { WorkflowBuilderLayout } from "@/components/workflow/WorkflowBuilderLayout";
import { WorkflowSimulator } from "@/components/workflow-simulator/WorkflowSimulator";
import { toast } from "@/hooks/use-toast";
import type { EcommerceRuleBlockType } from "@/types/ecommerceRules";
import { WorkflowAIGenerator } from "@/components/workflow/WorkflowAIGenerator";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";

const nodeTypes = { custom: EcommerceFlowNode };

let id = 0;
const getId = () => `ecom_node_${Date.now()}_${id++}_${Math.floor(Math.random() * 10000)}`;

function EcommerceRulesEditorInner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const ruleId = searchParams.get("id");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState("Nova Regra E-commerce");
  const [isSaving, setIsSaving] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ nodeId: string; note: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const savedSnapshotRef = useRef<string>("");

  // Build a snapshot of meaningful data (excludes positions and callbacks)
  const buildDataSnapshot = useCallback((n: Node[], e: Edge[]) => {
    const nodesData = n.map(nd => ({
      id: nd.id,
      type: (nd.data as any).type,
      label: (nd.data as any).label,
      config: (nd.data as any).config,
      note: (nd.data as any).note,
    }));
    const edgesData = e.map(ed => ({ source: ed.source, target: ed.target, sourceHandle: ed.sourceHandle, targetHandle: ed.targetHandle }));
    return JSON.stringify({ nodes: nodesData, edges: edgesData });
  }, []);

  // Compare current data against saved snapshot
  useEffect(() => {
    if (!savedSnapshotRef.current) return; // skip until first load/save
    const current = buildDataSnapshot(nodes, edges);
    setHasUnsavedChanges(current !== savedSnapshotRef.current);
  }, [nodes, edges, buildDataSnapshot]);

  useEffect(() => {
    if (ruleId) loadRule(ruleId);
    else createStartNode();
  }, [ruleId]);

  const createStartNode = () => {
    const startBlock = ECOMMERCE_RULE_BLOCKS.find(b => b.type === "inicio_regra")!;
    const initialNodes = [{
      id: "start_node",
      type: "custom",
      position: { x: 400, y: 50 },
      data: { type: "inicio_regra", label: startBlock.label, config: {} },
    }];
    setNodes(initialNodes);
    // Set snapshot after a tick so state is settled
    setTimeout(() => { savedSnapshotRef.current = buildDataSnapshot(initialNodes, []); }, 0);
  };

  const loadRule = async (id: string) => {
    const { data, error } = await supabase.from("ecommerce_rules").select("*").eq("id", id).single();
    if (error || !data) { toast({ title: "Erro", description: "Regra não encontrada", variant: "destructive" }); return; }
    setFlowName(data.nome);
    const flowData = data.flow_data as any;
    if (flowData?.nodes) {
      const loadedNodes = flowData.nodes.map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          onDelete: handleDeleteNode,
          onDuplicate: handleDuplicateNode,
          onAddNote: handleOpenNoteDialog,
        },
      }));
      const loadedEdges = flowData.edges || [];
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setTimeout(() => { savedSnapshotRef.current = buildDataSnapshot(loadedNodes, loadedEdges); }, 0);
    }
    setHasUnsavedChanges(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) throw new Error("Estabelecimento não encontrado");

      const cleanNodes = nodes.map(n => ({
        id: n.id, type: n.type, position: n.position,
        data: { type: (n.data as any).type, label: (n.data as any).label, config: (n.data as any).config || {}, note: (n.data as any).note },
      }));

      // Auto-detect category from action blocks using block definitions
      const actionTypes = cleanNodes.map(n => n.data.type).filter(t => t.startsWith("acao_"));
      const blockCategoryMap: Record<string, string> = {};
      ECOMMERCE_RULE_BLOCKS.forEach(b => { blockCategoryMap[b.type] = b.category; });
      const actionCategories = actionTypes.map(t => blockCategoryMap[t]).filter(Boolean);
      let categoria = "desconto"; // default
      if (actionCategories.includes("acao_propaganda")) categoria = "propaganda";
      else if (actionCategories.includes("acao_frete")) categoria = "frete";
      else if (actionCategories.includes("acao_pagamento")) categoria = "pagamento";
      else if (actionCategories.includes("acao_desconto")) categoria = "desconto";

      const payload = {
        estabelecimento_id: estabelecimentoId,
        nome: flowName,
        flow_data: { nodes: cleanNodes, edges } as any,
        descricao: `Regra com ${cleanNodes.length} blocos`,
        categoria,
      };

      if (ruleId) {
        const { error } = await supabase.from("ecommerce_rules").update(payload).eq("id", ruleId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase.from("ecommerce_rules").insert(payload).select().single();
        if (error) throw new Error(error.message);
        if (data) navigate(`/ecommerce-rules-editor?id=${data.id}`, { replace: true });
      }
      toast({ title: "Salvo!", description: "Regra salva com sucesso." });
      savedSnapshotRef.current = buildDataSnapshot(nodes, edges);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  useUnsavedChanges("ecommerce-rules", hasUnsavedChanges, async () => { await handleSave(); return !hasUnsavedChanges; }, flowName || "Regra");



  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, animated: true, style: { strokeWidth: 2 } }, eds));
  }, [setEdges]);

  // ===== Smart connect =====
  const connectStartRef = useRef<{ nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' } | null>(null);
  const [connectMenu, setConnectMenu] = useState<null | { x: number; y: number; flowX: number; flowY: number; fromNodeId: string; handleType: 'source' | 'target' }>(null);

  const onConnectStart = useCallback((_: any, params: any) => {
    connectStartRef.current = { nodeId: params.nodeId, handleId: params.handleId, handleType: params.handleType };
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
    const blockDef = ECOMMERCE_RULE_BLOCKS.find(b => b.type === type);
    if (!blockDef) return;
    const newNode: Node = {
      id: getId(),
      type: 'custom',
      position: { x: connectMenu.flowX - 100, y: connectMenu.flowY - 40 },
      data: {
        type,
        label: blockDef.label,
        config: blockDef.defaultData ? { ...blockDef.defaultData } : {},
        onDelete: handleDeleteNode,
        onDuplicate: handleDuplicateNode,
        onAddNote: handleOpenNoteDialog,
      },
    };
    setNodes(nds => nds.concat(newNode));
    setEdges(eds => addEdge(
      connectMenu.handleType === 'source'
        ? { source: connectMenu.fromNodeId, target: newNode.id, animated: true, style: { strokeWidth: 2 } }
        : { source: newNode.id, target: connectMenu.fromNodeId, animated: true, style: { strokeWidth: 2 } },
      eds
    ));
  }, [connectMenu, setNodes, setEdges]);

  const smartBlockOptions: SmartBlockOption[] = ECOMMERCE_RULE_BLOCKS
    .filter((b: any) => b.type !== 'inicio_regra')
    .map((b: any) => ({ type: b.type, label: b.label, description: b.description, category: b.category }));

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/reactflow") as EcommerceRuleBlockType;
    if (!type || !reactFlowInstance) return;

    const blockDef = ECOMMERCE_RULE_BLOCKS.find(b => b.type === type);
    if (!blockDef) return;

    const position = reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newNode: Node = {
      id: getId(),
      type: "custom",
      position,
      data: {
        type,
        label: blockDef.label,
        config: blockDef.defaultData ? { ...blockDef.defaultData } : {},
        onDelete: handleDeleteNode,
        onDuplicate: handleDuplicateNode,
        onAddNote: handleOpenNoteDialog,
      },
    };
    setNodes(nds => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail?.type as EcommerceRuleBlockType;
      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;
      const blockDef = ECOMMERCE_RULE_BLOCKS.find(b => b.type === type);
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
          type,
          label: blockDef.label,
          config: blockDef.defaultData ? { ...blockDef.defaultData } : {},
          onDelete: handleDeleteNode,
          onDuplicate: handleDuplicateNode,
          onAddNote: handleOpenNoteDialog,
        },
      };
      setNodes(nds => nds.concat(newNode));
    };
    window.addEventListener("workflow:add-block", handler);
    return () => window.removeEventListener("workflow:add-block", handler);
  }, [reactFlowInstance, setNodes]);

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDeleteNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && (node.data as any).type === "inicio_regra") {
      toast({ title: "Ação não permitida", description: "O bloco inicial não pode ser excluído!", variant: "destructive" });
      return;
    }
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  }, [nodes, setNodes, setEdges, selectedNode]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const original = nodes.find(n => n.id === nodeId);
    if (!original) return;
    const newNode: Node = {
      id: getId(),
      type: original.type,
      position: { x: original.position.x + 40, y: original.position.y + 40 },
      data: {
        ...(original.data as any),
        onDelete: handleDeleteNode,
        onDuplicate: handleDuplicateNode,
        onAddNote: handleOpenNoteDialog,
      },
    };
    setNodes(nds => nds.concat(newNode));
  }, [nodes, setNodes]);

  const handleOpenNoteDialog = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) setNoteDialog({ nodeId, note: (node.data as any).note || "" });
  }, [nodes]);

  const handleSaveNote = (nodeId: string, note: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, note } } : n));
    setNoteDialog(null);
  };

  const handleNodeClick = useCallback((_: any, node: Node) => {
    if ((node.data as any).type !== "inicio_regra") setSelectedNode(node);
  }, []);

  const handleUpdateNodeData = (nodeId: string, data: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...data, onDelete: handleDeleteNode, onDuplicate: handleDuplicateNode, onAddNote: handleOpenNoteDialog } } : n));
  };

  const returnUrl = (location.state as any)?.from || "/ecommerce-rules";

  return (
    <WorkflowBuilderLayout
      title="Editor de Regras E-commerce"
      subtitle="Arraste blocos para construir regras de negócio"
      flowName={flowName}
      onFlowNameChange={setFlowName}
      onSave={handleSave}
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      defaultReturnUrl={returnUrl}
      onZoomIn={() => reactFlowInstance?.zoomIn()}
      onZoomOut={() => reactFlowInstance?.zoomOut()}
      onFitView={() => reactFlowInstance?.fitView()}
      onAddBlock={() => setIsLibraryExpanded(!isLibraryExpanded)}
      onTest={() => { if (!showSimulator) setSelectedNode(null); setShowSimulator((v) => !v); }}
      showTest={showSimulator}
      isTestActive={showSimulator}
      testLabel="Simular"
      aiGeneratorContent={
        <WorkflowAIGenerator
          workflowType="Regras do E-commerce"
          blockDefinitions={ECOMMERCE_RULE_BLOCKS}
          onGenerated={(newNodes, newEdges) => {
            setNodes(nds => [...nds, ...newNodes]);
            setEdges(eds => [...eds, ...newEdges]);
            setHasUnsavedChanges(true);
          }}
        />
      }
    >
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Block Library - Left Panel */}
        {isLibraryExpanded && (
          <EcommerceBlockLibrary
            onDragStart={handleDragStart}
            isExpanded={isLibraryExpanded}
            onToggleExpanded={setIsLibraryExpanded}
          />
        )}

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 h-full relative">
          {!isLibraryExpanded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLibraryExpanded(true)}
              className="absolute left-4 top-4 z-10 shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Blocos
            </Button>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onInit={(instance) => {
              setReactFlowInstance(instance);
              setTimeout(() => {
                instance.fitView({ padding: 0.2, duration: 400, maxZoom: 1.0, minZoom: 0.5 });
              }, 100);
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
            {...boxSelectionProps()}
            onBeforeDelete={async ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
              const filtered = nodesToDelete.filter(n => (n.data as any)?.type !== "inicio_regra");
              if (filtered.length === nodesToDelete.length) return true;
              if (filtered.length === 0 && edgesToDelete.length === 0) {
                toast({ title: "Ação não permitida", description: "O bloco inicial não pode ser excluído!", variant: "destructive" });
                return false;
              }
              return { nodes: filtered, edges: edgesToDelete };
            }}
            className="bg-muted/30"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-muted/20" />
            <Controls className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent" />
            <MiniMap zoomable pannable className="!bg-card !border-border !shadow-lg" />
            <Panel position="top-right" className="!m-2 flex gap-1.5 bg-card/95 backdrop-blur border border-border rounded-lg p-1 shadow-lg">
              <FlowExportImportGeneric
                nodes={nodes}
                edges={edges}
                onImport={(n, e) => {
                  setNodes(n as any);
                  setEdges(e as any);
                }}
              />
              <FlowTemplateManager
                nodes={nodes}
                edges={edges}
                selectedNodes={nodes.filter((n) => n.selected)}
                onLoadTemplate={(newNodes, newEdges) => {
                  setNodes((nds) => [...nds, ...newNodes]);
                  setEdges((eds) => [...eds, ...newEdges]);
                }}
              />
            </Panel>
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

        {/* Properties Panel - Right */}
        {selectedNode && !showSimulator && (
          <div className="w-80 border-l border-border bg-card overflow-auto">
            <EcommercePropertiesPanel
              node={selectedNode}
              onUpdate={handleUpdateNodeData}
              onDelete={handleDeleteNode}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}

        {/* Simulator Panel - Right */}
        {showSimulator && (
          <WorkflowSimulator
            open={showSimulator}
            onClose={() => setShowSimulator(false)}
            nodes={nodes}
            edges={edges}
            kind="ecommerce"
            blockDefinitions={ECOMMERCE_RULE_BLOCKS}
          />
        )}
      </div>

      {noteDialog && (
        <BlockNoteDialog
          open={!!noteDialog}
          onOpenChange={(open) => { if (!open) setNoteDialog(null); }}
          currentNote={noteDialog.note}
          onSave={(note: string) => handleSaveNote(noteDialog.nodeId, note)}
        />
      )}
    </WorkflowBuilderLayout>
  );
}

export default function EcommerceRulesEditor() {
  return (
    <ReactFlowProvider>
      <EcommerceRulesEditorInner />
    </ReactFlowProvider>
  );
}
