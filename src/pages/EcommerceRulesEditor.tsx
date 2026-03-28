import { useCallback, useRef, useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
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
import { toast } from "@/hooks/use-toast";
import type { EcommerceRuleBlockType } from "@/types/ecommerceRules";
import { WorkflowAIGenerator } from "@/components/workflow/WorkflowAIGenerator";

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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ nodeId: string; note: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  useEffect(() => {
    if (ruleId) loadRule(ruleId);
    else createStartNode();
  }, [ruleId]);

  useEffect(() => { setHasUnsavedChanges(true); }, [nodes, edges]);

  const createStartNode = () => {
    const startBlock = ECOMMERCE_RULE_BLOCKS.find(b => b.type === "inicio_regra")!;
    setNodes([{
      id: "start_node",
      type: "custom",
      position: { x: 400, y: 50 },
      data: { type: "inicio_regra", label: startBlock.label, config: {} },
    }]);
  };

  const loadRule = async (id: string) => {
    const { data, error } = await supabase.from("ecommerce_rules").select("*").eq("id", id).single();
    if (error || !data) { toast({ title: "Erro", description: "Regra não encontrada", variant: "destructive" }); return; }
    setFlowName(data.nome);
    const flowData = data.flow_data as any;
    if (flowData?.nodes) {
      setNodes(flowData.nodes.map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          onDelete: handleDeleteNode,
          onDuplicate: handleDuplicateNode,
          onAddNote: handleOpenNoteDialog,
        },
      })));
      setEdges(flowData.edges || []);
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

      const payload = {
        estabelecimento_id: estabelecimentoId,
        nome: flowName,
        flow_data: { nodes: cleanNodes, edges } as any,
        descricao: `Regra com ${cleanNodes.length} blocos`,
      };

      if (ruleId) {
        await supabase.from("ecommerce_rules").update(payload).eq("id", ruleId);
      } else {
        const { data } = await supabase.from("ecommerce_rules").insert(payload).select().single();
        if (data) navigate(`/ecommerce-rules-editor?id=${data.id}`, { replace: true });
      }
      toast({ title: "Salvo!", description: "Regra salva com sucesso." });
      setHasUnsavedChanges(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, animated: true, style: { strokeWidth: 2 } }, eds));
  }, [setEdges]);

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

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  }, [setNodes, setEdges, selectedNode]);

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
      leftContent={
        <EcommerceBlockLibrary
          onDragStart={handleDragStart}
          isExpanded={isLibraryExpanded}
          onToggleExpanded={setIsLibraryExpanded}
        />
      }
      rightContent={
        selectedNode ? (
          <EcommercePropertiesPanel
            node={selectedNode}
            onUpdate={handleUpdateNodeData}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
          />
        ) : undefined
      }
    >
      <div ref={reactFlowWrapper} className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap zoomable pannable className="!bg-background !border-border" />
        </ReactFlow>
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
