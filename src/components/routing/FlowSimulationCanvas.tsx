import { useCallback, useEffect, useState, useImperativeHandle, forwardRef, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, RotateCcw, User, Bot, AlertCircle } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';

// Helper functions
const interpolateVariables = (text: string, context: Record<string, any>): string => {
  if (!text) return "";
  return text.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    const cleanVar = variable.trim().replace(/^@/, "");
    const value = context[cleanVar];
    return value !== undefined ? String(value) : match;
  });
};

const normalizeVarName = (name?: string | null): string => {
  if (!name) return "";
  return name.trim().replace(/^@/, "").replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");
};

const evaluateExpression = (expression: string, context: Record<string, any>): boolean => {
  try {
    const interpolated = interpolateVariables(expression, context);
    return eval(interpolated);
  } catch {
    return false;
  }
};

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "system" | "success";
  text: string;
  timestamp: Date;
  nodeId?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  buttons?: Array<{ text: string; value: string }>;
}

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
}

export interface FlowSimulationCanvasRef {
  processUserResponse: (response: string) => void;
  isWaitingForInput: () => boolean;
}

const FlowSimulationCanvas = forwardRef<FlowSimulationCanvasRef, FlowSimulationCanvasProps>(({
  simulation,
  bots,
  fluxos,
  onBotMessage,
  onReset,
  onOmnichannelTransfer,
}, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [context, setContext] = useState<Record<string, any>>({});
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [pendingVariable, setPendingVariable] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Determinar flow data
  const bot = bots.find(b => b.id === simulation.config.botId);
  const fluxo = fluxos.find(f => f.id === simulation.config.fluxoId);
  
  const rawFlowData = bot?.flow_data || fluxo?.flow_data;
  const flowData = typeof rawFlowData === 'string' ? JSON.parse(rawFlowData) : rawFlowData;
  const nodes: Node[] = flowData?.nodes || [];
  const edges: Edge[] = flowData?.edges || [];
  
  const canal = simulation.config.canal as "whatsapp" | "facebook" | "instagram" | "telegram" | "webchat";

  // Estilo do canal
  const getChannelStyles = () => {
    const styles = {
      whatsapp: {
        bg: "bg-[#ECE5DD]",
        userBubble: "bg-[#DCF8C6]",
        botBubble: "bg-white",
        headerBg: "bg-[#075E54]",
        headerText: "text-white",
        name: "WhatsApp",
      },
      facebook: {
        bg: "bg-white",
        userBubble: "bg-[#0084FF] text-white",
        botBubble: "bg-[#F0F0F0]",
        headerBg: "bg-[#0084FF]",
        headerText: "text-white",
        name: "Facebook",
      },
      instagram: {
        bg: "bg-white",
        userBubble: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white",
        botBubble: "bg-[#EFEFEF]",
        headerBg: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
        headerText: "text-white",
        name: "Instagram",
      },
      telegram: {
        bg: "bg-[#0E1621]",
        userBubble: "bg-[#3390EC] text-white",
        botBubble: "bg-[#212D3B] text-white",
        headerBg: "bg-[#2B5278]",
        headerText: "text-white",
        name: "Telegram",
      },
      webchat: {
        bg: "bg-white",
        userBubble: "bg-primary text-primary-foreground",
        botBubble: "bg-muted",
        headerBg: "bg-primary",
        headerText: "text-primary-foreground",
        name: "WebChat",
      }
    };
    return styles[canal] || styles.whatsapp;
  };

  const channelStyle = getChannelStyles();

  useEffect(() => {
    setIsActive(true);
    startSimulation();
    
    return () => {
      setIsActive(false);
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, [simulation.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const safeSetTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      if (isActive) {
        callback();
      }
    }, delay);
    timeoutsRef.current.push(timeout);
    return timeout;
  };

  const addBotMessage = (text: string, nodeId?: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "bot",
      text,
      timestamp: new Date(),
      nodeId,
    };
    setMessages(prev => [...prev, newMessage]);
    onBotMessage?.(text, { nodeId });
  };

  const addSystemMessage = (text: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "system",
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const findStartNode = () => {
    return nodes.find(node => (node.data as any)?.type === "start");
  };

  const getNextNode = (currentId: string) => {
    const outgoingEdge = edges.find(edge => edge.source === currentId);
    if (!outgoingEdge) return null;
    return nodes.find(node => node.id === outgoingEdge.target);
  };

  const executeNode = useCallback(async (node: Node) => {
    const nodeData = node.data as any;
    const config = nodeData.config || {};
    
    console.log('▶️ Executando node:', nodeData.type, nodeData.label);
    
    switch (nodeData.type) {
      case "start":
        addSystemMessage("✅ Fluxo iniciado");
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "send_message":
        const messages = config.messages || [];
        if (messages.length > 0) {
          messages.forEach((msg: any, index: number) => {
            safeSetTimeout(() => {
              const messageText = interpolateVariables(msg.text || "", context);
              addBotMessage(messageText, node.id);
            }, index * 500);
          });
          
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, messages.length * 500 + 500);
        }
        break;

      case "ask_name":
      case "ask_question":
      case "ask_email":
      case "ask_cnpj":
      case "ask_phone":
        const defaults: Record<string, string> = {
          ask_name: "nome",
          ask_question: "resposta",
          ask_email: "email",
          ask_phone: "telefone",
          ask_cnpj: "cnpj",
        };
        const rawVar = config.variable || defaults[nodeData.type] || "resposta";
        const variable = normalizeVarName(rawVar);
        const question = interpolateVariables(config.question || "Pergunta não configurada", context);
        
        addBotMessage(question, node.id);
        setIsWaitingInput(true);
        setPendingVariable(variable);
        break;

      case "transferir_omnichannel":
        const workflowId = config.workflowId;
        const workflowNome = config.workflowNome || 'workflow omnichannel';
        addSystemMessage(`🔄 Transferindo para ${workflowNome}...`);
        
        if (onOmnichannelTransfer && workflowId) {
          onOmnichannelTransfer(workflowId);
        }
        break;

      case "goodbye":
        const goodbyeText = interpolateVariables(config.message || "Até logo!", context);
        addBotMessage(goodbyeText, node.id);
        addSystemMessage("💬 Conversa finalizada");
        setIsWaitingInput(false);
        break;

      default:
        // Para outros blocos, apenas continuar
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;
    }
  }, [context, nodes, edges]);

  const startSimulation = () => {
    console.log('🚀 Iniciando simulação');
    setMessages([]);
    setContext({});
    setIsWaitingInput(false);
    setPendingVariable(null);
    
    const startNode = findStartNode();
    if (startNode) {
      setCurrentNodeId(startNode.id);
      executeNode(startNode);
    } else {
      addSystemMessage("❌ Nó inicial não encontrado");
    }
  };

  const processUserResponse = useCallback((response: string) => {
    if (!isWaitingInput || !pendingVariable) {
      console.warn('⚠️ Não está aguardando input');
      return;
    }

    console.log('✅ Processando resposta:', response, 'para variável:', pendingVariable);

    // Atualizar contexto
    const newContext = {
      ...context,
      [pendingVariable]: response,
    };
    setContext(newContext);

    // Limpar estado de espera
    setIsWaitingInput(false);
    setPendingVariable(null);

    // Continuar para próximo node
    if (currentNodeId) {
      const nextNode = getNextNode(currentNodeId);
      if (nextNode) {
        setCurrentNodeId(nextNode.id);
        executeNode(nextNode);
      }
    }
  }, [isWaitingInput, pendingVariable, context, currentNodeId]);

  const handleSendMessage = () => {
    if (!input.trim() || !isWaitingInput) return;

    // Adicionar mensagem do usuário
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);

    // Processar resposta
    processUserResponse(input);
    setInput("");
  };

  const handleReset = () => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current = [];
    onReset?.();
    startSimulation();
  };

  useImperativeHandle(ref, () => ({
    processUserResponse,
    isWaitingForInput: () => isWaitingInput,
  }), [processUserResponse, isWaitingInput]);

  const formatText = (text: string) => {
    if (!text) return text;
    
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let key = 0;

    const regex = /(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)|(```([^`]+)```)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>);
      }

      if (match[1]) {
        parts.push(<strong key={`bold-${key++}`}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={`italic-${key++}`}>{match[4]}</em>);
      } else if (match[5]) {
        parts.push(<span key={`strike-${key++}`} className="line-through">{match[6]}</span>);
      } else if (match[7]) {
        parts.push(
          <code key={`code-${key++}`} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
            {match[8]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header estilo chat */}
      <div className={`${channelStyle.headerBg} ${channelStyle.headerText} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6" />
          <div>
            <div className="font-semibold">{bot?.name || fluxo?.nome || 'Bot'}</div>
            <div className="text-xs opacity-90">{channelStyle.name}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-current hover:bg-white/10"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Área de mensagens */}
      <ScrollArea className={`flex-1 ${channelStyle.bg} p-4`}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[75%] rounded-lg px-4 py-2 shadow-sm
                  ${msg.sender === 'user' ? channelStyle.userBubble : 
                    msg.sender === 'system' ? 'bg-muted/50 text-muted-foreground text-xs text-center' :
                    channelStyle.botBubble}
                `}
              >
                {msg.sender === 'system' ? (
                  <div className="flex items-center gap-2 justify-center">
                    <AlertCircle className="w-3 h-3" />
                    <span>{msg.text}</span>
                  </div>
                ) : (
                  <div className="break-words whitespace-pre-wrap">
                    {formatText(msg.text)}
                  </div>
                )}
                <div className="text-xs opacity-70 mt-1 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t bg-background p-3">
        {isWaitingInput ? (
          <Badge variant="secondary" className="mb-2 w-full justify-center py-1">
            ⏸️ Aguardando resposta...
          </Badge>
        ) : null}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isWaitingInput ? "Digite sua resposta..." : "Chat simulado"}
            disabled={!isWaitingInput}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || !isWaitingInput}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

FlowSimulationCanvas.displayName = 'FlowSimulationCanvas';

export default FlowSimulationCanvas;
