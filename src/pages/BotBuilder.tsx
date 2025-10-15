import { useCallback, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Play, Save, Download, Upload } from "lucide-react";
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
import { FlowNode } from "@/components/flow/FlowNode";
import { BlockLibrary } from "@/components/flow/BlockLibrary";
import { PropertiesPanel } from "@/components/flow/PropertiesPanel";
import { FlowNodeData, BLOCK_DEFINITIONS } from "@/types/flow";
import { toast } from "sonner";

const nodeTypes = {
  custom: FlowNode,
};

let id = 0;
const getId = () => `node_${id++}`;

function BotBuilderContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === type);
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
          config: blockDef.defaultData,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      toast.success(`Bloco "${blockDef.label}" adicionado!`);
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
    (nodeId: string, data: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
      toast.success("Propriedades atualizadas!");
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
      toast.success("Bloco excluído!");
    },
    [setNodes, setEdges]
  );

  const handleSave = useCallback(() => {
    const flow = {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport(),
    };
    localStorage.setItem("bot-flow", JSON.stringify(flow));
    toast.success("Fluxo salvo com sucesso!");
  }, [nodes, edges, reactFlowInstance]);

  const handleExport = useCallback(() => {
    const flow = {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport(),
    };
    const dataStr = JSON.stringify(flow, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bot-flow-${Date.now()}.json`;
    link.click();
    toast.success("Fluxo exportado!");
  }, [nodes, edges, reactFlowInstance]);

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
          setNodes(flow.nodes || []);
          setEdges(flow.edges || []);
          if (flow.viewport && reactFlowInstance) {
            reactFlowInstance.setViewport(flow.viewport);
          }
          toast.success("Fluxo importado!");
        } catch (error) {
          toast.error("Erro ao importar fluxo");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges, reactFlowInstance]);

  const handleTest = useCallback(() => {
    toast.info("Funcionalidade de teste será implementada em breve!");
  }, []);

  const handleNewFlow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    id = 0;
    toast.success("Novo fluxo criado!");
  }, [setNodes, setEdges]);

  return (
    <Layout>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b bg-card flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Bot Builder</h2>
            <p className="text-sm text-muted-foreground">
              Arraste blocos para criar seu fluxo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleNewFlow}>
              <Plus className="w-4 h-4 mr-2" />
              Novo
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            <Button size="sm" onClick={handleTest}>
              <Play className="w-4 h-4 mr-2" />
              Testar
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          <BlockLibrary onDragStart={onDragStart} />

          <div className="flex-1 relative" ref={reactFlowWrapper}>
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
              className="bg-muted/20"
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const nodeData = node.data as any;
                  const blockDef = BLOCK_DEFINITIONS.find(
                    (b) => b.type === nodeData?.type
                  );
                  return blockDef?.color.includes("primary")
                    ? "#6366f1"
                    : blockDef?.color.includes("success")
                    ? "#10b981"
                    : blockDef?.color.includes("warning")
                    ? "#f59e0b"
                    : "#6b7280";
                }}
                className="bg-card border rounded-lg"
              />
            </ReactFlow>
          </div>

          <PropertiesPanel
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
          />
        </div>
      </div>
    </Layout>
  );
}

export default function BotBuilder() {
  return (
    <ReactFlowProvider>
      <BotBuilderContent />
    </ReactFlowProvider>
  );
}
