import { useCallback, useRef, useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Play, Save, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { FlowSimulator } from "@/components/flow/FlowSimulator";
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
  const [showSimulator, setShowSimulator] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  // Highlight node during simulation
  useEffect(() => {
    if (highlightedNodeId) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: node.id === highlightedNodeId,
        }))
      );
    }
  }, [highlightedNodeId, setNodes]);

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
    // Single click apenas destaca o nó
  }, []);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Double click abre o painel de propriedades
    setSelectedNode(node);
    setShowSimulator(false); // Fecha o simulador se estiver aberto
    toast.info("Edite as propriedades do bloco");
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

  const handleSave = useCallback(async () => {
    const flow = {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport(),
    };
    
    // Save to localStorage
    localStorage.setItem("bot-flow", JSON.stringify(flow));
    
    // Save to database
    const { error } = await supabase.from("bot_flows").upsert({
      name: `Bot Flow ${new Date().toLocaleString()}`,
      flow_data: flow,
      active: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error saving to database:", error);
      toast.error("Erro ao salvar no banco de dados");
    } else {
      toast.success("Fluxo salvo com sucesso!");
    }
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
    if (nodes.length === 0) {
      toast.error("Adicione blocos ao fluxo antes de testar");
      return;
    }
    const hasStart = nodes.some((node) => {
      const nodeData = node.data as any;
      return nodeData.type === "start";
    });
    if (!hasStart) {
      toast.error("Adicione um bloco 'Start' para iniciar o teste");
      return;
    }
    setShowSimulator(true);
    toast.success("Simulador aberto!");
  }, [nodes]);

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
              {showSimulator ? "Fechar Teste" : "Testar Fluxo"}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <BlockLibrary onDragStart={onDragStart} />

          <div className={`${showSimulator ? "flex-1" : "flex-1"} relative`} ref={reactFlowWrapper}>
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
              onNodeDoubleClick={onNodeDoubleClick}
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

          {showSimulator && (
            <div className="w-96 flex flex-col">
              <FlowSimulator
                nodes={nodes}
                edges={edges}
                onHighlightNode={setHighlightedNodeId}
              />
            </div>
          )}

          {!showSimulator && (
            <PropertiesPanel
              selectedNode={selectedNode}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
            />
          )}
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
