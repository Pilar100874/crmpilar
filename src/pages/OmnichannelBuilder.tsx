import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlowNode } from "@/components/omnichannel-builder/FlowNode";
import { BlockLibrary } from "@/components/omnichannel-builder/BlockLibrary";
import { PropertiesPanel } from "@/components/omnichannel-builder/PropertiesPanel";
import { FlowValidator } from "@/components/omnichannel-builder/FlowValidator";
import { TemplateSelector } from "@/components/omnichannel-builder/TemplateSelector";
import { FlowVersionHistory } from "@/components/omnichannel-builder/FlowVersionHistory";
import { FlowExportImport } from "@/components/omnichannel-builder/FlowExportImport";
import { BlockNoteDialog } from "@/components/automacao-vendas/BlockNoteDialog";
import { BotTriggerSelector } from "@/components/omnichannel-builder/BotTriggerSelector";
import { FlowExecutionLogs } from "@/components/omnichannel-builder/FlowExecutionLogs";
import { FlowAnalytics } from "@/components/omnichannel-builder/FlowAnalytics";
import { FlowSimulator } from "@/components/omnichannel-builder/FlowSimulator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, FileText, History, AlertCircle, FileCode, X, BarChart3, Plus, PlayCircle, Play, Download, Upload, Activity, Search, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Star } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import type { OmnichannelBlockType, OmnichannelNode, OmnichannelEdge, OmnichannelFlowData } from "@/types/omnichannelFlow";
import { WorkflowAIGenerator } from "@/components/workflow/WorkflowAIGenerator";

const OMNICHANNEL_BLOCK_DEFS = [
  { type: "inicio", label: "Início do Fluxo", description: "Ponto inicial do fluxo omnichannel" },
  { type: "fila", label: "Fila de Atendimento", description: "Cria uma fila de distribuição de chats", category: "roteamento" },
  { type: "atendente", label: "Atendente", description: "Define um atendente no fluxo", category: "roteamento" },
  { type: "skill", label: "Skill Requerida", description: "Adiciona requisito de habilidade", category: "condicao" },
  { type: "regra_roteamento", label: "Regra de Roteamento", description: "Define condições de distribuição", category: "condicao" },
  { type: "horario", label: "Horário de Funcionamento", description: "Define horários de atendimento", category: "condicao" },
  { type: "webhook", label: "Webhook", description: "Integra com sistemas externos", category: "acao" },
  { type: "aguardar", label: "Aguardar", description: "Adiciona delay no fluxo", category: "acao" },
  { type: "analytics", label: "Analytics", description: "Visualiza métricas do fluxo", category: "acao" },
];

const nodeTypes: NodeTypes = {
  custom: FlowNode,
};

const initialNodes: OmnichannelNode[] = [
  {
    id: "start_node",
    type: "custom",
    position: { x: 400, y: 50 },
    data: {
      type: "inicio",
      label: "Início do Fluxo",
      config: {},
    },
  },
];

export default function OmnichannelBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Captura a URL de origem para retornar ao fechar
  const [originUrl] = useState(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || "/atendimento-config";
  });
  
  const [nodes, setNodes, onNodesChange] = useNodesState<OmnichannelNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<OmnichannelNode | null>(null);
  const [flowName, setFlowName] = useState("Novo Fluxo Omnichannel");
  const [isSaving, setIsSaving] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [draggedType, setDraggedType] = useState<OmnichannelBlockType | null>(null);
  
  // Novos estados para as funcionalidades
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showValidator, setShowValidator] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [currentNoteNodeId, setCurrentNoteNodeId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(false);
  const [currentBotId, setCurrentBotId] = useState<string>();
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  // Carregar fluxo existente
  useEffect(() => {
    if (id) {
      loadFlow(id);
    }
  }, [id]);

  const loadFlow = async (flowId: string) => {
    try {
      console.log("🏢 Carregando fluxo (OmnichannelBuilder):", flowId);
      
      const { data, error } = await supabase
        .from("omnichannel_flows")
        .select("*")
        .eq("id", flowId)
        .single();

      if (error) throw error;

      if (data) {
        console.log("✅ Fluxo carregado:", data.nome);
        setFlowName(data.nome);
        setCurrentBotId(data.trigger_bot_id || undefined);
        setIsDefault(data.is_default || false);
        const flowData = data.flow_data as unknown as OmnichannelFlowData;
        setNodes(flowData.nodes || initialNodes);
        setEdges(flowData.edges || []);
      }
    } catch (error) {
      console.error("Erro ao carregar fluxo:", error);
      toast.error("Erro ao carregar fluxo");
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: "smoothstep",
        style: { stroke: "#06b6d4", strokeWidth: 1.33 },
        markerEnd: { type: "arrowclosed", color: "#06b6d4", width: 20, height: 20 },
      };
      setEdges((eds) => addEdge(edge as any, eds));
    },
    [setEdges]
  );

  const onDragStart = (type: OmnichannelBlockType) => {
    setDraggedType(type);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedType) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      const blockLabels: Record<OmnichannelBlockType, string> = {
        fila: "Fila de Atendimento",
        atendente: "Atendente",
        skill: "Skill Requerida",
        regra_roteamento: "Regra de Roteamento",
        horario: "Horário de Funcionamento",
        webhook: "Webhook",
        aguardar: "Aguardar",
        analytics: "Analytics",
        inicio: "Início"
      };

      const newNode: OmnichannelNode = {
        id: `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        type: "custom",
        position,
        data: {
          type: draggedType,
          label: blockLabels[draggedType] || draggedType,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setDraggedType(null);
    },
    [draggedType, setNodes]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail?.type as OmnichannelBlockType;
      if (!type || !reactFlowWrapper.current) return;
      const blockLabels: Record<OmnichannelBlockType, string> = {
        fila: "Fila de Atendimento",
        atendente: "Atendente",
        skill: "Skill Requerida",
        regra_roteamento: "Regra de Roteamento",
        horario: "Horário de Funcionamento",
        webhook: "Webhook",
        aguardar: "Aguardar",
        analytics: "Analytics",
        inicio: "Início"
      };
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance
        ? reactFlowInstance.screenToFlowPosition({
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
          })
        : { x: bounds.width / 2 - 100, y: bounds.height / 2 - 50 };
      const newNode: OmnichannelNode = {
        id: `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        type: "custom",
        position,
        data: {
          type,
          label: blockLabels[type] || type,
          config: {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    };
    window.addEventListener("workflow:add-block", handler);
    return () => window.removeEventListener("workflow:add-block", handler);
  }, [reactFlowInstance, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNode(node as OmnichannelNode);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onUpdateNode = useCallback(
    (nodeId: string, updates: Partial<OmnichannelNode["data"]>) => {
      console.log('onUpdateNode chamado:', { nodeId, updates });
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const updatedNode = {
              ...node,
              data: { 
                ...node.data, 
                ...updates,
                config: {
                  ...(node.data.config || {}),
                  ...(updates.config || {})
                }
              },
            };
            console.log('Node atualizado:', updatedNode);
            return updatedNode;
          }
          return node;
        })
      );
      // Atualizar também o nó selecionado
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => {
          if (!prev) return null;
          const updatedSelected = { 
            ...prev, 
            data: { 
              ...prev.data, 
              ...updates,
              config: {
                ...(prev.data.config || {}),
                ...(updates.config || {})
              }
            } 
          };
          console.log('Selected node atualizado:', updatedSelected);
          return updatedSelected;
        });
      }
    },
    [setNodes, selectedNode]
  );

  // Handlers para debug e controle dos blocos
  const handleSetBreakpoint = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isBreakpoint: !node.data.isBreakpoint,
              isSkipped: false, // Remove skip ao adicionar breakpoint
            },
          };
        }
        return node;
      })
    );
    toast.success("Breakpoint atualizado");
  }, [setNodes]);

  const handleSetSkip = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isSkipped: !node.data.isSkipped,
              isBreakpoint: false, // Remove breakpoint ao pular
            },
          };
        }
        return node;
      })
    );
    toast.success("Estado de pulo atualizado");
  }, [setNodes]);

  const handleClearDebug = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isBreakpoint: false,
              isSkipped: false,
            },
          };
        }
        return node;
      })
    );
    toast.success("Bloco liberado");
  }, [setNodes]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
    if (!nodeToDuplicate) return;

    const newNode: OmnichannelNode = {
      ...nodeToDuplicate,
      id: `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50
      },
      data: {
        ...nodeToDuplicate.data,
        label: `${nodeToDuplicate.data.label} (cópia)`,
        isBreakpoint: false,
        isSkipped: false,
      }
    };
    setNodes(nds => [...nds, newNode]);
    toast.success("Bloco duplicado");
  }, [nodes, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
    toast.success("Bloco removido");
  }, [setNodes, setEdges, selectedNode]);

  const handleAddNote = useCallback((nodeId: string) => {
    setCurrentNoteNodeId(nodeId);
    setShowNoteDialog(true);
  }, []);

  const handleSaveNote = useCallback((note: string) => {
    if (currentNoteNodeId) {
      setNodes(nds => nds.map(n => {
        if (n.id === currentNoteNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              note: note
            }
          };
        }
        return n;
      }));
      toast.success(note ? "Nota adicionada" : "Nota removida");
      setCurrentNoteNodeId(null);
    }
  }, [currentNoteNodeId, setNodes]);

  const handleLoadTemplate = useCallback((templateNodes: OmnichannelNode[], templateEdges: OmnichannelEdge[]) => {
    setNodes(templateNodes);
    setEdges(templateEdges);
    toast.success("Template carregado");
  }, [setNodes, setEdges]);

  const handleRestoreVersion = useCallback((flowData: OmnichannelFlowData) => {
    setNodes(flowData.nodes);
    setEdges(flowData.edges);
  }, [setNodes, setEdges]);

  const handleImportFlow = useCallback((flowData: OmnichannelFlowData, name: string) => {
    setNodes(flowData.nodes);
    setEdges(flowData.edges);
    setFlowName(name);
  }, [setNodes, setEdges]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      // Centro o nó selecionado (opcional - requer instância do ReactFlow)
    }
  }, [nodes]);

  const onEdgesDelete = useCallback(() => {
    toast.success("Conexão removida");
  }, []);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn({ duration: 300 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut({ duration: 300 });
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (!reactFlowInstance) return;
    reactFlowInstance.fitView({ 
      padding: 0.15,
      duration: 300,
      maxZoom: 1.2
    });
  }, [reactFlowInstance]);

  const handleToggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
    toast.info(isLocked ? "Canvas desbloqueado" : "Canvas bloqueado");
  }, [isLocked]);

  const saveVersion = async (flowId: string) => {
    try {
      // Buscar próximo número de versão
      const { data: versions } = await supabase
        .from("omnichannel_flow_versions")
        .select("version_number")
        .eq("flow_id", flowId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number || 0) + 1;

      await supabase
        .from("omnichannel_flow_versions")
        .insert({
          flow_id: flowId,
          version_number: nextVersion,
          flow_data: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } } as any,
          change_description: `Versão ${nextVersion}`
        });
    } catch (error) {
      console.error("Erro ao salvar versão:", error);
    }
  };

  const handleSave = async () => {
    if (!flowName.trim()) {
      toast.error("Informe um nome para o fluxo");
      return;
    }

    setIsSaving(true);

    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        throw new Error("Estabelecimento não encontrado");
      }

      const flowData: OmnichannelFlowData = {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
      };

      if (id) {
        // Se estamos marcando como padrão, desmarcar os outros primeiro
        if (isDefault) {
          const { error: clearError } = await supabase
            .from("omnichannel_flows")
            .update({ is_default: false })
            .eq("estabelecimento_id", estabId)
            .neq("id", id);

          if (clearError) {
            console.error("Erro ao limpar outros padrões:", clearError);
          }
        }

        // Atualizar fluxo existente
        const { error } = await supabase
          .from("omnichannel_flows")
          .update({
            nome: flowName,
            flow_data: flowData as any,
            is_default: isDefault,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;
        toast.success("Fluxo atualizado com sucesso!");
        
        // Salvar versão
        if (id) await saveVersion(id);
      } else {
        // Criar novo fluxo
        const { error } = await supabase
          .from("omnichannel_flows")
          .insert({
            estabelecimento_id: estabId,
            nome: flowName,
            flow_data: flowData as any,
            ativo: true,
          });

        if (error) throw error;
        toast.success("Fluxo criado com sucesso!");
        
        // Criar versão inicial
        const { data: newFlow } = await supabase
          .from("omnichannel_flows")
          .select("id")
          .eq("estabelecimento_id", estabId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (newFlow) await saveVersion(newFlow.id);
        
        navigate(originUrl);
      }
    } catch (error) {
      console.error("Erro ao salvar fluxo:", error);
      toast.error("Erro ao salvar fluxo");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="workflow-shell fixed inset-0 z-50 flex flex-col bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Unificado */}
        <div className="h-14 p-2 sm:p-3 md:p-4 border-b border-border bg-card backdrop-blur-sm flex items-center justify-between shadow-sm gap-2">
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <h2 className="text-sm lg:text-base font-bold text-foreground leading-tight whitespace-nowrap">WORKFLOW OMNICHANNEL</h2>
            </div>

            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="w-[150px] sm:w-[200px] h-8 sm:h-9 text-xs sm:text-sm"
              placeholder="Nome do fluxo"
            />
              
              <div className="flex gap-1 border-l border-border pl-2 sm:pl-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsBlockLibraryExpanded(true)}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                  title="Adicionar blocos"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleZoomIn}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleZoomOut}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleFitView}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                  title="Centralizar"
                >
                  <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleToggleLock}
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full ${isLocked ? 'bg-cyan-600 text-white hover:bg-cyan-700' : ''}`}
                  title={isLocked ? "Desbloquear canvas" : "Bloquear canvas"}
                >
                  {isLocked ? <Lock className="h-3 w-3 sm:h-4 sm:w-4" /> : <Unlock className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex gap-1 sm:gap-2">
              <WorkflowAIGenerator
                workflowType="Omnichannel"
                blockDefinitions={OMNICHANNEL_BLOCK_DEFS}
                onGenerated={(newNodes, newEdges) => {
                  setNodes(nds => [...nds, ...newNodes as OmnichannelNode[]]);
                  setEdges(eds => [...eds, ...newEdges as OmnichannelEdge[]]);
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSimulator(!showSimulator)}
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{showSimulator ? "Fechar" : "Testar"}</span>
                <span className="sm:hidden">Test</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValidator(!showValidator)}
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 hidden lg:flex"
              >
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Validar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 hidden lg:flex"
              >
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Analytics
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(true)}
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 hidden xl:flex"
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Templates
              </Button>

              {id && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVersions(true)}
                    className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 hidden xl:flex"
                  >
                    <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Versões
                  </Button>

                  <BotTriggerSelector 
                    flowId={id} 
                    currentBotId={currentBotId}
                    onUpdate={(botId) => setCurrentBotId(botId)}
                  />
                </>
              )}

              <FlowExportImport
                flowData={{ nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } }}
                flowName={flowName}
                onImport={handleImportFlow}
              />

              {id && (
                <div className="flex items-center gap-2 px-3 py-1 border rounded-full bg-card/50 backdrop-blur-sm">
                  <Star className={`h-3 w-3 sm:h-4 sm:w-4 ${isDefault ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                  <Label htmlFor="default-switch" className="text-xs cursor-pointer whitespace-nowrap">
                    Padrão
                  </Label>
                  <Switch
                    id="default-switch"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className={`h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 ${isSaving ? "bg-green-50" : ""}`}
              >
                <Save className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${isSaving ? "animate-pulse" : ""}`} />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => navigate(originUrl)}
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Fechar
              </Button>
            </div>
          </div>

          {/* Área de trabalho */}
          <div className="flex-1 flex overflow-hidden">
            {/* Validator (se ativo) */}
            {showValidator && (
              <div className="w-96 border-r p-4">
                <FlowValidator
                  nodes={nodes}
                  edges={edges}
                  onNodeClick={(nodeId) => {
                    const node = nodes.find(n => n.id === nodeId);
                    if (node) setSelectedNode(node);
                  }}
                />
              </div>
            )}

          {/* Biblioteca de Blocos */}
          <BlockLibrary 
            onDragStart={onDragStart}
            isExpanded={isBlockLibraryExpanded}
            onToggleExpanded={setIsBlockLibraryExpanded}
            nodes={nodes}
            onNodeSelect={handleNodeSelect}
          />

          {/* Canvas */}
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes.map(node => ({
                ...node,
                data: {
                  ...node.data,
                  onSetBreakpoint: handleSetBreakpoint,
                  onSetSkip: handleSetSkip,
                  onDuplicate: handleDuplicateNode,
                  onDelete: handleDeleteNode,
                  onClearDebug: handleClearDebug,
                  onAddNote: handleAddNote,
                }
              }))}
              edges={edges.map((edge) => ({
                ...edge,
                style: {
                  stroke: edge.selected ? '#ea580c' : '#f97316',
                  strokeWidth: edge.selected ? 2.5 : 1.33,
                },
                markerEnd: {
                  type: 'arrowclosed',
                  width: 20,
                  height: 20,
                  color: edge.selected ? '#ea580c' : '#f97316',
                },
                type: 'smoothstep',
              }))}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgesDelete={onEdgesDelete}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              nodesDraggable={!isLocked}
              nodesConnectable={!isLocked}
              nodesFocusable={!isLocked}
              edgesFocusable={!isLocked}
              deleteKeyCode={isLocked ? null : "Delete"}
              className="bg-background"
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          {/* Painel de Propriedades e Simulador */}
          <div className="w-80 border-l p-4 space-y-4 overflow-y-auto">
            {showSimulator ? (
              <FlowSimulator
                nodes={nodes}
                edges={edges}
                onHighlightPath={(nodeIds) => {
                  // Destacar visualmente o caminho percorrido
                  setNodes(nds => nds.map(node => ({
                    ...node,
                    data: {
                      ...node.data,
                      isHighlighted: nodeIds.includes(node.id)
                    }
                  })));
                }}
              />
            ) : (
              <PropertiesPanel
                selectedNode={selectedNode}
                onUpdateNode={onUpdateNode}
              />
            )}

            {showAnalytics && id && (
              <FlowAnalytics flowId={id} nodes={nodes} />
            )}
          </div>
        </div>

        {/* Logs de Execução */}
        {id && (
          <FlowExecutionLogs
            flowId={id}
            nodes={nodes}
            onHighlightNode={(nodeId) => {
              const node = nodes.find(n => n.id === nodeId);
              if (node) setSelectedNode(node);
            }}
          />
        )}

        {/* Dialogs */}
        <TemplateSelector
          open={showTemplates}
          onOpenChange={setShowTemplates}
          onSelectTemplate={handleLoadTemplate}
        />

        {id && (
          <FlowVersionHistory
            flowId={id}
            open={showVersions}
            onOpenChange={setShowVersions}
            onRestore={handleRestoreVersion}
          />
        )}

        <BlockNoteDialog
          open={showNoteDialog}
          onOpenChange={setShowNoteDialog}
          currentNote={currentNoteNodeId ? (nodes.find(n => n.id === currentNoteNodeId)?.data.note || "") : ""}
          onSave={handleSaveNote}
        />
      </div>
    </div>
  );
}
