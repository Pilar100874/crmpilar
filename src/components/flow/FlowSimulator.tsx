import { useState, useEffect, useRef } from "react";
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
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
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
  const [isActive, setIsActive] = useState(true);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    handleReset();
  }, []);

  useEffect(() => {
    if (currentNodeId) {
      onHighlightNode?.(currentNodeId);
    }
  }, [currentNodeId, onHighlightNode]);

  useEffect(() => {
    return () => {
      setIsActive(false);
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, []);

  const safeSetTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      if (isActive) {
        callback();
      }
    }, delay);
    timeoutsRef.current.push(timeout);
    return timeout;
  };

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
    
    console.log("Executing node:", nodeData.type, { type: nodeData.type, label: nodeData.label, config });

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
        console.log("send_message config:", config);
        // Suporte para múltiplas mensagens
        const messages = config.messages || [];
        console.log("messages array:", messages);
        if (messages.length > 0) {
          console.log("Processing multiple messages:", messages.length);
          messages.forEach((msg: any, index: number) => {
            console.log("Scheduling message", index, ":", msg);
            safeSetTimeout(() => {
              const messageText = interpolateVariables(msg.text || "", context);
              console.log("Adding message text:", messageText);
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
        } else {
          // Fallback para texto simples
          console.log("Using fallback text:", config.text);
          const messageText = interpolateVariables(config.text || "Mensagem não configurada", context);
          addBotMessage(messageText, node.id);
          
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        }
        break;

      case "media":
        console.log("media config:", config);
        const mediaType = config.mediaType || "image";
        const mediaUrl = interpolateVariables(config.url || "", context);
        const caption = interpolateVariables(config.caption || "", context);
        console.log("media details:", { mediaType, mediaUrl, caption });
        
        if (!mediaUrl) {
          console.log("No media URL, adding fallback message");
          addBotMessage("📎 [Mídia não configurada]", node.id);
        } else {
          console.log("Adding media message with URL:", mediaUrl);
          addBotMediaMessage(mediaUrl, mediaType as any, caption, node.id);
        }
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, caption ? 1500 : 1000);
        break;

      case "goodbye":
        const goodbyeText = interpolateVariables(config.text || "Até logo!", context);
        addBotMessage(goodbyeText, node.id);
        
        if (config.showStartAgain !== false) {
          safeSetTimeout(() => {
            addSystemMessage("💬 Conversa finalizada. Clique em 'Reiniciar' para começar novamente.");
          }, 1000);
        }
        
        setIsWaitingInput(false);
        break;

      case "ask_name":
      case "ask_question":
      case "ask_email":
      case "ask_number":
      case "ask_phone":
      case "ask_date":
      case "ask_file":
      case "ask_address":
      case "ask_url":
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

        safeSetTimeout(() => {
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

        safeSetTimeout(() => {
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
        safeSetTimeout(() => {
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
          
          safeSetTimeout(() => {
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
        safeSetTimeout(() => {
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
        
        safeSetTimeout(() => {
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
        
        safeSetTimeout(() => {
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

      case "ai_agent":
        const aiModel = config.model || "gpt-4";
        const systemPrompt = config.systemPrompt || "Você é um assistente útil";
        addSystemMessage(`🤖 Agente IA ativado (${aiModel})`);
        
        if (isWaitingInput) {
          // Se está esperando input, responde com IA
          safeSetTimeout(() => {
            addBotMessage("Esta é uma resposta simulada do agente IA. Em produção, aqui seria processada uma resposta real.", node.id);
            setIsWaitingInput(true); // Continua aguardando input
          }, 1500);
        } else {
          // Senão, apenas passa para o próximo
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        }
        break;

      case "reply_buttons":
        const replyText = interpolateVariables(config.text || "", context);
        const replyButtons = config.buttons || [];
        
        if (replyText) {
          addBotMessage(replyText, node.id);
        }
        
        if (replyButtons.length > 0) {
          const buttonsList = replyButtons.map((btn: any) => `▶️ ${btn.title || btn.text}`).join("\n");
          safeSetTimeout(() => {
            addSystemMessage(`Botões disponíveis:\n${buttonsList}`);
          }, 500);
        }
        
        setIsWaitingInput(true);
        setPendingVariable(config.variable || "button_response");
        break;

      case "list_buttons":
        const listText = interpolateVariables(config.text || "", context);
        const buttonText = config.buttonText || "Ver opções";
        const sections = config.sections || [];
        
        if (listText) {
          addBotMessage(listText, node.id);
        }
        
        safeSetTimeout(() => {
          addSystemMessage(`📋 ${buttonText}`);
          sections.forEach((section: any, idx: number) => {
            addSystemMessage(`\n${section.title || `Seção ${idx + 1}`}:`);
            (section.rows || []).forEach((row: any) => {
              addSystemMessage(`  ▶️ ${row.title}`);
            });
          });
        }, 500);
        
        setIsWaitingInput(true);
        setPendingVariable(config.variable || "list_response");
        break;

      case "keyword_options":
        const keywords = config.keywords || [];
        addSystemMessage("🔑 Aguardando palavra-chave...");
        
        if (keywords.length > 0) {
          const keywordsList = keywords.map((kw: any) => `"${kw.keyword}"`).join(", ");
          safeSetTimeout(() => {
            addSystemMessage(`Palavras-chave disponíveis: ${keywordsList}`);
          }, 500);
        }
        
        setIsWaitingInput(true);
        break;

      case "message_template":
        const templateName = config.templateName || "não configurado";
        const language = config.language || "pt_BR";
        addSystemMessage(`📧 Enviando template: ${templateName} (${language})`);
        addBotMessage("📧 [Template do WhatsApp enviado]", node.id);
        
        safeSetTimeout(() => {
          addSuccessMessage("Template enviado com sucesso");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "opt_in_out":
        const optAction = config.action || "opt-in";
        const category = config.category || "marketing";
        addSystemMessage(`✅ ${optAction === "opt-in" ? "Registrando" : "Removendo"} consentimento (${category})`);
        
        safeSetTimeout(() => {
          addSuccessMessage(`Consentimento ${optAction === "opt-in" ? "registrado" : "removido"} com sucesso`);
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "opt_in_check":
        const checkCategory = config.category || "marketing";
        addSystemMessage(`🔍 Verificando consentimento (${checkCategory})`);
        
        // Simula que o usuário tem opt-in
        const hasOptIn = true;
        safeSetTimeout(() => {
          if (hasOptIn) {
            addSuccessMessage("Usuário possui consentimento");
          } else {
            addSystemMessage("Usuário não possui consentimento");
          }
          
          const nextNode = getNextNode(node.id, hasOptIn ? 0 : 1);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "audience":
        const segments = config.segments || [];
        const audienceAction = config.action || "add";
        addSystemMessage(`👥 ${audienceAction === "add" ? "Adicionando a" : "Removendo de"} segmentos: ${segments.join(", ")}`);
        
        safeSetTimeout(() => {
          addSuccessMessage("Segmentação atualizada");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "set_field":
        const operations = config.operations || [];
        addSystemMessage("📝 Definindo campos...");
        
        operations.forEach((op: any) => {
          const value = interpolateVariables(op.value || "", context);
          setContext((prev) => ({
            ...prev,
            [op.field]: value,
          }));
          addSuccessMessage(`${op.field} = ${value}`);
        });
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "keyword_jump":
        const jumpKeywords = config.keywords || [];
        addSystemMessage("🔀 Aguardando palavra-chave para pular...");
        
        if (jumpKeywords.length > 0) {
          const jumpList = jumpKeywords.map((kw: any) => `"${kw.keyword}" → ${kw.targetNode}`).join(", ");
          safeSetTimeout(() => {
            addSystemMessage(`Pulos disponíveis: ${jumpList}`);
          }, 500);
        }
        
        setIsWaitingInput(true);
        break;

      case "global_keywords":
        const globalKeywords = config.keywords || [];
        addSystemMessage(`🌐 Palavras-chave globais ativas: ${globalKeywords.length}`);
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "formulas":
        const formula = config.formula || "";
        const outputVariable = config.outputVariable || "result";
        addSystemMessage(`🧮 Calculando: ${formula}`);
        
        try {
          const interpolatedFormula = interpolateVariables(formula, context);
          // eslint-disable-next-line no-eval
          const result = eval(interpolatedFormula);
          
          setContext((prev) => ({
            ...prev,
            [outputVariable]: result,
          }));
          
          safeSetTimeout(() => {
            addSuccessMessage(`${outputVariable} = ${result}`);
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        } catch (error) {
          addSystemMessage(`❌ Erro ao calcular fórmula: ${error}`);
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        }
        break;

      case "jump_to":
        const targetNodeId = config.targetNodeId || "";
        addSystemMessage(`⏭️ Pulando para bloco: ${targetNodeId}`);
        
        safeSetTimeout(() => {
          const targetNode = nodes.find((n) => n.id === targetNodeId);
          if (targetNode) {
            setCurrentNodeId(targetNode.id);
            executeNode(targetNode);
          } else {
            addSystemMessage("❌ Bloco de destino não encontrado");
          }
        }, 500);
        break;

      case "lead_scoring":
        const scoreField = config.scoreField || "lead_score";
        const points = config.points || 0;
        const scoringAction = config.action || "add";
        
        const currentScore = context[scoreField] || 0;
        const newScore = scoringAction === "add" ? currentScore + points : currentScore - points;
        
        setContext((prev) => ({
          ...prev,
          [scoreField]: newScore,
        }));
        
        addSystemMessage(`📊 ${scoringAction === "add" ? "+" : "-"}${points} pontos`);
        addSuccessMessage(`${scoreField} = ${newScore}`);
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "goal":
        const goalName = config.goalName || "conversão";
        const goalValue = config.value || 0;
        addSystemMessage(`🎯 Meta atingida: ${goalName}`);
        addSuccessMessage(`Valor: ${goalValue}`);
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "webhook":
        const webhookUrl = interpolateVariables(config.url || "", context);
        const method = config.method || "POST";
        addSystemMessage(`🌐 Chamando webhook: ${method} ${webhookUrl}`);
        
        safeSetTimeout(() => {
          const mockResponse = {
            status: 200,
            data: { success: true, message: "Webhook simulado" },
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockResponse.data,
            }));
          }
          
          addSuccessMessage("Webhook respondeu com sucesso");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 2000);
        break;

      case "trigger_automation":
        const automationId = config.automationId || "não configurado";
        addSystemMessage(`⚡ Disparando automação: ${automationId}`);
        
        safeSetTimeout(() => {
          addSuccessMessage("Automação disparada");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1500);
        break;

      case "dynamic_data":
        const source = config.source || "não configurado";
        const query = config.query || "";
        const dataOutputVariable = config.outputVariable || "data";
        addSystemMessage(`💾 Buscando dados: ${source}`);
        
        safeSetTimeout(() => {
          const mockData = { items: [], count: 0, timestamp: new Date().toISOString() };
          
          setContext((prev) => ({
            ...prev,
            [dataOutputVariable]: mockData,
          }));
          
          addSuccessMessage(`Dados salvos em "${dataOutputVariable}"`);
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
        safeSetTimeout(() => {
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
          safeSetTimeout(() => {
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
    console.log("Adding bot message:", text);
    const msg: Message = {
      id: Date.now().toString(),
      sender: "bot",
      text,
      timestamp: new Date(),
      nodeId,
    };
    setMessages((prev) => {
      console.log("Messages before:", prev.length, "after:", prev.length + 1);
      return [...prev, msg];
    });
  };

  const addBotMediaMessage = (mediaUrl: string, mediaType: "image" | "video" | "audio" | "file", caption: string, nodeId?: string) => {
    console.log("Adding bot media message:", { mediaUrl, mediaType, caption });
    const msg: Message = {
      id: Date.now().toString(),
      sender: "bot",
      text: caption || "",
      timestamp: new Date(),
      nodeId,
      mediaUrl,
      mediaType,
    };
    setMessages((prev) => {
      console.log("Media messages before:", prev.length, "after:", prev.length + 1);
      return [...prev, msg];
    });
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
    // Limpar todos os timeouts pendentes
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current = [];
    
    // Reativar o simulador
    setIsActive(true);
    
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
                    className={`max-w-[80%] rounded-2xl overflow-hidden ${
                      msg.sender === "user"
                        ? "bg-gradient-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.mediaUrl && (
                      <div className="w-full">
                        {msg.mediaType === "image" && (
                          <img 
                            src={msg.mediaUrl} 
                            alt="Media" 
                            className="w-full max-w-xs object-cover"
                            onError={(e) => {
                              console.error("Image failed to load:", msg.mediaUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        {msg.mediaType === "video" && (
                          <video 
                            src={msg.mediaUrl} 
                            controls 
                            className="w-full max-w-xs"
                          />
                        )}
                        {msg.mediaType === "audio" && (
                          <audio 
                            src={msg.mediaUrl} 
                            controls 
                            className="w-full"
                          />
                        )}
                        {msg.mediaType === "file" && (
                          <div className="p-4 flex items-center gap-2">
                            <span>📄</span>
                            <a 
                              href={msg.mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm underline"
                            >
                              Download arquivo
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`flex items-start gap-2 ${msg.mediaUrl ? 'px-4 py-2' : 'px-4 py-2'}`}>
                      {msg.sender === "bot" && <Bot className="w-4 h-4 mt-0.5" />}
                      {msg.sender === "user" && <User className="w-4 h-4 mt-0.5" />}
                      <div className="flex-1">
                        {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
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
