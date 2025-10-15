import { useState, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, RotateCcw, User, Bot, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BLOCK_DEFINITIONS } from "@/types/flow";

interface Message {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: Date;
  nodeId?: string;
}

interface FlowSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onHighlightNode?: (nodeId: string | null) => void;
}

export const FlowSimulator = ({ nodes, edges, onHighlightNode }: FlowSimulatorProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [context, setContext] = useState<Record<string, any>>({});
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [pendingVariable, setPendingVariable] = useState<string | null>(null);

  useEffect(() => {
    // Inicia o fluxo
    handleReset();
  }, []);

  useEffect(() => {
    if (currentNodeId) {
      onHighlightNode?.(currentNodeId);
    }
  }, [currentNodeId, onHighlightNode]);

  const findStartNode = () => {
    return nodes.find((node) => {
      const nodeData = node.data as any;
      return nodeData.type === "start";
    });
  };

  const getNextNode = (currentId: string, condition?: any) => {
    const outgoingEdges = edges.filter((edge) => edge.source === currentId);
    
    if (outgoingEdges.length === 0) return null;
    
    // Se houver condição, seleciona a edge correta
    // Por enquanto, pega a primeira
    const nextEdge = outgoingEdges[0];
    return nodes.find((node) => node.id === nextEdge.target);
  };

  const executeNode = async (node: Node) => {
    const nodeData = node.data as any;
    const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === nodeData.type);
    
    if (!blockDef) return;

    const config = nodeData.config || {};

    switch (nodeData.type) {
      case "start":
        addSystemMessage("Fluxo iniciado");
        // Vai para o próximo automaticamente
        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "message":
        const messageText = config.text || "Mensagem não configurada";
        addBotMessage(messageText, node.id);
        // Vai para o próximo automaticamente
        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "question":
        const question = config.question || "Pergunta não configurada";
        const variable = config.variable || "resposta";
        addBotMessage(question, node.id);
        setIsWaitingInput(true);
        setPendingVariable(variable);
        // Aguarda resposta do usuário
        break;

      case "condition":
        addSystemMessage("Avaliando condição...");
        // Simulação: avalia primeira condição como verdadeira
        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "api":
        const apiUrl = config.url || "não configurada";
        addSystemMessage(`Chamando API: ${apiUrl}`);
        setTimeout(() => {
          addSystemMessage("Resposta da API recebida (simulado)");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1500);
        break;

      case "delay":
        const duration = config.duration || 5;
        const unit = config.unit || "seconds";
        addSystemMessage(`Aguardando ${duration} ${unit}...`);
        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 2000); // Simula com 2s
        break;

      case "handoff":
        const department = config.department || "equipe";
        addSystemMessage(`Transferindo para ${department}`);
        addBotMessage("Um agente humano irá atendê-lo em breve.", node.id);
        setIsWaitingInput(false);
        break;

      case "script":
        addSystemMessage("Executando script...");
        try {
          // Simula execução do script
          addSystemMessage("Script executado com sucesso");
          setTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 500);
        } catch (error) {
          addSystemMessage("Erro ao executar script");
        }
        break;

      case "n8n":
        const workflowId = config.workflowId || "não configurado";
        addSystemMessage(`Chamando workflow n8n: ${workflowId}`);
        setTimeout(() => {
          addSystemMessage("Workflow n8n executado (simulado)");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1500);
        break;

      case "fallback":
        addBotMessage("Desculpe, não entendi. Pode reformular?", node.id);
        setIsWaitingInput(true);
        break;

      default:
        addSystemMessage(`Executando: ${blockDef.label}`);
        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    addUserMessage(input);

    if (pendingVariable) {
      // Armazena a resposta no contexto
      setContext((prev) => ({
        ...prev,
        [pendingVariable]: input,
      }));
      setPendingVariable(null);
      setIsWaitingInput(false);

      // Continua o fluxo
      if (currentNodeId) {
        const nextNode = getNextNode(currentNodeId);
        if (nextNode) {
          setTimeout(() => {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }, 500);
        }
      }
    }

    setInput("");
  };

  const addUserMessage = (text: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const addBotMessage = (text: string, nodeId?: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      sender: "bot",
      text,
      timestamp: new Date(),
      nodeId,
    };
    setMessages((prev) => [...prev, msg]);
  };

  const addSystemMessage = (text: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      sender: "system",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleReset = () => {
    setMessages([]);
    setContext({});
    setIsWaitingInput(false);
    setPendingVariable(null);
    
    const startNode = findStartNode();
    if (startNode) {
      setCurrentNodeId(startNode.id);
      executeNode(startNode);
      toast.info("Simulação iniciada");
    } else {
      toast.error("Adicione um bloco 'Start' para iniciar o fluxo");
      addSystemMessage("❌ Nenhum bloco 'Start' encontrado. Adicione um para iniciar.");
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-card">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Simulador de Teste</CardTitle>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reiniciar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "system" ? (
                  <div className="w-full flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="w-3 h-3" />
                    <span>{msg.text}</span>
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.sender === "user"
                        ? "bg-gradient-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.sender === "bot" && <Bot className="w-4 h-4 mt-0.5" />}
                      {msg.sender === "user" && <User className="w-4 h-4 mt-0.5" />}
                      <div>
                        <p className="text-sm">{msg.text}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* Context Variables */}
        {Object.keys(context).length > 0 && (
          <>
            <div className="p-3 bg-muted/50">
              <h4 className="text-xs font-medium mb-2">Variáveis do Contexto</h4>
              <div className="space-y-1">
                {Object.entries(context).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-xs">
                    <Badge variant="outline" className="font-mono">
                      {key}
                    </Badge>
                    <span className="text-muted-foreground">
                      {typeof value === "object" ? JSON.stringify(value) : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder={
                isWaitingInput
                  ? "Digite sua resposta..."
                  : "Aguardando próximo passo..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={!isWaitingInput}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!isWaitingInput || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
};
