import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Layout from "@/components/Layout";
import { FlowNode } from "@/components/omnichannel-builder/FlowNode";
import { BlockLibrary } from "@/components/omnichannel-builder/BlockLibrary";
import { PropertiesPanel } from "@/components/omnichannel-builder/PropertiesPanel";
import { FlowValidator } from "@/components/omnichannel-builder/FlowValidator";
import { TemplateSelector } from "@/components/omnichannel-builder/TemplateSelector";
import { FlowVersionHistory } from "@/components/omnichannel-builder/FlowVersionHistory";
import { FlowExportImport } from "@/components/omnichannel-builder/FlowExportImport";
import { BlockNoteDialog } from "@/components/omnichannel-builder/BlockNoteDialog";
import { BotTriggerSelector } from "@/components/omnichannel-builder/BotTriggerSelector";
import { FlowExecutionLogs } from "@/components/omnichannel-builder/FlowExecutionLogs";
import { FlowAnalytics } from "@/components/omnichannel-builder/FlowAnalytics";
import { FlowSimulator } from "@/components/omnichannel-builder/FlowSimulator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, FileText, History, AlertCircle, FileCode, ArrowLeft, BarChart3, Plus, PlayCircle, Play, Download, Upload, Activity, Search, ZoomIn, ZoomOut, Maximize2, Lock, Unlock } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import type { OmnichannelBlockType, OmnichannelNode, OmnichannelEdge, OmnichannelFlowData } from "@/types/omnichannelFlow";

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

  // Carregar fluxo existente
  useEffect(() => {
    if (id) {
      loadFlow(id);
    }
  }, [id]);

  const loadFlow = async (flowId: string) => {
    try {
      const { data, error } = await supabase
        .from("omnichannel_flows")
        .select("*")
        .eq("id", flowId)
        .single();

      if (error) throw error;

      if (data) {
        setFlowName(data.nome);
        setCurrentBotId(data.trigger_bot_id || undefined);
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
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...updates },
            };
          }
          return node;
        })
      );
      // Atualizar também o nó selecionado
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) =>
          prev ? { ...prev, data: { ...prev.data, ...updates } } : null
        );
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
      onUpdateNode(currentNoteNodeId, {
        config: {
          ...nodes.find(n => n.id === currentNoteNodeId)?.data.config,
          nota: note
        }
      });
      toast.success("Nota salva");
    }
  }, [currentNoteNodeId, nodes, onUpdateNode]);

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
        // Atualizar fluxo existente
        const { error } = await supabase
          .from("omnichannel_flows")
          .update({
            nome: flowName,
            flow_data: flowData as any,
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
        
        navigate("/config?section=omnichannel-flows");
      }
    } catch (error) {
      console.error("Erro ao salvar fluxo:", error);
      toast.error("Erro ao salvar fluxo");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-background border-b px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/config?section=omnichannel-flows")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="max-w-md"
              placeholder="Nome do fluxo"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSimulator(!showSimulator)}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Simular
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowValidator(!showValidator)}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Validar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>

            {id && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVersions(true)}
                >
                  <History className="h-4 w-4 mr-2" />
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

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header do Canvas */}
          <div className="p-2 sm:p-3 md:p-4 border-b border-border bg-card backdrop-blur-sm flex items-center justify-between shadow-sm gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden md:block">
                <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">WORKFLOW OMNICHANNEL</h2>
                <p className="text-xs text-muted-foreground leading-tight">
                  Arraste blocos para criar seu fluxo de atendimento
                </p>
              </div>
              
              <div className="flex gap-1 sm:border-l sm:border-border sm:pl-4">
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSimulator(!showSimulator)}
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{showSimulator ? "Fechar Teste" : "Testar"}</span>
                <span className="sm:hidden">Teste</span>
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
                onClick={() => setShowValidator(!showValidator)}
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 hidden lg:flex"
              >
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Validar
              </Button>
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
                  onAddNote: (nodeId: string) => {
                    setCurrentNoteNodeId(nodeId);
                    setShowNoteDialog(true);
                  },
                }
              }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
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
              fitView
              defaultEdgeOptions={{
                type: "smoothstep",
                style: { stroke: "#06b6d4", strokeWidth: 1.33 },
                markerEnd: { type: "arrowclosed", color: "#06b6d4" },
              }}
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
          currentNote={currentNoteNodeId ? nodes.find(n => n.id === currentNoteNodeId)?.data.config.nota : ""}
          onSave={handleSaveNote}
        />
      </div>
    </Layout>
  );
}
