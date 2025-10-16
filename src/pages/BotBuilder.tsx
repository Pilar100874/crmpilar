import { useCallback, useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Play, Save, Download, Upload, ZoomIn, ZoomOut, Maximize2, Lock, Unlock } from "lucide-react";
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
import { BotManager } from "@/components/flow/BotManager";
import { VariableManager, FlowVariable } from "@/components/flow/VariableManager";
import { VariableMonitor } from "@/components/flow/VariableMonitor";
import { BlockVariablesDialog } from "@/components/flow/BlockVariablesDialog";
import { FlowNodeData, BLOCK_DEFINITIONS } from "@/types/flow";
import { toast } from "sonner";

const nodeTypes = {
  custom: FlowNode,
};

let id = 0;
const getId = () => `node_${id++}`;

function BotBuilderContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Criar bloco Start por padrão
  const initialNodes: Node[] = [
    {
      id: "start_node",
      type: "custom",
      position: { x: 250, y: 100 },
      data: {
        label: "Iniciar conversa",
        type: "start",
        config: {},
      },
    }
  ];
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [currentBotId, setCurrentBotId] = useState<string | null>(null);
  const [currentBotName, setCurrentBotName] = useState("Novo Bot");
  const [savedBots, setSavedBots] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(false);
  const [flowVariables, setFlowVariables] = useState<FlowVariable[]>([]);
  const [breakpointNodes, setBreakpointNodes] = useState<Set<string>>(new Set());
  const [skipNodes, setSkipNodes] = useState<Set<string>>(new Set());
  const [simulatorContext, setSimulatorContext] = useState<Record<string, any>>({});
  const [blockVariablesDialog, setBlockVariablesDialog] = useState<{
    open: boolean;
    nodeId: string | null;
    blockLabel: string;
  }>({ open: false, nodeId: null, blockLabel: "" });

  // Load saved bots on mount
  useEffect(() => {
    loadSavedBots();
  }, []);

  const loadSavedBots = async () => {
    const { data, error } = await supabase
      .from("bot_flows")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading bots:", error);
      toast.error("Erro ao carregar bots");
    } else {
      setSavedBots(data || []);
    }
  };

  // Determina quais variáveis estão disponíveis até um bloco específico
  const getAvailableVariablesForNode = useCallback((nodeId: string): FlowVariable[] => {
    // Retorna todas as variáveis criadas até este ponto
    // Em uma implementação mais sofisticada, poderia analisar o fluxo para determinar
    // quais variáveis foram realmente criadas antes deste bloco
    return flowVariables;
  }, [flowVariables]);

  // Handler para mostrar variáveis disponíveis em um bloco
  const handleShowVariables = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const blockDef = BLOCK_DEFINITIONS.find(b => b.type === node.data.type);
    const blockLabel = String(blockDef?.label || node.data.label || "Bloco");
    
    setBlockVariablesDialog({
      open: true,
      nodeId,
      blockLabel,
    });
  }, [nodes]);

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

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => {
        const filtered = els.filter((e) => e.id !== oldEdge.id);
        return addEdge(newConnection, filtered);
      });
      toast.success("Conexão movida!");
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      toast.success(`${deleted.length} conexão(ões) removida(s)`);
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
      setSelectedNode(newNode); // Abre propriedades automaticamente
      setShowSimulator(false); // Fecha simulador
      toast.success(`Bloco "${blockDef.label}" adicionado!`);
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Um clique já abre o painel de propriedades
    setSelectedNode(node);
    setShowSimulator(false); // Fecha o simulador se estiver aberto
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Partial<FlowNodeData>) => {
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
      console.log("Node updated:", nodeId, data);
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      // Não permitir deletar o bloco Start
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (nodeToDelete && (nodeToDelete.data as any).type === "start") {
        toast.error("O bloco Start não pode ser excluído!");
        return;
      }
      
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
      toast.success("Bloco excluído!");
    },
    [setNodes, setEdges, nodes]
  );

  // Validar se existem blocos desconectados
  const validateConnections = useCallback(() => {
    if (nodes.length === 0) return { isValid: true, disconnectedNodes: [] };

    // Encontrar todos os nós que têm conexões (como fonte ou destino)
    const connectedNodeIds = new Set<string>();
    
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    // Verificar blocos desconectados (exceto o start que pode não ter entrada)
    const disconnectedNodes = nodes.filter(node => {
      const nodeData = node.data as any;
      // O bloco start não precisa de entrada, mas precisa de saída se não for o único bloco
      if (nodeData.type === "start") {
        return nodes.length > 1 && !edges.some(e => e.source === node.id);
      }
      // Outros blocos precisam ter pelo menos uma conexão (entrada ou saída)
      return !connectedNodeIds.has(node.id);
    });

    return {
      isValid: disconnectedNodes.length === 0,
      disconnectedNodes
    };
  }, [nodes, edges]);

  const highlightDisconnectedNodes = useCallback((disconnectedNodes: Node[]) => {
    if (disconnectedNodes.length === 0) return;

    // Destacar o primeiro bloco desconectado
    const firstDisconnected = disconnectedNodes[0];
    
    // Marcar visualmente todos os blocos desconectados e selecionar o primeiro
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === firstDisconnected.id,
      }))
    );
    
    // Centralizar visualização no primeiro bloco desconectado
    if (reactFlowInstance) {
      reactFlowInstance.setCenter(
        firstDisconnected.position.x + 140,
        firstDisconnected.position.y + 70,
        { zoom: 1.5, duration: 800 }
      );
    }

    // Selecionar o bloco no painel de propriedades
    setSelectedNode(firstDisconnected);
    
    // Mostrar mensagem de erro
    const nodeData = firstDisconnected.data as any;
    const blockLabel = nodeData.label || "Bloco";
    toast.error(
      `${blockLabel} está desconectado! ${disconnectedNodes.length > 1 ? `Mais ${disconnectedNodes.length - 1} bloco(s) também estão desconectados.` : ''}`
    );
  }, [reactFlowInstance, setNodes]);

  const handleNewBot = useCallback(() => {
    setCurrentBotId(null);
    setCurrentBotName("Novo Bot");
    setSelectedNode(null);
    setEdges([]);
    setFlowVariables([]);
    
    // Criar bloco Start automaticamente
    const startNode: Node = {
      id: "start_node",
      type: "custom",
      position: { x: 250, y: 100 },
      data: {
        label: "Iniciar conversa",
        type: "start",
        config: {},
      },
    };
    setNodes([startNode]);
    
    toast.success("Novo bot criado!");
  }, [setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    if (!currentBotName.trim()) {
      toast.error("Por favor, dê um nome ao bot");
      return;
    }

    // Validar conexões antes de salvar
    const validation = validateConnections();
    if (!validation.isValid) {
      highlightDisconnectedNodes(validation.disconnectedNodes);
      return;
    }

    const flow = {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport(),
      variables: flowVariables,
    };

    const botData = {
      name: currentBotName,
      flow_data: flow as any, // Cast to any for Json compatibility
      updated_at: new Date().toISOString(),
    };

    let error, data;
    if (currentBotId) {
      // Update existing bot
      ({ error, data } = await supabase
        .from("bot_flows")
        .update(botData)
        .eq("id", currentBotId)
        .select()
        .single());
    } else {
      // Create new bot
      ({ error, data } = await supabase
        .from("bot_flows")
        .insert([{ ...botData, active: false }])
        .select()
        .single());
      
      if (data) {
        setCurrentBotId(data.id);
      }
    }

    if (error) {
      console.error("Error saving bot:", error);
      toast.error("Erro ao salvar bot");
    } else {
      toast.success("Bot salvo com sucesso!");
      loadSavedBots();
    }
  }, [nodes, edges, reactFlowInstance, currentBotName, currentBotId, validateConnections, highlightDisconnectedNodes]);

  const handleLoadBot = useCallback(async (botId: string) => {
    const { data, error } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("id", botId)
      .single();

    if (error) {
      console.error("Error loading bot:", error);
      toast.error("Erro ao carregar bot");
      return;
    }

    if (data && data.flow_data) {
      const flowData = data.flow_data as any;
      const loadedNodes = flowData.nodes || [];
      
      // Garantir que tem um bloco Start
      const hasStart = loadedNodes.some((node: any) => node.data.type === "start");
      if (!hasStart) {
        const startNode: Node = {
          id: "start_node",
          type: "custom",
          position: { x: 250, y: 100 },
          data: {
            label: "Iniciar conversa",
            type: "start",
            config: {},
          },
        };
        loadedNodes.unshift(startNode);
      }
      
      setNodes(loadedNodes);
      setEdges(flowData.edges || []);
      setFlowVariables(flowData.variables || []);
      setCurrentBotId(data.id);
      setCurrentBotName(data.name);
      setSelectedNode(null);
      toast.success(`Bot "${data.name}" carregado!`);
    }
  }, [setNodes, setEdges]);

  const handleToggleActive = useCallback(async (botId: string, currentActive: boolean) => {
    // If activating, deactivate all others first
    if (!currentActive) {
      await supabase
        .from("bot_flows")
        .update({ active: false })
        .neq("id", botId);
    }

    const { error } = await supabase
      .from("bot_flows")
      .update({ active: !currentActive })
      .eq("id", botId);

    if (error) {
      console.error("Error toggling active:", error);
      toast.error("Erro ao ativar/desativar bot");
    } else {
      toast.success(!currentActive ? "Bot ativado!" : "Bot desativado!");
      loadSavedBots();
    }
  }, []);

  const handleDeleteBot = useCallback(async (botId: string) => {
    if (!confirm("Tem certeza que deseja excluir este bot?")) return;

    const { error } = await supabase
      .from("bot_flows")
      .delete()
      .eq("id", botId);

    if (error) {
      console.error("Error deleting bot:", error);
      toast.error("Erro ao excluir bot");
    } else {
      toast.success("Bot excluído!");
      loadSavedBots();
      if (currentBotId === botId) {
        handleNewBot();
      }
    }
  }, [currentBotId, handleNewBot]);

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
    if (showSimulator) {
      setShowSimulator(false);
      setHighlightedNodeId(null);
      return;
    }
    
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

    // Validar conexões antes de testar
    const validation = validateConnections();
    if (!validation.isValid) {
      highlightDisconnectedNodes(validation.disconnectedNodes);
      return;
    }
    
    setShowSimulator(true);
    toast.success("Simulador aberto!");
  }, [nodes, showSimulator, validateConnections, highlightDisconnectedNodes]);

  const handleNewFlow = useCallback(() => {
    setEdges([]);
    setSelectedNode(null);
    id = 0;
    
    // Criar bloco Start automaticamente
    const startNode: Node = {
      id: "start_node",
      type: "custom",
      position: { x: 250, y: 100 },
      data: {
        label: "Iniciar conversa",
        type: "start",
        config: {},
      },
    };
    setNodes([startNode]);
    
    toast.success("Novo fluxo criado!");
  }, [setNodes, setEdges]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn({ duration: 300 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut({ duration: 300 });
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  const handleToggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
    toast.info(isLocked ? "Canvas desbloqueado" : "Canvas bloqueado");
  }, [isLocked]);

  return (
    <Layout>
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white">CRIAR BOT</h2>
              <p className="text-sm text-slate-400">
                Arraste blocos para criar seu fluxo
              </p>
            </div>
            
            <div className="flex gap-1 border-l border-slate-700 pl-6">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsBlockLibraryExpanded(true)}
                className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                title="Adicionar blocos"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomIn}
                className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                title="Aumentar zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomOut}
                className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                title="Diminuir zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleFitView}
                className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                title="Centralizar"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleToggleLock}
                className={`h-9 w-9 border-slate-700 ${isLocked ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'}`}
                title={isLocked ? "Desbloquear canvas" : "Bloquear canvas"}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <VariableManager
                variables={flowVariables}
                onVariablesChange={setFlowVariables}
              />
              <VariableMonitor
                variables={flowVariables}
                context={simulatorContext}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <BotManager
              savedBots={savedBots}
              currentBotId={currentBotId}
              currentBotName={currentBotName}
              onNewBot={handleNewBot}
              onLoadBot={handleLoadBot}
              onToggleActive={handleToggleActive}
              onDeleteBot={handleDeleteBot}
              onNameChange={setCurrentBotName}
            />
            <Button variant="outline" size="sm" onClick={handleImport} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            <Button size="sm" onClick={handleTest} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg">
              <Play className="w-4 h-4 mr-2" />
              {showSimulator ? "Fechar Teste" : "Testar Fluxo"}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <BlockLibrary 
            onDragStart={onDragStart} 
            isExpanded={isBlockLibraryExpanded}
            onToggleExpanded={setIsBlockLibraryExpanded}
          />

          <div className={`${showSimulator ? "flex-1" : "flex-1"} relative`} ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes.map(node => ({
                ...node,
                data: {
                  ...node.data,
                  isBreakpoint: breakpointNodes.has(node.id),
                  isSkipped: skipNodes.has(node.id),
                  onSetBreakpoint: (nodeId: string) => {
                    setBreakpointNodes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(nodeId)) {
                        newSet.delete(nodeId);
                      } else {
                        newSet.add(nodeId);
                        skipNodes.delete(nodeId);
                      }
                      return newSet;
                    });
                    setSkipNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(nodeId);
                      return newSet;
                    });
                  },
                  onSetSkip: (nodeId: string) => {
                    setSkipNodes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(nodeId)) {
                        newSet.delete(nodeId);
                      } else {
                        newSet.add(nodeId);
                        breakpointNodes.delete(nodeId);
                      }
                      return newSet;
                    });
                    setBreakpointNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(nodeId);
                      return newSet;
                    });
                  },
                  onClearDebug: (nodeId: string) => {
                    setBreakpointNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(nodeId);
                      return newSet;
                    });
                    setSkipNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(nodeId);
                      return newSet;
                    });
                  },
                  onShowVariables: handleShowVariables,
                },
              }))}
              edges={edges.map((edge) => ({
                ...edge,
                style: {
                  stroke: edge.selected ? '#f59e0b' : '#06b6d4',
                  strokeWidth: edge.selected ? 3 : 2,
                },
                animated: true,
                type: 'smoothstep',
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
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              nodesDraggable={!isLocked}
              nodesConnectable={!isLocked}
              nodesFocusable={!isLocked}
              edgesFocusable={!isLocked}
              fitView
              className="bg-slate-900"
              deleteKeyCode={isLocked ? null : "Delete"}
              defaultEdgeOptions={{
                style: { stroke: '#06b6d4', strokeWidth: 2 },
                animated: true,
                type: 'smoothstep',
              }}
            >
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={20} 
                size={1.5}
                color="#334155"
                className="opacity-40"
              />
              <MiniMap
                nodeColor={(node) => {
                  const nodeData = node.data as any;
                  const blockDef = BLOCK_DEFINITIONS.find(
                    (b) => b.type === nodeData?.type
                  );
                  return blockDef?.color.includes("primary")
                    ? "#06b6d4"
                    : blockDef?.color.includes("success")
                    ? "#10b981"
                    : blockDef?.color.includes("warning")
                    ? "#f59e0b"
                    : "#475569";
                }}
                className="bg-slate-800/90 border border-slate-700/50 rounded-lg shadow-xl"
                maskColor="rgba(15, 23, 42, 0.8)"
              />
            </ReactFlow>
          </div>

          {showSimulator && (
            <div className="w-96 flex flex-col bg-slate-800/95 backdrop-blur-sm border-l border-slate-700/50">
              <FlowSimulator
                nodes={nodes}
                edges={edges}
                onHighlightNode={setHighlightedNodeId}
                breakpointNodes={breakpointNodes}
                skipNodes={skipNodes}
                onContextChange={setSimulatorContext}
              />
            </div>
          )}

          {!showSimulator && selectedNode && (
            <PropertiesPanel
              selectedNode={nodes.find(n => n.id === selectedNode.id) || selectedNode}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              nodes={nodes}
              edges={edges}
              flowVariables={flowVariables}
            />
          )}
        </div>

        {/* Dialog de variáveis disponíveis no bloco */}
        <BlockVariablesDialog
          open={blockVariablesDialog.open}
          onOpenChange={(open) => setBlockVariablesDialog(prev => ({ ...prev, open }))}
          blockLabel={blockVariablesDialog.blockLabel}
          availableVariables={blockVariablesDialog.nodeId 
            ? getAvailableVariablesForNode(blockVariablesDialog.nodeId) 
            : []}
          currentContext={simulatorContext}
        />
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
