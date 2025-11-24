import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, SkipForward, AlertCircle, CheckCircle2, Clock, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import VariableMonitor from './VariableMonitor';

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
  onBotMessage?: (message: string, nodeData?: any) => void;
  onReset?: () => void;
  onOmnichannelTransfer?: (workflowId: string) => void;
  onUserResponse?: (response: string) => void;
}

interface ExecutionState {
  currentNodeId: string | null;
  executedNodes: Set<string>;
  variables: Record<string, any>;
  isPaused: boolean;
  isComplete: boolean;
  currentStep: number;
  waitingForInput: boolean;
  expectedVariable?: string;
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
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
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
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
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
  onBotMessage,
  onReset,
  onOmnichannelTransfer,
  onUserResponse,
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
    waitingForInput: false,
  });
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

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

  // Carregar fluxo inicial e resetar quando mudar de simulação
  useEffect(() => {
    console.log('🚀 Carregando fluxo para simulação:', simulation.id);
    
    // Resetar estado de execução ao trocar de simulação
    setExecutionState({
      currentNodeId: null,
      executedNodes: new Set(),
      variables: {},
      isPaused: false,
      isComplete: false,
      currentStep: 0,
      waitingForInput: false,
    });
    
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
  }, [flowData, simulation.id]);

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

  // Executar próximo passo (apenas um passo por vez)
  const executeNextStep = useCallback(() => {
    if (executionState.isComplete) {
      console.log('✅ Simulação completa');
      return;
    }

    // Se estamos aguardando input do usuário, não avançar
    if (executionState.waitingForInput) {
      console.log('⏸️ Aguardando input do usuário');
      return;
    }

    // Se não tem node atual, começar do primeiro
    let currentNode;
    if (!executionState.currentNodeId) {
      // Encontrar o nó inicial (start ou sem entrada)
      currentNode = nodes.find(n => 
        n.data?.type === 'start' || 
        !edges.some(e => e.target === n.id)
      );
      console.log('🎬 Iniciando do nó:', currentNode?.id, currentNode?.data?.label);
    } else {
      currentNode = nodes.find(n => n.id === executionState.currentNodeId);
    }

    if (!currentNode) {
      console.log('✅ Simulação completa - sem mais nodes');
      setExecutionState(prev => ({ ...prev, isComplete: true, currentNodeId: null }));
      return;
    }

    console.log('▶️ Executando node:', currentNode.id, currentNode.data.label);

    // Verificar se este bloco precisa de input do usuário
    const needsInput = [
      'ask_question',
      'ask_cnpj',
      'ask_name',
      'ask_email',
      'ask_phone',
      'collect_input'
    ].includes(currentNode.data.type);

    // Atualizar variáveis baseado no tipo de bloco
    const newVariables = { ...executionState.variables };
    
    // Extrair configurações do bloco e enviar ao chat
    if (currentNode.data?.config) {
      const config = currentNode.data.config;
      
      // Para blocos de mensagem
      if (currentNode.data.type === 'send_message' && config.messages) {
        config.messages.forEach((msg: any, idx: number) => {
          if (msg.text) {
            newVariables[`message_${idx}`] = msg.text;
            // Enviar mensagem para o chat
            if (onBotMessage) {
              onBotMessage(msg.text, currentNode.data);
            }
          }
        });
      }
      
      // Para blocos de questão
      else if (currentNode.data.type === 'ask_question' && config.question) {
        newVariables['question'] = config.question;
        if (onBotMessage) {
          onBotMessage(config.question, currentNode.data);
        }
      }
      
      // Para blocos de geração de relatório
      else if (currentNode.data.type === 'crm_gerar_relatorio') {
        const message = `📊 Gerando relatório em formato ${config.outputType || 'PDF'}...`;
        if (onBotMessage) {
          onBotMessage(message, currentNode.data);
        }
      }
      
      // Para blocos de webhook
      else if (currentNode.data.type === 'webhook') {
        const message = `🔗 Executando webhook: ${config.url || 'URL configurada'}`;
        if (onBotMessage) {
          onBotMessage(message, currentNode.data);
        }
      }
      
      // Para blocos de condição
      else if (currentNode.data.type === 'condition') {
        const message = `⚙️ Avaliando condições...`;
        if (onBotMessage) {
          onBotMessage(message, currentNode.data);
        }
      }
      
      // Para blocos de definir campo
      else if (currentNode.data.type === 'set_field') {
        const fieldName = config.field || 'campo';
        const message = `✏️ Definindo ${fieldName}...`;
        if (onBotMessage) {
          onBotMessage(message, currentNode.data);
        }
      }
      
      // Para blocos de transferência para omnichannel
      else if (currentNode.data.type === 'transferir_omnichannel') {
        const workflowId = config.workflowId;
        const workflowNome = config.workflowNome || 'workflow omnichannel';
        const message = `🔄 Transferindo para ${workflowNome}...`;
        
        console.log('🔄 Bloco transferir_omnichannel detectado:', { workflowId, workflowNome });
        
        if (onBotMessage) {
          onBotMessage(message, currentNode.data);
        }
        
        // Notificar o componente pai sobre a transferência
        if (onOmnichannelTransfer && workflowId) {
          console.log('✅ Notificando transferência para workflow:', workflowId);
          onOmnichannelTransfer(workflowId);
        } else {
          console.warn('⚠️ workflowId não encontrado no bloco ou callback não definido');
        }
      }
      
      // Para blocos genéricos com label
      else if (currentNode.data.label && currentNode.data.type !== 'start') {
        const message = `⚡ Executando: ${currentNode.data.label}`;
        if (onBotMessage) {
          onBotMessage(message, currentNode.data);
        }
      }
      
      // Para outros blocos, adicionar todas as configs
      Object.entries(config).forEach(([key, value]) => {
        if (key !== 'messages' && key !== 'question' && value !== undefined && value !== null) {
          newVariables[key] = value;
        }
      });
    }

    // Se precisa de input, pausar e aguardar
    if (needsInput) {
      console.log('⏸️ Bloco precisa de input, pausando execução');
      const variableName = currentNode.data.config?.variable || 'user_input';
      
      setExecutionState(prev => ({
        ...prev,
        variables: newVariables,
        waitingForInput: true,
        expectedVariable: variableName,
        currentStep: prev.currentStep + 1,
      }));
      
      // Pausar auto-play se estiver ativo
      setIsAutoPlaying(false);
      return;
    }

    // Encontrar próximo node seguindo as edges
    const outgoingEdge = edges.find(e => e.source === currentNode.id);
    const nextNode = outgoingEdge 
      ? nodes.find(n => n.id === outgoingEdge.target)
      : null;

    console.log('➡️ Próximo node:', nextNode?.id, nextNode?.data?.label);

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
    }));

    if (isComplete) {
      console.log('🏁 Fluxo concluído!');
    }
  }, [executionState, nodes, edges]);

  // Processar resposta do usuário
  const processUserResponse = useCallback((response: string) => {
    if (!executionState.waitingForInput) {
      console.warn('⚠️ Não está aguardando input do usuário');
      return;
    }

    console.log('✅ Recebendo resposta do usuário:', response);

    // Atualizar variáveis com a resposta
    const newVariables = {
      ...executionState.variables,
      [executionState.expectedVariable || 'user_input']: response,
    };

    // Marcar node atual como executado e avançar para o próximo
    const currentNode = nodes.find(n => n.id === executionState.currentNodeId);
    if (!currentNode) return;

    const newExecutedNodes = new Set([...executionState.executedNodes, currentNode.id]);

    // Encontrar próximo node
    const outgoingEdge = edges.find(e => e.source === currentNode.id);
    const nextNode = outgoingEdge 
      ? nodes.find(n => n.id === outgoingEdge.target)
      : null;

    console.log('➡️ Avançando para próximo node:', nextNode?.id, nextNode?.data?.label);

    // Atualizar estado e continuar execução
    setExecutionState(prev => ({
      ...prev,
      currentNodeId: nextNode?.id || null,
      executedNodes: newExecutedNodes,
      variables: newVariables,
      waitingForInput: false,
      expectedVariable: undefined,
      isComplete: !nextNode,
    }));
  }, [executionState, nodes, edges]);

  // Expor função para o componente pai
  useEffect(() => {
    if (onUserResponse) {
      // This is a bit of a hack, but we need to expose this function
      // to the parent component somehow
      (window as any).__flowSimulationProcessUserResponse = processUserResponse;
    }
  }, [onUserResponse, processUserResponse]);

  const executePreviousStep = useCallback(() => {
    if (executionState.currentStep === 0) {
      console.log('⏮️ Já está no início');
      return;
    }

    // Encontrar edge reversa
    const currentNode = nodes.find(n => n.id === executionState.currentNodeId);
    const incomingEdge = edges.find(e => e.target === currentNode?.id);
    const previousNode = incomingEdge 
      ? nodes.find(n => n.id === incomingEdge.source)
      : null;

    // Remover o node atual dos executados
    const newExecutedNodes = new Set(executionState.executedNodes);
    if (executionState.currentNodeId) {
      newExecutedNodes.delete(executionState.currentNodeId);
    }

    setExecutionState(prev => ({
      ...prev,
      currentNodeId: previousNode?.id || null,
      executedNodes: newExecutedNodes,
      isComplete: false,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));

    console.log('⏮️ Retrocedeu para:', previousNode?.id);
  }, [executionState, nodes, edges]);

  const resetSimulation = () => {
    console.log('🔄 Resetando simulação');
    setIsAutoPlaying(false);
    setExecutionState({
      currentNodeId: null,
      executedNodes: new Set(),
      variables: {},
      isPaused: false,
      isComplete: false,
      currentStep: 0,
      waitingForInput: false,
    });
    
    // Notificar componente pai para limpar o chat
    if (onReset) {
      onReset();
    }
  };

  // Auto-play: executar automaticamente os passos
  useEffect(() => {
    if (!isAutoPlaying || executionState.isComplete || executionState.waitingForInput) {
      if (executionState.isComplete) {
        setIsAutoPlaying(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      executeNextStep();
    }, 800); // Delay de 800ms entre cada passo

    return () => clearTimeout(timer);
  }, [isAutoPlaying, executionState.isComplete, executionState.waitingForInput, executionState.currentStep, executeNextStep]);

  const toggleAutoPlay = () => {
    setIsAutoPlaying(prev => !prev);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header com controles */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">Simulação Visual - {flowType}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {bot?.name || fluxo?.nome || 'Fluxo'} • {nodes.length} blocos • Canal: {simulation.config.canal}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={executionState.isComplete ? "secondary" : "default"}>
                Passo {executionState.currentStep} / {nodes.length}
              </Badge>
              {executionState.currentNodeId && (
                <Badge variant="outline" className="bg-primary/10">
                  Executando: {nodes.find(n => n.id === executionState.currentNodeId)?.data?.label}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isAutoPlaying ? "default" : "outline"}
              onClick={toggleAutoPlay}
              disabled={executionState.isComplete && !isAutoPlaying || executionState.waitingForInput}
            >
              {isAutoPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Play Automático
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={executePreviousStep}
              disabled={executionState.currentStep === 0 || isAutoPlaying || executionState.waitingForInput}
            >
              <SkipForward className="w-4 h-4 mr-1 rotate-180" />
              Anterior
            </Button>

            <Button
              size="sm"
              onClick={executeNextStep}
              disabled={executionState.isComplete || isAutoPlaying || executionState.waitingForInput}
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

            {executionState.waitingForInput && (
              <Badge variant="default" className="ml-2 animate-pulse">
                ⏸️ Aguardando resposta do usuário...
              </Badge>
            )}

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
              defaultEdgeOptions={{
                style: { strokeWidth: 2, stroke: '#94a3b8' },
                type: 'smoothstep',
                animated: true,
              }}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls />
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
      </div>

      {/* Painel lateral de variáveis à direita */}
      <div className="flex-shrink-0">
        <VariableMonitor 
          variables={executionState.variables} 
          title="Variáveis do Fluxo"
        />
      </div>
    </div>
  );
}
