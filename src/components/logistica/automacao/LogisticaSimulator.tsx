import { useState, useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, RotateCcw, Truck, Bot, AlertCircle, CheckCircle, 
  MapPin, Gauge, Clock, MessageCircle, Bell, Mail, Pause
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { LOGISTICA_BLOCKS, LogisticaBlockType } from '@/types/automacaoLogistica';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SimulatorMessage {
  id: string;
  type: 'system' | 'action' | 'condition' | 'success' | 'error';
  text: string;
  timestamp: Date;
  nodeId?: string;
  icon?: React.ReactNode;
}

interface SimulatorContext {
  velocidade: number;
  tempoParado: number;
  latitude: number;
  longitude: number;
  horaAtual: string;
  dentroArea: boolean;
}

interface LogisticaSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onHighlightNode?: (nodeId: string | null) => void;
  breakpointNodes?: Set<string>;
  skipNodes?: Set<string>;
}

export const LogisticaSimulator = ({
  nodes,
  edges,
  onHighlightNode,
  breakpointNodes = new Set(),
  skipNodes = new Set(),
}: LogisticaSimulatorProps) => {
  const [messages, setMessages] = useState<SimulatorMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [context, setContext] = useState<SimulatorContext>({
    velocidade: 60,
    tempoParado: 0,
    latitude: -23.5505,
    longitude: -46.6333,
    horaAtual: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    dentroArea: true,
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (currentNodeId) {
      onHighlightNode?.(currentNodeId);
    }
  }, [currentNodeId, onHighlightNode]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current = [];
      onHighlightNode?.(null);
    };
  }, [onHighlightNode]);

  const addMessage = (type: SimulatorMessage['type'], text: string, nodeId?: string, icon?: React.ReactNode) => {
    const msg: SimulatorMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type,
      text,
      timestamp: new Date(),
      nodeId,
      icon,
    };
    setMessages(prev => [...prev, msg]);
  };

  const safeSetTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(callback, delay);
    timeoutsRef.current.push(timeout);
    return timeout;
  };

  const findStartNode = () => {
    return nodes.find(node => (node.data as any).type === 'iniciar_automacao');
  };

  const getNextNode = (currentId: string, handleId?: string) => {
    const outgoingEdges = edges.filter(edge => {
      if (edge.source !== currentId) return false;
      if (handleId && edge.sourceHandle !== handleId) return false;
      return true;
    });
    
    if (outgoingEdges.length === 0) return null;
    return nodes.find(node => node.id === outgoingEdges[0].target);
  };

  const evaluateCondition = (node: Node): 'yes' | 'no' => {
    const data = node.data as any;
    const config = data.config || {};

    switch (data.type) {
      case 'condicao_parado':
        const tempoMin = config.tempo_minutos || 30;
        return context.tempoParado >= tempoMin ? 'yes' : 'no';
      
      case 'condicao_velocidade':
        const velLimite = config.velocidade_km || 80;
        const operador = config.operador_velocidade || 'maior';
        if (operador === 'maior') {
          return context.velocidade > velLimite ? 'yes' : 'no';
        }
        return context.velocidade < velLimite ? 'yes' : 'no';
      
      case 'condicao_chegada':
        // Simula chegada baseado em distância (simplificado)
        return Math.random() > 0.5 ? 'yes' : 'no';
      
      case 'condicao_saida_area':
        return context.dentroArea ? 'no' : 'yes';
      
      case 'condicao_horario':
        const [horaAtual] = context.horaAtual.split(':').map(Number);
        const [horaInicio] = (config.horario_inicio || '08:00').split(':').map(Number);
        const [horaFim] = (config.horario_fim || '18:00').split(':').map(Number);
        const dentroHorario = horaAtual >= horaInicio && horaAtual <= horaFim;
        return dentroHorario ? 'yes' : 'no';
      
      default:
        return 'yes';
    }
  };

  const executeNode = (node: Node) => {
    if (!isRunning || isPaused) return;

    const data = node.data as any;
    const blockDef = LOGISTICA_BLOCKS.find(b => b.type === data.type);

    setCurrentNodeId(node.id);

    // Check skip
    if (skipNodes.has(node.id)) {
      addMessage('system', `⏭️ Bloco "${blockDef?.label}" pulado`, node.id);
      safeSetTimeout(() => {
        const next = getNextNode(node.id);
        if (next) executeNode(next);
        else finishSimulation();
      }, 300);
      return;
    }

    // Check breakpoint
    if (breakpointNodes.has(node.id)) {
      addMessage('system', `⏸️ Pausa no bloco "${blockDef?.label}"`, node.id, <Pause className="w-4 h-4 text-orange-500" />);
      setIsPaused(true);
      return;
    }

    switch (data.type) {
      case 'iniciar_automacao':
        addMessage('success', '✅ Automação iniciada', node.id, <Play className="w-4 h-4 text-green-500" />);
        safeSetTimeout(() => {
          const next = getNextNode(node.id);
          if (next) executeNode(next);
          else finishSimulation();
        }, 500);
        break;

      case 'condicao_parado':
      case 'condicao_velocidade':
      case 'condicao_chegada':
      case 'condicao_saida_area':
      case 'condicao_horario':
        const result = evaluateCondition(node);
        const resultLabel = result === 'yes' 
          ? (blockDef?.outputLabels?.[0] || 'Sim') 
          : (blockDef?.outputLabels?.[1] || 'Não');
        
        addMessage(
          'condition',
          `🔀 ${blockDef?.label}: ${resultLabel}`,
          node.id,
          result === 'yes' 
            ? <CheckCircle className="w-4 h-4 text-green-500" />
            : <AlertCircle className="w-4 h-4 text-red-500" />
        );
        
        safeSetTimeout(() => {
          const next = getNextNode(node.id, result);
          if (next) executeNode(next);
          else finishSimulation();
        }, 800);
        break;

      case 'acao_whatsapp':
        addMessage(
          'action',
          `📱 WhatsApp enviado para ${data.config?.telefone || 'destinatário'}`,
          node.id,
          <MessageCircle className="w-4 h-4 text-green-500" />
        );
        safeSetTimeout(() => {
          const next = getNextNode(node.id);
          if (next) executeNode(next);
          else finishSimulation();
        }, 600);
        break;

      case 'acao_notificacao':
        addMessage(
          'action',
          `🔔 Notificação: ${data.config?.titulo_notificacao || 'Alerta'}`,
          node.id,
          <Bell className="w-4 h-4 text-orange-500" />
        );
        safeSetTimeout(() => {
          const next = getNextNode(node.id);
          if (next) executeNode(next);
          else finishSimulation();
        }, 600);
        break;

      case 'acao_email':
        addMessage(
          'action',
          `📧 E-mail enviado para ${data.config?.email_destino || 'destinatário'}`,
          node.id,
          <Mail className="w-4 h-4 text-blue-500" />
        );
        safeSetTimeout(() => {
          const next = getNextNode(node.id);
          if (next) executeNode(next);
          else finishSimulation();
        }, 600);
        break;

      default:
        safeSetTimeout(() => {
          const next = getNextNode(node.id);
          if (next) executeNode(next);
          else finishSimulation();
        }, 500);
    }
  };

  const finishSimulation = () => {
    addMessage('success', '🏁 Simulação finalizada!', undefined, <CheckCircle className="w-4 h-4 text-green-500" />);
    setIsRunning(false);
    setCurrentNodeId(null);
    onHighlightNode?.(null);
  };

  const handleStart = () => {
    const startNode = findStartNode();
    if (!startNode) {
      toast({
        title: 'Erro',
        description: 'Adicione um bloco "Iniciar Automação" para simular.',
        variant: 'destructive',
      });
      return;
    }

    setMessages([]);
    setIsRunning(true);
    setIsPaused(false);
    
    addMessage('system', '🚀 Iniciando simulação...', undefined, <Truck className="w-4 h-4 text-primary" />);
    
    safeSetTimeout(() => {
      executeNode(startNode);
    }, 500);
  };

  const handleContinue = () => {
    setIsPaused(false);
    if (currentNodeId) {
      const currentNode = nodes.find(n => n.id === currentNodeId);
      if (currentNode) {
        const next = getNextNode(currentNodeId);
        if (next) {
          safeSetTimeout(() => executeNode(next), 300);
        } else {
          finishSimulation();
        }
      }
    }
  };

  const handleReset = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    setMessages([]);
    setIsRunning(false);
    setIsPaused(false);
    setCurrentNodeId(null);
    onHighlightNode?.(null);
  };

  const getMessageStyle = (type: SimulatorMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'action':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'condition':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="w-5 h-5" />
          Simulador de Automação
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Controles de contexto */}
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <Label className="text-xs font-medium">Valores de Simulação</Label>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Velocidade
              </span>
              <Badge variant="outline">{context.velocidade} km/h</Badge>
            </div>
            <Slider
              value={[context.velocidade]}
              onValueChange={([v]) => setContext(prev => ({ ...prev, velocidade: v }))}
              max={200}
              step={5}
              disabled={isRunning}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs flex items-center gap-1">
                <Pause className="w-3 h-3" /> Tempo Parado
              </span>
              <Badge variant="outline">{context.tempoParado} min</Badge>
            </div>
            <Slider
              value={[context.tempoParado]}
              onValueChange={([v]) => setContext(prev => ({ ...prev, tempoParado: v }))}
              max={120}
              step={5}
              disabled={isRunning}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" /> Hora Atual
            </span>
            <Input
              type="time"
              value={context.horaAtual}
              onChange={(e) => setContext(prev => ({ ...prev, horaAtual: e.target.value }))}
              className="w-24 h-7 text-xs"
              disabled={isRunning}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Dentro da Área
            </span>
            <Button
              variant={context.dentroArea ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setContext(prev => ({ ...prev, dentroArea: !prev.dentroArea }))}
              disabled={isRunning}
            >
              {context.dentroArea ? 'Sim' : 'Não'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="space-y-2 pr-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                Configure os valores e clique em "Iniciar" para simular a automação.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg border text-xs ${getMessageStyle(msg.type)}`}
                >
                  <div className="flex items-start gap-2">
                    {msg.icon}
                    <span className="flex-1">{msg.text}</span>
                    <span className="text-[10px] opacity-60">
                      {msg.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="flex-1" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Iniciar Simulação
            </Button>
          ) : isPaused ? (
            <Button onClick={handleContinue} className="flex-1" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Continuar
            </Button>
          ) : (
            <Button disabled className="flex-1" size="sm">
              <Bot className="w-4 h-4 mr-2 animate-pulse" />
              Executando...
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
