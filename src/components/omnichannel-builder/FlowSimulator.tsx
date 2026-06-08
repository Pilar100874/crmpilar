import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, RotateCcw, Clock, Users, Star, Zap, CheckCircle, XCircle, AlertCircle, ArrowRight, HelpCircle, Lightbulb } from "lucide-react";
import type { OmnichannelNode, OmnichannelEdge } from "@/types/omnichannelFlow";

interface FlowSimulatorProps {
  nodes: OmnichannelNode[];
  edges: OmnichannelEdge[];
  onHighlightPath: (nodeIds: string[]) => void;
}

interface SimulationStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export const FlowSimulator = ({ nodes, edges, onHighlightPath }: FlowSimulatorProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  
  // Parâmetros de simulação
  const [customerType, setCustomerType] = useState<'normal' | 'vip' | 'new'>('normal');
  const [customerLanguage, setCustomerLanguage] = useState('pt-BR');
  const [isDuringBusinessHours, setIsDuringBusinessHours] = useState(true);
  const [queueCapacity, setQueueCapacity] = useState<'available' | 'full'>('available');

  const resetSimulation = () => {
    setSteps([]);
    setCurrentPath([]);
    setIsRunning(false);
    onHighlightPath([]);
  };

  const addStep = (node: OmnichannelNode, status: 'success' | 'warning' | 'error', message: string) => {
    const step: SimulationStep = {
      nodeId: node.id,
      nodeLabel: node.data.label,
      nodeType: node.data.type,
      status,
      message,
      timestamp: new Date().toLocaleTimeString('pt-BR')
    };
    setSteps(prev => [...prev, step]);
    setCurrentPath(prev => [...prev, node.id]);
  };

  const simulateFlow = async () => {
    resetSimulation();
    setIsRunning(true);

    // Encontrar nó inicial
    const startNode = nodes.find(n => n.data.type === 'inicio');
    if (!startNode) {
      setSteps([{
        nodeId: 'error',
        nodeLabel: 'Erro',
        nodeType: 'error',
        status: 'error',
        message: 'Nó inicial não encontrado. Adicione um bloco de início ao fluxo.',
        timestamp: new Date().toLocaleTimeString('pt-BR')
      }]);
      setIsRunning(false);
      return;
    }

    // Simular percurso
    let currentNodeId = startNode.id;
    const visited = new Set<string>();
    const maxSteps = 20; // Prevenir loops infinitos
    let stepCount = 0;

    addStep(startNode, 'success', 'Cliente iniciou conversa');
    await delay(800);

    while (currentNodeId && stepCount < maxSteps) {
      if (visited.has(currentNodeId) && stepCount > 0) {
        break; // Evitar loop infinito
      }
      visited.add(currentNodeId);
      stepCount++;

      // Encontrar próxima conexão
      const nextEdge = edges.find(e => e.source === currentNodeId);
      if (!nextEdge) {
        break;
      }

      const nextNode = nodes.find(n => n.id === nextEdge.target);
      if (!nextNode) {
        break;
      }

      // Simular lógica do bloco
      await delay(600);
      const result = simulateNodeLogic(nextNode);
      addStep(nextNode, result.status, result.message);

      if (result.status === 'error') {
        break;
      }

      currentNodeId = nextNode.id;

      // Se chegou em uma fila, parar a simulação
      if (nextNode.data.type === 'fila') {
        await delay(500);
        setSteps(prev => [...prev, {
          nodeId: 'final',
          nodeLabel: 'Fim da Simulação',
          nodeType: 'final',
          status: 'success',
          message: `Cliente foi direcionado para ${nextNode.data.label}`,
          timestamp: new Date().toLocaleTimeString('pt-BR')
        }]);
        break;
      }
    }

    setIsRunning(false);
    
    // Destacar caminho percorrido
    onHighlightPath(currentPath);
  };

  const simulateNodeLogic = (node: OmnichannelNode): { status: 'success' | 'warning' | 'error', message: string } => {
    switch (node.data.type) {
      case 'horario':
        if (isDuringBusinessHours) {
          return { status: 'success', message: 'Dentro do horário comercial' };
        } else {
          return { status: 'warning', message: 'Fora do horário - Enviando mensagem automática' };
        }

      case 'regra_roteamento':
        if (customerType === 'vip') {
          return { status: 'success', message: 'Cliente VIP identificado - Prioridade alta' };
        } else if (customerType === 'new') {
          return { status: 'success', message: 'Novo cliente - Roteamento especial' };
        } else {
          return { status: 'success', message: 'Cliente regular - Roteamento padrão' };
        }

      case 'skill':
        return { status: 'success', message: `Verificando skill: ${node.data.config?.skillNome || 'N/A'} - Atendente encontrado` };

      case 'webhook':
        return { status: 'success', message: 'Webhook executado - Dados do cliente carregados' };

      case 'fila':
        if (queueCapacity === 'available') {
          return { status: 'success', message: `Entrando na fila: ${node.data.label}` };
        } else {
          return { status: 'warning', message: 'Fila cheia - Redirecionando para fila alternativa' };
        }

      case 'aguardar':
        const tempo = node.data.config?.tempo || 60;
        return { status: 'success', message: `Aguardando ${tempo} segundos` };

      case 'atendente':
        return { status: 'success', message: 'Atendente específico encontrado' };

      case 'publicar_rede_social':
        const plataformas = node.data.config?.platforms || [];
        const modo = node.data.config?.publishMode === 'ask' ? 'perguntar' : 'todas';
        return { status: 'success', message: `Publicação ${modo === 'perguntar' ? 'aguardando escolha da rede' : `enviada para ${plataformas.length > 0 ? plataformas.join(', ') : 'redes selecionadas'}`}` };

      default:
        return { status: 'success', message: `Processando: ${node.data.label}` };
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'warning' | 'error') => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status]} className="text-xs">
        {status === 'success' ? 'OK' : status === 'warning' ? 'Alerta' : 'Erro'}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Simulador de Fluxo
          </CardTitle>
          <CardDescription>
            Configure um cenário e simule como um cliente seria roteado pelo fluxo
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Dica de Uso */}
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Como usar:</strong> Configure um cenário de cliente abaixo e clique em "Iniciar Simulação". 
            O simulador vai mostrar o caminho exato que o chat percorre pelo seu fluxo, destacando cada etapa no canvas.
          </AlertDescription>
        </Alert>

        {/* Configurações de Simulação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Tipo de Cliente</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Simula diferentes perfis de cliente para testar regras de priorização</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={customerType} onValueChange={(v: any) => setCustomerType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Cliente Normal
                  </div>
                </SelectItem>
                <SelectItem value="vip">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Cliente VIP
                  </div>
                </SelectItem>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    Novo Cliente
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Idioma</Label>
            <Select value={customerLanguage} onValueChange={setCustomerLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (BR)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es-ES">Español (ES)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Horário</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Testa como o fluxo se comporta dentro e fora do horário comercial</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={isDuringBusinessHours ? 'business' : 'after'} onValueChange={(v) => setIsDuringBusinessHours(v === 'business')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-500" />
                    Horário Comercial
                  </div>
                </SelectItem>
                <SelectItem value="after">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    Fora do Horário
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Capacidade da Fila</Label>
            <Select value={queueCapacity} onValueChange={(v: any) => setQueueCapacity(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="full">Cheia (Overflow)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Botões de Ação */}
        <div className="flex gap-2">
          <Button 
            onClick={simulateFlow} 
            disabled={isRunning || nodes.length === 0}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Simulando...' : 'Iniciar Simulação'}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetSimulation}
            disabled={steps.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>

        {/* Resultado da Simulação */}
        {steps.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-base font-semibold">Caminho Percorrido</Label>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div key={`${step.nodeId}-${index}`} className="flex items-start gap-3">
                      <div className="mt-1">
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{step.nodeLabel}</span>
                          {getStatusBadge(step.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{step.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {step.timestamp}
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Resumo da Simulação
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total de Etapas</div>
                  <div className="font-semibold">{steps.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Sucessos</div>
                  <div className="font-semibold text-green-600">
                    {steps.filter(s => s.status === 'success').length}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Alertas/Erros</div>
                  <div className="font-semibold text-yellow-600">
                    {steps.filter(s => s.status !== 'success').length}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {steps.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Configure os parâmetros e clique em "Iniciar Simulação"</p>
            <p className="text-sm mt-1">O simulador vai mostrar o caminho que o chat percorre</p>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};