import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { BlockMonitor } from "@/components/flow/BlockMonitor";
import { ErrorDialog } from "@/components/flow/ErrorDialog";
import { FlowNodeData, BLOCK_DEFINITIONS } from "@/types/flow";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const nodeTypes = {
  custom: FlowNode,
};


let id = 0;
const getId = () => {
  // Gerar IDs únicos baseados em timestamp + contador + random
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `node_${timestamp}_${id++}_${random}`;
};

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
  const [globalVariables, setGlobalVariables] = useState<FlowVariable[]>([]);
  const [breakpointNodes, setBreakpointNodes] = useState<Set<string>>(new Set());
  const [skipNodes, setSkipNodes] = useState<Set<string>>(new Set());
  const [simulatorContext, setSimulatorContext] = useState<Record<string, any>>({});
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title?: string;
    description: string;
  }>({ open: false, description: "" });
  const [isDroppingNode, setIsDroppingNode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<string | null>(null);

  // Load saved bots on mount
  useEffect(() => {
    loadSavedBots();
    loadGlobalVariables();
  }, []);

  const loadSavedBots = async () => {
    const { data, error } = await supabase
      .from("bot_flows")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading bots:", error);
      setErrorDialog({
        open: true,
        title: "Erro ao Carregar Bots",
        description: "Não foi possível carregar a lista de bots. Por favor, tente novamente.",
      });
    } else {
      setSavedBots(data || []);
    }
  };

  const loadGlobalVariables = async () => {
    try {
      const { data, error } = await supabase
        .from("global_variables")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Converter variáveis globais para o formato FlowVariable
      const convertedVariables: FlowVariable[] = (data || []).map((gv: any) => ({
        id: gv.id,
        name: gv.name,
        type: gv.type as "text" | "number" | "date" | "array" | "boolean",
        description: gv.description,
        isConstant: gv.is_constant,
        defaultValue: gv.default_value,
        scope: "global" as const,
      }));

      setGlobalVariables(convertedVariables);
    } catch (error) {
      console.error("Error loading global variables:", error);
      setErrorDialog({
        open: true,
        title: "Erro ao Carregar Variáveis",
        description: "Não foi possível carregar as variáveis globais. Por favor, tente novamente.",
      });
    }
  };

  // Combinar variáveis locais e globais (memorizado para evitar re-renders)
  const allVariables = useMemo(() => [...globalVariables, ...flowVariables], [globalVariables, flowVariables]);

  // Determina quais variáveis estão disponíveis até um bloco específico
  const getAvailableVariablesForNode = useCallback((nodeId: string): FlowVariable[] => {
    // Retorna todas as variáveis (globais + locais)
    return allVariables;
  }, [allVariables]);

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
    (params: Connection) => {
      // Prevenir conexões automáticas durante o drop de um novo bloco
      if (isDroppingNode) {
        return;
      }
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, isDroppingNode]
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
      event.stopPropagation();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === type);
      if (!blockDef) return;

      // Marcar que está adicionando um novo bloco
      setIsDroppingNode(true);

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
        },
      };

      setNodes((nds) => [...nds, newNode]);
      
      // Aguardar um pouco antes de permitir conexões novamente e abrir o painel
      setTimeout(() => {
        setIsDroppingNode(false);
        setSelectedNode(newNode);
        setShowSimulator(false);
      }, 100);
      
      toast.success(`Bloco "${blockDef.label}" adicionado!`);
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (showSimulator) {
      // Não mostrar erro, apenas prevenir a seleção
      // O menu de contexto ainda funciona com botão direito
      return;
    }
    // Um clique já abre o painel de propriedades
    setSelectedNode(node);
    setShowSimulator(false); // Fecha o simulador se estiver aberto
  }, [showSimulator]);

  const onPaneClick = useCallback(() => {
    if (showSimulator) {
      return;
    }
    setSelectedNode(null);
  }, [showSimulator]);

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
        setErrorDialog({
          open: true,
          title: "Ação não Permitida",
          description: "O bloco Start não pode ser excluído!",
        });
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
    setErrorDialog({
      open: true,
      title: "Blocos Desconectados",
      description: `${blockLabel} está desconectado! ${disconnectedNodes.length > 1 ? `Mais ${disconnectedNodes.length - 1} bloco(s) também estão desconectados.` : ''}`,
    });
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
      setErrorDialog({
        open: true,
        title: "Nome Obrigatório",
        description: "Por favor, dê um nome ao bot antes de salvar.",
      });
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
      setErrorDialog({
        open: true,
        title: "Erro ao Salvar",
        description: "Não foi possível salvar o bot. Por favor, tente novamente.",
      });
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
      setErrorDialog({
        open: true,
        title: "Erro ao Carregar Bot",
        description: "Não foi possível carregar o bot. Por favor, tente novamente.",
      });
      return;
    }

    if (data && data.flow_data) {
      const flowData = data.flow_data as any;
      let loadedNodes = flowData.nodes || [];
      
      // Remover nós duplicados (com mesmo ID)
      const seenIds = new Set<string>();
      loadedNodes = loadedNodes.filter((node: any) => {
        if (seenIds.has(node.id)) {
          console.warn(`Nó duplicado removido: ${node.id}`);
          return false;
        }
        seenIds.add(node.id);
        return true;
      });
      
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
      setErrorDialog({
        open: true,
        title: "Erro ao Atualizar Status",
        description: "Não foi possível ativar/desativar o bot. Por favor, tente novamente.",
      });
    } else {
      toast.success(!currentActive ? "Bot ativado!" : "Bot desativado!");
      loadSavedBots();
    }
  }, []);

  const handleDeleteBot = useCallback(async (botId: string) => {
    setBotToDelete(botId);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteBot = useCallback(async () => {
    if (!botToDelete) return;

    const { error } = await supabase
      .from("bot_flows")
      .delete()
      .eq("id", botToDelete);

    if (error) {
      console.error("Error deleting bot:", error);
      setErrorDialog({
        open: true,
        title: "Erro ao Excluir",
        description: "Não foi possível excluir o bot. Por favor, tente novamente.",
      });
    } else {
      toast.success("Bot excluído!");
      loadSavedBots();
    }
    
    setDeleteConfirmOpen(false);
    setBotToDelete(null);
  }, [botToDelete]);

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
          setErrorDialog({
            open: true,
            title: "Erro ao Importar",
            description: "Não foi possível importar o fluxo. Verifique se o arquivo está correto.",
          });
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
      setSelectedNode(null); // Limpar seleção ao fechar
      return;
    }
    
    if (nodes.length === 0) {
      setErrorDialog({
        open: true,
        title: "Fluxo Vazio",
        description: "Adicione blocos ao fluxo antes de testar.",
      });
      return;
    }
    
    const hasStart = nodes.some((node) => {
      const nodeData = node.data as any;
      return nodeData.type === "start";
    });
    if (!hasStart) {
      setErrorDialog({
        open: true,
        title: "Bloco Start Ausente",
        description: "Adicione um bloco 'Start' para iniciar o teste.",
      });
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
    if (!reactFlowInstance) return;
    
    // Centralizar todos os blocos
    const blockLibraryWidth = isBlockLibraryExpanded ? 256 : 0;
    const viewportWidth = window.innerWidth;
    const availableWidth = viewportWidth - blockLibraryWidth;
    
    const leftPaddingRatio = blockLibraryWidth / availableWidth;
    
    reactFlowInstance.fitView({ 
      padding: { 
        top: 0.15, 
        bottom: 0.15, 
        left: 0.15 + leftPaddingRatio, 
        right: 0.15 
      },
      duration: 300,
      maxZoom: 1.2
    });
  }, [reactFlowInstance, isBlockLibraryExpanded]);

  const handleToggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
    toast.info(isLocked ? "Canvas desbloqueado" : "Canvas bloqueado");
  }, [isLocked]);

  return (
    <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-border bg-card backdrop-blur-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">CRIAR BOT</h2>
              <p className="text-sm text-muted-foreground">
                Arraste blocos para criar seu fluxo
              </p>
            </div>
            
            <div className="flex gap-1 border-l border-border pl-6">
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
                className="h-9 w-9"
                title="Aumentar zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomOut}
                className="h-9 w-9"
                title="Diminuir zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleFitView}
                disabled={!!selectedNode}
                className="h-9 w-9 disabled:opacity-50 disabled:cursor-not-allowed"
                title={selectedNode ? "Feche as propriedades para centralizar" : "Centralizar"}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleToggleLock}
                className={`h-9 w-9 ${isLocked ? 'bg-cyan-600 text-white hover:bg-cyan-700' : ''}`}
                title={isLocked ? "Desbloquear canvas" : "Bloquear canvas"}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <VariableManager
                variables={flowVariables}
                onVariablesChange={setFlowVariables}
                globalVariables={globalVariables}
              />
              <VariableMonitor
                variables={allVariables}
                context={simulatorContext}
              />
              <BlockMonitor
                selectedNode={selectedNode}
                nodes={nodes}
                edges={edges}
                context={simulatorContext}
                allVariables={allVariables}
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
                  simulatorActive: showSimulator,
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
                  onDuplicate: (nodeId: string) => {
                    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
                    if (nodeToDuplicate) {
                      const newId = getId();
                      const newNode = {
                        ...nodeToDuplicate,
                        id: newId,
                        position: {
                          x: nodeToDuplicate.position.x + 50,
                          y: nodeToDuplicate.position.y + 50,
                        },
                        data: {
                          ...nodeToDuplicate.data,
                        },
                      };
                      setNodes((nds) => [...nds, newNode]);
                      toast.success("Bloco duplicado com sucesso!");
                    }
                  },
                  onDelete: handleDeleteNode,
                },
              }))}
              edges={edges.map((edge) => ({
                ...edge,
                style: {
                  stroke: edge.selected ? '#f59e0b' : '#06b6d4',
                  strokeWidth: edge.selected ? 2 : 1.33,
                },
                markerEnd: {
                  type: 'arrowclosed',
                  width: 20,
                  height: 20,
                  color: edge.selected ? '#f59e0b' : '#06b6d4',
                },
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
              nodesDraggable={!isLocked && !showSimulator}
              nodesConnectable={!isLocked && !showSimulator && !isDroppingNode}
              nodesFocusable={!isLocked}
              edgesFocusable={!isLocked}
              defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
              className="bg-background"
              deleteKeyCode={isLocked ? null : "Delete"}
              connectOnClick={false}
              autoPanOnConnect={false}
              autoPanOnNodeDrag={true}
              defaultEdgeOptions={{
                style: { stroke: '#06b6d4', strokeWidth: 1.33 },
                markerEnd: {
                  type: 'arrowclosed',
                  width: 20,
                  height: 20,
                  color: '#06b6d4',
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
                className="bg-card border border-border rounded-lg shadow-lg"
                maskColor="rgba(255, 255, 255, 0.8)"
              />
            </ReactFlow>
          </div>

          {showSimulator && (
            <div className="w-96 flex flex-col bg-card backdrop-blur-sm border-l border-border">
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
              flowVariables={allVariables}
            />
          )}
        </div>

        {/* Dialog de erro */}
        <ErrorDialog
          open={errorDialog.open}
          onClose={() => setErrorDialog({ open: false, description: "", title: "" })}
          title={errorDialog.title}
          description={errorDialog.description}
        />

        {/* Dialog de confirmação de exclusão */}
        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={confirmDeleteBot}
          title="Confirmar exclusão"
          description="Tem certeza que deseja excluir este bot? Esta ação não pode ser desfeita."
        />
      </div>
  );
}

export default function BotBuilder() {
  return (
    <ReactFlowProvider>
      <BotBuilderContent />
    </ReactFlowProvider>
  );
}
