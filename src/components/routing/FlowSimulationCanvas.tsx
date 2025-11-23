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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, SkipForward, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowSimulationCanvasProps {
  flowData: any;
  flowType: 'bot' | 'workflow';
  onStepExecute?: (nodeId: string, data: any) => void;
}

interface ExecutionState {
  currentNodeId: string | null;
  executedNodes: Set<string>;
  variables: Record<string, any>;
  isPaused: boolean;
  isComplete: boolean;
}

const CustomNode = ({ data, selected }: any) => {
  const isExecuted = data.isExecuted;
  const isCurrent = data.isCurrent;
  
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 shadow-lg transition-all min-w-[180px]",
        isCurrent && "ring-4 ring-primary ring-offset-2 animate-pulse",
        isExecuted && !isCurrent && "bg-green-50 dark:bg-green-950/20 border-green-500",
        !isExecuted && !isCurrent && "bg-background border-border",
        selected && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isCurrent && "bg-primary animate-pulse",
          isExecuted && !isCurrent && "bg-green-500",
          !isExecuted && !isCurrent && "bg-muted"
        )} />
        <div className="font-medium text-sm">{data.label}</div>
      </div>
      {data.type && (
        <Badge variant="outline" className="text-xs">
          {data.type}
        </Badge>
      )}
      {data.executionTime && (
        <div className="text-xs text-muted-foreground mt-1">
          {data.executionTime}ms
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function FlowSimulationCanvas({
  flowData,
  flowType,
  onStepExecute,
}: FlowSimulationCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [executionState, setExecutionState] = useState<ExecutionState>({
    currentNodeId: null,
    executedNodes: new Set(),
    variables: {},
    isPaused: false,
    isComplete: false,
  });
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);

  // Carregar fluxo inicial
  useEffect(() => {
    if (flowData?.nodes && flowData?.edges) {
      const initialNodes = flowData.nodes.map((node: any) => ({
        ...node,
        type: 'custom',
        data: {
          ...node.data,
          isExecuted: false,
          isCurrent: false,
        },
      }));
      
      setNodes(initialNodes);
      setEdges(flowData.edges || []);
    }
  }, [flowData]);

  // Atualizar visualização dos nodes
  const updateNodeStates = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({
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
  }, [updateNodeStates]);

  // Executar próximo passo
  const executeNextStep = useCallback(async () => {
    if (executionState.isComplete || executionState.isPaused) return;

    let nextNodeId = executionState.currentNodeId;
    
    // Se não tem node atual, começar pelo primeiro
    if (!nextNodeId) {
      const startNode = nodes.find(n => 
        n.data?.type === 'inicio' || 
        n.data?.type === 'start' ||
        n.id === 'start'
      );
      nextNodeId = startNode?.id || nodes[0]?.id;
    }

    if (!nextNodeId) {
      setExecutionState(prev => ({ ...prev, isComplete: true }));
      return;
    }

    const currentNode = nodes.find(n => n.id === nextNodeId);
    if (!currentNode) {
      setExecutionState(prev => ({ ...prev, isComplete: true }));
      return;
    }

    // Simular execução do bloco
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 500));
    const executionTime = Date.now() - startTime;

    // Coletar dados da execução
    const executionData = {
      nodeId: currentNode.id,
      nodeLabel: currentNode.data?.label || 'Sem label',
      nodeType: currentNode.data?.type || 'unknown',
      timestamp: new Date(),
      variables: { ...executionState.variables },
      executionTime,
    };

    // Adicionar ao histórico
    setExecutionHistory(prev => [...prev, executionData]);

    // Notificar execução
    if (onStepExecute) {
      onStepExecute(currentNode.id, executionData);
    }

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

    // Atualizar estado
    setExecutionState(prev => ({
      ...prev,
      currentNodeId: nextNode?.id || null,
      executedNodes: new Set([...prev.executedNodes, currentNode.id]),
      variables: newVariables,
      isComplete: !nextNode,
    }));

    // Se tiver próximo node, executar automaticamente se não estiver pausado
    if (nextNode && !executionState.isPaused) {
      setTimeout(() => executeNextStep(), 800);
    }
  }, [executionState, nodes, edges, onStepExecute]);

  // Resetar simulação
  const resetSimulation = () => {
    setExecutionState({
      currentNodeId: null,
      executedNodes: new Set(),
      variables: {},
      isPaused: false,
      isComplete: false,
    });
    setExecutionHistory([]);
  };

  // Play/Pause
  const togglePause = () => {
    setExecutionState(prev => {
      const newState = { ...prev, isPaused: !prev.isPaused };
      if (!newState.isPaused && !newState.isComplete) {
        setTimeout(() => executeNextStep(), 100);
      }
      return newState;
    });
  };

  // Iniciar simulação
  const startSimulation = () => {
    if (executionState.currentNodeId === null && !executionState.isComplete) {
      executeNextStep();
    }
  };

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Canvas do Fluxo */}
      <Card className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              Fluxo {flowType === 'bot' ? 'do Bot' : 'Omnichannel'}
            </h3>
            <Badge variant="secondary">
              {executionState.executedNodes.size}/{nodes.length} executados
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={resetSimulation}
              disabled={executionState.executedNodes.size === 0}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            {!executionState.currentNodeId && !executionState.isComplete ? (
              <Button
                size="sm"
                onClick={startSimulation}
              >
                <Play className="w-4 h-4 mr-1" />
                Iniciar
              </Button>
            ) : executionState.isComplete ? (
              <Button
                size="sm"
                variant="secondary"
                disabled
              >
                Completo
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={togglePause}
                >
                  {executionState.isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Continuar
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      Pausar
                    </>
                  )}
                </Button>
                
                {executionState.isPaused && (
                  <Button
                    size="sm"
                    onClick={executeNextStep}
                  >
                    <SkipForward className="w-4 h-4 mr-1" />
                    Próximo
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="h-[calc(100%-60px)] border rounded-lg bg-muted/30">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
          >
            <Background />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                if (node.data?.isCurrent) return '#3b82f6';
                if (node.data?.isExecuted) return '#22c55e';
                return '#94a3b8';
              }}
            />
          </ReactFlow>
        </div>
      </Card>

      {/* Painel de Detalhes */}
      <Card className="w-80 p-4 space-y-4 overflow-y-auto">
        <div>
          <h4 className="font-semibold mb-2">Estado Atual</h4>
          {executionState.currentNodeId ? (
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm font-medium">
                {nodes.find(n => n.id === executionState.currentNodeId)?.data?.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {nodes.find(n => n.id === executionState.currentNodeId)?.data?.type}
              </div>
            </div>
          ) : executionState.isComplete ? (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900 text-sm">
              ✓ Simulação completa
            </div>
          ) : (
            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              Aguardando início
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2">Variáveis ({Object.keys(executionState.variables).length})</h4>
          {Object.keys(executionState.variables).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(executionState.variables).map(([key, value]) => (
                <div key={key} className="p-2 bg-muted rounded text-xs">
                  <span className="font-mono font-semibold text-primary">{key}:</span>{' '}
                  <span className="break-all">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Nenhuma variável ainda</div>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2">Histórico ({executionHistory.length})</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {executionHistory.map((item, idx) => (
              <div key={idx} className="p-2 bg-muted rounded-lg text-xs">
                <div className="font-medium">{item.nodeLabel}</div>
                <div className="text-muted-foreground flex items-center justify-between mt-1">
                  <span>{item.nodeType}</span>
                  <span>{item.executionTime}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
