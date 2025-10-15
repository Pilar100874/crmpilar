import { useState, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, RotateCcw, User, Bot, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { BLOCK_DEFINITIONS } from "@/types/flow";

interface Message {
  id: string;
  sender: "user" | "bot" | "system" | "success";
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
    handleReset();
  }, []);

  useEffect(() => {
    if (currentNodeId) {
      onHighlightNode?.(currentNodeId);
    }
  }, [currentNodeId, onHighlightNode]);

  const interpolateVariables = (text: string, context: Record<string, any>): string => {
    if (!text) return "";
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const value = context[variable.trim()];
      return value !== undefined ? String(value) : match;
    });
  };

  const evaluateExpression = (expression: string, context: Record<string, any>): boolean => {
    try {
      const interpolated = interpolateVariables(expression, context);
      // Avaliação básica de expressões
      // eslint-disable-next-line no-eval
      return eval(interpolated);
    } catch {
      return false;
    }
  };

  const findStartNode = () => {
    return nodes.find((node) => {
      const nodeData = node.data as any;
      return nodeData.type === "start";
    });
  };

  const getNextNode = (currentId: string, conditionIndex?: number) => {
    const outgoingEdges = edges.filter((edge) => edge.source === currentId);
    
    if (outgoingEdges.length === 0) return null;
    
    // Se houver índice de condição, tenta encontrar a edge específica
    if (conditionIndex !== undefined && outgoingEdges[conditionIndex]) {
      const nextEdge = outgoingEdges[conditionIndex];
      return nodes.find((node) => node.id === nextEdge.target);
    }
    
    // Caso contrário, pega a primeira
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
        addSystemMessage("✅ Fluxo iniciado");
        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "message":
        const messageText = interpolateVariables(config.text || "Mensagem não configurada", context);
        addBotMessage(messageText, node.id);
        
        // Se houver variável de saída, salva a mensagem enviada
        if (config.outputVariable) {
          setContext((prev) => ({
            ...prev,
            [config.outputVariable]: messageText,
          }));
        }
        
        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "question":
        const question = interpolateVariables(config.question || "Pergunta não configurada", context);
        const variable = config.variable || "resposta";
        addBotMessage(question, node.id);
        setIsWaitingInput(true);
        setPendingVariable(variable);
        break;

      case "condition":
        addSystemMessage("🔀 Avaliando condições...");
        const conditions = config.conditions || [];
        
        let matchedIndex = -1;
        for (let i = 0; i < conditions.length; i++) {
          const condition = conditions[i];
          if (evaluateExpression(condition.expression, context)) {
            matchedIndex = i;
            addSuccessMessage(`Condição ${i + 1} atendida: ${condition.label || condition.expression}`);
            break;
          }
        }

        setTimeout(() => {
          if (matchedIndex >= 0) {
            const nextNode = getNextNode(node.id, matchedIndex);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          } else {
            addSystemMessage("Nenhuma condição atendida, seguindo caminho padrão");
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }
        }, 1000);
        break;

      case "variables":
        addSystemMessage("📝 Atualizando variáveis...");
        try {
          const operation = config.operation || "set";
          const variablesJson = interpolateVariables(config.variables || "{}", context);
          const variables = JSON.parse(variablesJson);

          if (operation === "set") {
            setContext((prev) => ({ ...prev, ...variables }));
            addSuccessMessage(`Variáveis definidas: ${Object.keys(variables).join(", ")}`);
          } else if (operation === "unset") {
            setContext((prev) => {
              const newContext = { ...prev };
              Object.keys(variables).forEach((key) => delete newContext[key]);
              return newContext;
            });
            addSuccessMessage(`Variáveis removidas: ${Object.keys(variables).join(", ")}`);
          } else if (operation === "merge") {
            setContext((prev) => {
              const merged = { ...prev };
              Object.entries(variables).forEach(([key, value]) => {
                if (typeof value === "object" && typeof merged[key] === "object") {
                  merged[key] = { ...merged[key], ...value };
                } else {
                  merged[key] = value;
                }
              });
              return merged;
            });
            addSuccessMessage(`Variáveis mescladas: ${Object.keys(variables).join(", ")}`);
          }
        } catch (error) {
          addSystemMessage(`❌ Erro ao processar variáveis: ${error}`);
        }

        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "api":
        const apiUrl = interpolateVariables(config.url || "", context);
        addSystemMessage(`🌐 Chamando API: ${config.method || "GET"} ${apiUrl}`);
        
        // Simula resposta da API
        setTimeout(() => {
          const mockResponse = {
            status: 200,
            data: {
              success: true,
              message: "Resposta simulada da API",
              timestamp: new Date().toISOString(),
            },
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockResponse.data,
            }));
            addSuccessMessage(`API respondeu. Dados salvos em "${config.outputVariable}"`);
          } else {
            addSuccessMessage("API respondeu com sucesso");
          }
          
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 2000);
        break;

      case "script":
        addSystemMessage("⚙️ Executando script...");
        try {
          // Simula execução de script
          const code = config.code || "";
          addSuccessMessage("Script executado com sucesso");
          
          // Em produção, aqui seria executado em sandbox
          const mockResult = { executed: true };
          setContext((prev) => ({
            ...prev,
            script_result: mockResult,
          }));
          
          setTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        } catch (error) {
          addSystemMessage(`❌ Erro ao executar script: ${error}`);
        }
        break;

      case "delay":
        const duration = config.duration || 5;
        const unit = config.unit || "seconds";
        addSystemMessage(`⏱️ Aguardando ${duration} ${unit}...`);
        
        // Simula com tempo reduzido para testes
        const simulatedDelay = Math.min(3000, duration * 100);
        setTimeout(() => {
          addSuccessMessage("Delay concluído");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, simulatedDelay);
        break;

      case "handoff":
        const department = config.department || "equipe";
        const priority = config.priority || "normal";
        addSystemMessage(`👤 Transferindo para ${department} (prioridade: ${priority})`);
        addBotMessage("Um agente humano irá atendê-lo em breve.", node.id);
        addSuccessMessage("Transferência realizada com sucesso");
        setIsWaitingInput(false);
        break;

      case "n8n":
        const workflowId = config.workflowId || "não configurado";
        addSystemMessage(`🔗 Chamando workflow n8n: ${workflowId}`);
        
        setTimeout(() => {
          const mockN8nResponse = {
            workflowId,
            success: true,
            data: { processed: true },
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockN8nResponse,
            }));
          }
          
          addSuccessMessage("Workflow n8n executado");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 2000);
        break;

      case "intent":
        const inputVar = config.inputVariable || "user_message";
        const inputText = context[inputVar] || "";
        addSystemMessage(`🧠 Classificando intent: "${inputText}"`);
        
        setTimeout(() => {
          const mockIntent = {
            intent: "greeting",
            confidence: 0.95,
            entities: [],
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockIntent,
            }));
          }
          
          addSuccessMessage(`Intent detectado: ${mockIntent.intent} (${mockIntent.confidence * 100}%)`);
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1500);
        break;

      case "fallback":
        addBotMessage("Desculpe, não entendi. Pode reformular?", node.id);
        addSystemMessage("⚠️ Fallback acionado");
        setIsWaitingInput(true);
        break;

      default:
        addSystemMessage(`▶️ Executando: ${blockDef.label}`);
        setTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          } else {
            addSuccessMessage("Fluxo concluído!");
          }
        }, 1000);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    addUserMessage(input);

    if (pendingVariable) {
      setContext((prev) => ({
        ...prev,
        [pendingVariable]: input,
      }));
      
      addSuccessMessage(`Variável "${pendingVariable}" = "${input}"`);
      setPendingVariable(null);
      setIsWaitingInput(false);

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

  const addSuccessMessage = (text: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      sender: "success",
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
          <CardTitle className="text-sm">🧪 Simulador de Teste</CardTitle>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reiniciar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
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
                ) : msg.sender === "success" ? (
                  <div className="w-full flex items-center gap-2 text-xs text-success">
                    <CheckCircle className="w-3 h-3" />
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
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
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

        {Object.keys(context).length > 0 && (
          <>
            <div className="p-3 bg-muted/50 max-h-40 overflow-auto">
              <h4 className="text-xs font-medium mb-2">📦 Contexto (Variáveis)</h4>
              <div className="space-y-1">
                {Object.entries(context).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-xs">
                    <Badge variant="outline" className="font-mono text-xs">
                      {key}
                    </Badge>
                    <span className="text-muted-foreground truncate">
                      {typeof value === "object" 
                        ? JSON.stringify(value).substring(0, 50) + "..."
                        : String(value).substring(0, 50)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

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
