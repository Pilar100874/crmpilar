import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, SkipForward, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Simulation {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  startTime: Date;
  endTime?: Date;
  config: {
    canal: string;
    botId?: string;
    fluxoId?: string;
    cliente?: string;
  };
  executionTrace: any[];
}

interface FlowSimulationCanvasProps {
  simulation: Simulation;
  bots: any[];
  fluxos: any[];
}

interface ExecutionState {
  currentNodeId: string | null;
  executedNodes: Set<string>;
  variables: Record<string, any>;
  isPaused: boolean;
  isComplete: boolean;
  currentStep: number;
}

const CustomNode = ({ data, selected }: any) => {
  const isExecuted = data.isExecuted;
  const isCurrent = data.isCurrent;
  
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 shadow-lg transition-all min-w-[200px] bg-background",
        isCurrent && "ring-4 ring-primary ring-offset-2 border-primary",
        isExecuted && !isCurrent && "bg-green-50 dark:bg-green-950/30 border-green-500",
        !isExecuted && !isCurrent && "border-border hover:border-primary/50",
        selected && "ring-2 ring-blue-500"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "w-3 h-3 rounded-full flex-shrink-0",
          isCurrent && "bg-primary animate-pulse",
          isExecuted && !isCurrent && "bg-green-500",
          !isExecuted && !isCurrent && "bg-muted"
        )} />
        <span className="font-semibold text-sm truncate">{data.label || data.type || 'Bloco'}</span>
      </div>
      
      {data.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>
      )}
      
      {data.executionTime && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {data.executionTime}ms
        </div>
      )}

      {isCurrent && (
        <Badge variant="default" className="mt-2 text-xs">Executando...</Badge>
      )}
      
      {isExecuted && !isCurrent && (
        <Badge variant="secondary" className="mt-2 text-xs bg-green-100 dark:bg-green-950/50">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Concluído
        </Badge>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function FlowSimulationCanvas({
  simulation,
  bots,
  fluxos,
}: FlowSimulationCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [executionState, setExecutionState] = useState<ExecutionState>({
    currentNodeId: null,
    executedNodes: new Set(),
    variables: {},
    isPaused: false,
    isComplete: false,
    currentStep: 0,
  });
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);

  // Determinar flow data e tipo
  const bot = bots.find(b => b.id === simulation.config.botId);
  const fluxo = fluxos.find(f => f.id === simulation.config.fluxoId);
  
  console.log('🔍 Simulation config:', simulation.config);
  console.log('🤖 Bot encontrado:', bot);
  console.log('⚙️ Fluxo encontrado:', fluxo);
  
  const rawFlowData = bot?.flow_data || fluxo?.flow_data;
  const flowData = typeof rawFlowData === 'string' ? JSON.parse(rawFlowData) : rawFlowData;
  const flowType = bot ? 'Bot' : 'Workflow';
  
  console.log('📊 Flow data:', flowData);
  console.log('📦 Nodes:', flowData?.nodes?.length || 0);
  console.log('🔗 Edges:', flowData?.edges?.length || 0);

  // Carregar fluxo inicial
  useEffect(() => {
    console.log('🚀 Carregando fluxo...');
    
    if (flowData?.nodes && Array.isArray(flowData.nodes)) {
      console.log('✅ Flow data válido com', flowData.nodes.length, 'nodes');
      
      const initialNodes = flowData.nodes.map((node: any) => {
        const nodeData = {
          ...node,
          type: 'custom',
          data: {
            ...node.data,
            isExecuted: false,
            isCurrent: false,
          },
        };
        console.log('📍 Node carregado:', nodeData.id, nodeData.data.label);
        return nodeData;
      });
      
      const initialEdges = flowData.edges || [];
      console.log('🔗 Edges carregadas:', initialEdges.length);
      
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      console.warn('⚠️ Flow data inválido ou vazio');
    }
  }, [flowData]);

  // Atualizar visualização dos nodes
  const updateNodeStates = useCallback(() => {
    setNodes(nds =>
      nds.map(node => ({
        ...node,
        data: {
          ...node.data,
          isExecuted: executionState.executedNodes.has(node.id),
          isCurrent: node.id === executionState.currentNodeId,
        },
      }))
    );
  }, [executionState, setNodes]);

  useEffect(() => {
    updateNodeStates();
  }, [executionState, updateNodeStates]);

  // Executar próximo passo
  const executeNextStep = useCallback(() => {
    if (executionState.isComplete) {
      console.log('✅ Simulação completa');
      return;
    }

    // Se não tem node atual, começar do primeiro
    let currentNode;
    if (!executionState.currentNodeId) {
      currentNode = nodes.find(n => 
        !edges.some(e => e.target === n.id) // Node sem entrada = início
      ) || nodes[0];
    } else {
      currentNode = nodes.find(n => n.id === executionState.currentNodeId);
    }

    if (!currentNode) {
      console.log('✅ Simulação completa - sem mais nodes');
      setExecutionState(prev => ({ ...prev, isComplete: true, currentNodeId: null, isPaused: true }));
      return;
    }

    console.log('▶️ Executando node:', currentNode.id, currentNode.data.label);

    // Registrar execução
    const executionData = {
      nodeId: currentNode.id,
      label: currentNode.data.label,
      type: currentNode.data.type,
      timestamp: new Date(),
      variables: { ...executionState.variables },
    };
    
    setExecutionHistory(prev => [...prev, executionData]);

    // Atualizar variáveis baseado no tipo de bloco
    const newVariables = { ...executionState.variables };
    if (currentNode.data?.config) {
      Object.assign(newVariables, currentNode.data.config);
    }

    // Encontrar próximo node
    const outgoingEdges = edges.filter(e => e.source === currentNode.id);
    const nextNode = outgoingEdges.length > 0 
      ? nodes.find(n => n.id === outgoingEdges[0].target)
      : null;

    console.log('➡️ Próximo node:', nextNode?.id);

    // Atualizar estado
    const newExecutedNodes = new Set([...executionState.executedNodes, currentNode.id]);
    const isComplete = !nextNode;
    
    setExecutionState(prev => ({
      ...prev,
      currentNodeId: nextNode?.id || null,
      executedNodes: newExecutedNodes,
      variables: newVariables,
      isComplete: isComplete,
      currentStep: prev.currentStep + 1,
      // Se não estiver pausado e não terminou, continua automaticamente
    }));

    // Se tiver próximo node e NÃO estiver pausado, executar automaticamente
    if (nextNode && !executionState.isPaused && !isComplete) {
      console.log('⏭️ Executando automaticamente próximo passo...');
      setTimeout(() => executeNextStep(), 1000);
    }
  }, [executionState, nodes, edges]);

  // Resetar simulação
  const resetSimulation = () => {
    console.log('🔄 Resetando simulação');
    setExecutionState({
      currentNodeId: null,
      executedNodes: new Set(),
      variables: {},
      isPaused: false,
      isComplete: false,
      currentStep: 0,
    });
    setExecutionHistory([]);
  };

  // Toggle pause
  const togglePause = () => {
    setExecutionState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    if (executionState.isPaused && !executionState.isComplete) {
      setTimeout(() => executeNextStep(), 500);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header com controles */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">Simulação Visual - {flowType}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {bot?.name || fluxo?.nome || 'Fluxo'} • {nodes.length} blocos
            </p>
          </div>
          <Badge variant={executionState.isComplete ? "secondary" : "default"}>
            Passo {executionState.currentStep} / {nodes.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (!executionState.currentNodeId && !executionState.isComplete) {
                // Primeira execução - iniciar pausado
                setExecutionState(prev => ({ ...prev, isPaused: true }));
                executeNextStep();
              } else {
                togglePause();
              }
            }}
            disabled={executionState.isComplete}
            variant={executionState.isPaused ? "default" : "secondary"}
          >
            {executionState.isPaused ? (
              <><Play className="w-4 h-4 mr-1" /> Continuar</>
            ) : (
              <><Pause className="w-4 h-4 mr-1" /> Pausar</>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              console.log('🔵 Botão Próximo clicado');
              console.log('Estado atual:', { 
                isPaused: executionState.isPaused, 
                isComplete: executionState.isComplete,
                currentNodeId: executionState.currentNodeId 
              });
              // Pausar antes de executar para garantir modo passo a passo
              setExecutionState(prev => ({ ...prev, isPaused: true }));
              executeNextStep();
            }}
            disabled={executionState.isComplete}
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Próximo
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={resetSimulation}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Resetar
          </Button>

          {nodes.length === 0 && (
            <Badge variant="destructive" className="ml-auto">
              <AlertCircle className="w-3 h-3 mr-1" />
              Nenhum bloco encontrado
            </Badge>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-muted/10">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.data.isCurrent) return '#0ea5e9';
                if (node.data.isExecuted) return '#22c55e';
                return '#94a3b8';
              }}
              className="bg-background border border-border"
            />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Nenhum fluxo encontrado para esta simulação
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Selecione um Bot ou Workflow válido
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Histórico de execução */}
      {executionHistory.length > 0 && (
        <Card className="m-4 p-3">
          <h4 className="font-semibold text-sm mb-2">Histórico de Execução</h4>
          <ScrollArea className="h-[120px]">
            <div className="space-y-1 pr-3">
              {executionHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50"
                >
                  <Badge variant="outline" className="text-xs">
                    #{idx + 1}
                  </Badge>
                  <span className="flex-1 font-medium">{item.label || item.type}</span>
                  <span className="text-muted-foreground">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
