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
  buttons?: Array<{ text: string; value: string }>;
}

interface FlowSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onHighlightNode?: (nodeId: string | null) => void;
  breakpointNodes?: Set<string>;
  skipNodes?: Set<string>;
  onContextChange?: (context: Record<string, any>) => void;
}

export const FlowSimulator = ({ nodes, edges, onHighlightNode, breakpointNodes = new Set(), skipNodes = new Set(), onContextChange }: FlowSimulatorProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [context, setContext] = useState<Record<string, any>>({});
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [pendingVariable, setPendingVariable] = useState<string | null>(null);
  const [currentBlockType, setCurrentBlockType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const contextRef = useRef<Record<string, any>>({});

  useEffect(() => {
    // Garantir que isActive está true quando o componente monta
    setIsActive(true);
    handleReset();
    
    return () => {
      // Cleanup quando desmonta
      setIsActive(false);
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
      onHighlightNode?.(null);
    };
  }, []);

  useEffect(() => {
    if (currentNodeId) {
      onHighlightNode?.(currentNodeId);
    }
  }, [currentNodeId, onHighlightNode]);

  useEffect(() => {
    contextRef.current = context;
    onContextChange?.(context);
  }, [context, onContextChange]);

  const safeSetTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      if (isActive) {
        callback();
      }
    }, delay);
    timeoutsRef.current.push(timeout);
    return timeout;
  };

  const formatText = (text: string) => {
    if (!text) return null;
    
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let key = 0;

    // Regex para detectar formatações: *negrito*, _itálico_, ~tachado~, ```código```
    const regex = /(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)|(```([^`]+)```)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Adiciona texto antes da formatação
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>);
      }

      // Identifica o tipo de formatação
      if (match[1]) {
        // Negrito: *texto*
        parts.push(<strong key={`bold-${key++}`}>{match[2]}</strong>);
      } else if (match[3]) {
        // Itálico: _texto_
        parts.push(<em key={`italic-${key++}`}>{match[4]}</em>);
      } else if (match[5]) {
        // Tachado: ~texto~
        parts.push(<span key={`strike-${key++}`} className="line-through">{match[6]}</span>);
      } else if (match[7]) {
        // Código: ```texto```
        parts.push(
          <code key={`code-${key++}`} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
            {match[8]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Adiciona texto restante
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  const interpolateVariables = (text: string, ctx?: Record<string, any>): string => {
    if (!text) return "";
    const primary = ctx || {};
    const fallback = contextRef.current || {};
    console.log("🔄 Interpolating variables in text:", text);
    console.log("📦 Provided context:", primary);
    console.log("📦 Fallback (latest) context:", fallback);
    
    const result = text.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const cleanVar = variable.trim();
      const varWithoutAt = cleanVar.replace(/^@/, "");
      const value =
        primary[cleanVar] ??
        primary[varWithoutAt] ??
        fallback[cleanVar] ??
        fallback[varWithoutAt];
      
      console.log(`🔍 Lookup: "${cleanVar}" →`, value !== undefined ? value : "NOT FOUND");
      
      return value !== undefined ? String(value) : match;
    });
    
    console.log("✅ Interpolation result:", result);
    return result;
  };

  const normalizeVarName = (name?: string | null): string => {
    if (!name) return "";
    return name.trim().replace(/^@/, "").replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");
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

    // Verificar se o bloco deve ser pulado
    if (skipNodes.has(node.id)) {
      addSystemMessage(`⏭️ Bloco "${blockDef.label}" pulado`);
      safeSetTimeout(() => {
        const nextNode = getNextNode(node.id);
        if (nextNode) {
          setCurrentNodeId(nextNode.id);
          executeNode(nextNode);
        }
      }, 300);
      return;
    }

    // Verificar se há breakpoint neste bloco
    if (breakpointNodes.has(node.id)) {
      addSystemMessage(`⏸️ Pausa de breakpoint no bloco "${blockDef.label}"`);
      return; // Interrompe a execução aqui
    }

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
        const goodbyeText = interpolateVariables(config.message || config.text || "Até logo!", context);
        addBotMessage(goodbyeText, node.id);
        
        console.log("Goodbye config:", config);
        console.log("showSocialButtons:", config.showSocialButtons);
        
        let finalDelay = 500;
        
        // Exibir botões sociais se configurado
        if (config.showSocialButtons) {
          console.log("Social buttons enabled");
          safeSetTimeout(() => {
            const socialLinks = JSON.parse(localStorage.getItem("socialLinks") || "{}");
            console.log("Social links from localStorage:", socialLinks);
            const buttons = [];
            
            if (config.socialWhatsApp && socialLinks.whatsapp) {
              console.log("Adding WhatsApp button");
              buttons.push({ text: "📱 WhatsApp", value: socialLinks.whatsapp });
            }
            if (config.socialInstagram && socialLinks.instagram) {
              console.log("Adding Instagram button");
              buttons.push({ text: "📷 Instagram", value: socialLinks.instagram });
            }
            if (config.socialFacebook && socialLinks.facebook) {
              console.log("Adding Facebook button");
              buttons.push({ text: "👥 Facebook", value: socialLinks.facebook });
            }
            if (config.socialWebsite && socialLinks.website) {
              console.log("Adding Website button");
              buttons.push({ text: "🌐 Website", value: socialLinks.website });
            }
            
            console.log("Total buttons:", buttons.length);
            
            if (buttons.length > 0) {
              const messageId = `msg-${Date.now()}-social`;
              setMessages((prev) => [
                ...prev,
                {
                  id: messageId,
                  sender: "bot",
                  text: "Nos acompanhe em nossas redes sociais:",
                  timestamp: new Date(),
                  nodeId: node.id,
                  buttons,
                },
              ]);
              console.log("Social buttons message added");
            } else {
              console.log("No buttons to show - check if links are configured in Config page");
            }
          }, 500);
          finalDelay = 1500; // Aumentar o delay final se mostrou botões sociais
        } else {
          console.log("Social buttons NOT enabled");
        }
        
        if (config.showStartAgainButton !== false) {
          safeSetTimeout(() => {
            addSystemMessage("💬 Conversa finalizada. Clique em 'Reiniciar' para começar novamente.");
          }, finalDelay);
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
        const type = (node.data as any)?.type as string;
        const defaults: Record<string, string> = {
          ask_name: "nome",
          ask_question: "resposta",
          ask_email: "email",
          ask_number: "numero",
          ask_phone: "telefone",
          ask_date: "data",
          ask_file: "arquivo",
          ask_address: "endereco",
          ask_url: "url",
        };
        const rawVar = config.variable || defaults[type] || "resposta";
        const variable = normalizeVarName(rawVar);
        const question = interpolateVariables(config.question || "Pergunta não configurada", context);
        console.log("❓ Question block:", { 
          type, 
          rawVar, 
          variable, 
          question,
          fullConfig: config,
          currentContext: context 
        });
        addBotMessage(question, node.id);
        setIsWaitingInput(true);
        setPendingVariable(variable);
        console.log("⏳ Waiting for input, pendingVariable set to:", variable);
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

      case "trigger_automation":
        const platform = config.platform || "zapier";
        const automationId = config.automationId || "não configurado";
        addSystemMessage(`⚡ Disparando automação em ${platform}: ${automationId}`);
        
        safeSetTimeout(() => {
          const mockAutomationResponse = {
            platform,
            automationId,
            success: true,
            data: { triggered: true },
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockAutomationResponse,
            }));
          }
          
          addSuccessMessage("Automação disparada com sucesso");
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
        const replyHeader = interpolateVariables(config.header || "", context);
        const replyText = interpolateVariables(config.text || "", context);
        const replyFooter = interpolateVariables(config.footer || "", context);
        const replyButtons = config.buttons || [];
        const replyImage = config.image || config.mediaUrl;
        
        console.log("reply_buttons config:", { replyButtons, variable: config.variable, context });
        
        // Exibir imagem se houver
        if (replyImage) {
          addBotMediaMessage(replyImage, "image", "", node.id);
        }
        
        // Exibir header
        if (replyHeader) {
          safeSetTimeout(() => {
            addBotMessage(`*${replyHeader}*`, node.id);
          }, replyImage ? 500 : 0);
        }
        
        // Exibir texto com botões
        const delay = (replyImage ? 500 : 0) + (replyHeader ? 500 : 0);
        safeSetTimeout(() => {
          const msgWithButtons: Message = {
            id: Date.now().toString(),
            sender: "bot",
            text: replyText,
            timestamp: new Date(),
            nodeId: node.id,
            buttons: replyButtons.map((btn: any, idx: number) => ({
              text: btn.label || btn.text || `Botão ${idx + 1}`,
              value: btn.value || btn.text || `button_${idx}`,
              buttonId: `button_${idx}`
            }))
          };
          console.log("Created message with buttons:", msgWithButtons);
          setMessages((prev) => [...prev, msgWithButtons]);
        }, delay);
        
        // Exibir footer
        if (replyFooter) {
          safeSetTimeout(() => {
            addSystemMessage(`ℹ️ ${replyFooter}`);
          }, delay + 500);
        }
        
        setIsWaitingInput(true);
        setCurrentBlockType("reply_buttons");
        setPendingVariable(normalizeVarName(config.variable || "button_response"));
        console.log("Waiting for button input, pendingVariable:", normalizeVarName(config.variable || "button_response"));
        break;

      case "list_buttons":
        const listText = interpolateVariables(config.text || "", context);
        const listHeader = config.header ? interpolateVariables(config.header, context) : null;
        const listFooter = config.footer ? interpolateVariables(config.footer, context) : null;
        const buttonText = config.buttonText || config.listHeader || "Ver opções";
        const sections = config.sections || [];
        
        if (listHeader) {
          addSystemMessage(`📌 ${listHeader}`);
        }
        
        if (listText) {
          addBotMessage(listText, node.id);
        }
        
        if (listFooter) {
          safeSetTimeout(() => {
            addSystemMessage(`ℹ️ ${listFooter}`);
          }, delay + 200);
        }
        
        // Criar botões clicáveis para os itens
        safeSetTimeout(() => {
          const allButtons: any[] = [];
          sections.forEach((section: any, sectionIdx: number) => {
            (section.items || []).forEach((item: any, itemIdx: number) => {
              allButtons.push({
                text: item.label,
                value: item.value || item.label,
                buttonId: `section_${sectionIdx}_item_${itemIdx}`,
              });
            });
          });
          
          setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            sender: "system",
            text: buttonText,
            timestamp: new Date(),
            buttons: allButtons,
            nodeId: node.id,
          }]);
        }, delay + 400);
        
        setIsWaitingInput(true);
        setCurrentBlockType("list_buttons");
        setPendingVariable(normalizeVarName(config.variable || "list_response"));
        break;

      case "keyword_options":
        const koQuestion = interpolateVariables(config.question || "Escolha uma opção:", context);
        const koButtons = config.buttons || [];
        const showValidation = config.showValidationError !== false;
        
        // Mostrar pergunta
        addBotMessage(koQuestion, node.id);
        
        // Criar botões numerados clicáveis
        safeSetTimeout(() => {
          const numberedButtons = koButtons.map((btn: any, idx: number) => ({
            text: `${idx + 1}. ${btn.label || `Opção ${idx + 1}`}`,
            value: btn.label || `Opção ${idx + 1}`,
            buttonId: `button_${idx}`,
            keywords: btn.keywords || [],
          }));
          
          setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            sender: "system",
            text: "",
            timestamp: new Date(),
            buttons: numberedButtons,
            nodeId: node.id,
          }]);
        }, 500);
        
        setIsWaitingInput(true);
        setCurrentBlockType("keyword_options");
        setPendingVariable(normalizeVarName(config.variable || "opcao_escolhida"));
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

    console.log("📨 handleSendMessage called with:", { 
      input, 
      pendingVariable,
      currentBlockType,
      currentContext: context 
    });

    addUserMessage(input);

    if (pendingVariable) {
      const cleanVarName = normalizeVarName(pendingVariable);
      
      // Tratamento especial para keyword_options
      if (currentBlockType === "keyword_options" && currentNodeId) {
        const currentNode = nodes.find((n) => n.id === currentNodeId);
        if (currentNode) {
          const nodeData = currentNode.data as any;
          const koConfig = nodeData?.config || {};
          const koButtons = koConfig.buttons || [];
          const showValidation = koConfig.showValidationError !== false;
          
          // Verificar se o input contém alguma keyword ou número
          let matchedButtonIndex = -1;
          
          // Primeiro, verificar se é um número (1, 2, 3...)
          const inputNum = parseInt(input.trim());
          if (!isNaN(inputNum) && inputNum >= 1 && inputNum <= koButtons.length) {
            matchedButtonIndex = inputNum - 1;
          } else {
            // Se não é número, procurar keywords nos botões
            const inputLower = input.toLowerCase();
            koButtons.forEach((btn: any, idx: number) => {
              if (matchedButtonIndex === -1 && btn.keywords) {
                const keywords = Array.isArray(btn.keywords) ? btn.keywords : [];
                // Verificar se alguma keyword está contida no input (sem pontuação grudada)
                keywords.forEach((keyword: string) => {
                  if (keyword && matchedButtonIndex === -1) {
                    const keywordLower = keyword.toLowerCase();
                    // Regex para verificar se keyword está no input com espaços ou no início/fim
                    const regex = new RegExp(`(^|\\s)${keywordLower}($|\\s)`, 'i');
                    if (regex.test(inputLower) || inputLower === keywordLower) {
                      matchedButtonIndex = idx;
                    }
                  }
                });
              }
            });
          }
          
          if (matchedButtonIndex >= 0) {
            // Keyword encontrada - salvar input do usuário e rotear
            console.log("💾 Keyword matched at index:", matchedButtonIndex, "saving:", input);
            setContext((prev) => {
              const newContext = { ...prev, [cleanVarName]: input };
              contextRef.current = newContext;
              return newContext;
            });
            
            addSuccessMessage(`Variável "${cleanVarName}" = "${input}"`);
            setPendingVariable(null);
            setIsWaitingInput(false);
            setCurrentBlockType(null);
            
            // Rotear para o output do botão correspondente
            const buttonEdge = edges.find(
              (edge) => edge.source === currentNodeId && edge.sourceHandle === `button_${matchedButtonIndex}`
            );
            
            if (buttonEdge) {
              const nextNode = nodes.find((node) => node.id === buttonEdge.target);
              if (nextNode) {
                console.log("➡️ Routing to button output:", matchedButtonIndex);
                safeSetTimeout(() => {
                  setCurrentNodeId(nextNode.id);
                  executeNode(nextNode);
                }, 500);
                setInput("");
                return;
              }
            }
          } else {
            // Nenhuma keyword encontrada
            if (showValidation) {
              // Mostrar mensagem de erro e aguardar novamente
              addSystemMessage("⚠️ Resposta inválida. Por favor, digite um número ou uma das palavras-chave destacadas.");
              setInput("");
              return; // Mantém isWaitingInput=true, aguarda nova tentativa
            } else {
              // Usar output default (não salva variável)
              console.log("➡️ No keyword matched, routing to default output");
              setPendingVariable(null);
              setIsWaitingInput(false);
              setCurrentBlockType(null);
              
              const defaultEdge = edges.find(
                (edge) => edge.source === currentNodeId && edge.sourceHandle === "default"
              );
              
              if (defaultEdge) {
                const nextNode = nodes.find((node) => node.id === defaultEdge.target);
                if (nextNode) {
                  safeSetTimeout(() => {
                    setCurrentNodeId(nextNode.id);
                    executeNode(nextNode);
                  }, 500);
                  setInput("");
                  return;
                }
              }
            }
          }
        }
      }
      // Para reply_buttons: sempre salva o input (seja texto digitado ou clique)
      // Para list_buttons: só salva se for clique de botão (não salva texto digitado)
      else if (currentBlockType !== "list_buttons") {
        console.log("💾 [CRITICAL] Saving variable:", cleanVarName, "=", input);
        console.log("📦 [CRITICAL] Context before save:", context);
        
        setContext((prev) => {
          const newContext = { ...prev, [cleanVarName]: input };
          console.log("📦 [CRITICAL] Context after save:", newContext);
          console.log("✅ [CRITICAL] Variable saved successfully:", cleanVarName, "→", newContext[cleanVarName]);
          contextRef.current = newContext;
          
          return newContext;
        });
        
        addSuccessMessage(`Variável "${cleanVarName}" = "${input}"`);
      } else {
        console.log("⚠️ List buttons - not saving typed text to variable");
      }
      
      setPendingVariable(null);
      setIsWaitingInput(false);
      setCurrentBlockType(null);
      
      // Buscar o próximo nó - rota para "Any of the above" quando texto é digitado
      if (currentNodeId) {
        // Procurar edge "any_of_above" para texto digitado
        const anyOfAboveEdge = edges.find(
          (edge) => edge.source === currentNodeId && edge.sourceHandle === "any_of_above"
        );
        
        if (anyOfAboveEdge) {
          const nextNode = nodes.find((node) => node.id === anyOfAboveEdge.target);
          if (nextNode) {
            console.log("➡️ Routing to 'Any of the above' output");
            safeSetTimeout(() => {
              console.log("🚀 Executing 'Any of the above' node with context:", contextRef.current);
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }, 500);
            setInput("");
            return;
          }
        }
        
        // Fallback: próximo nó padrão
        const nextNode = getNextNode(currentNodeId);
        console.log("➡️ [CRITICAL] Next node after saving variable:", nextNode?.id);
        if (nextNode) {
          safeSetTimeout(() => {
            console.log("🚀 [CRITICAL] Executing next node with context:", contextRef.current);
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }, 500);
        }
      }
    }

    setInput("");
  };

  const handleButtonClick = (button: { text: string; value: string; buttonId?: string; keywords?: string[] }, nodeId?: string) => {
    console.log("🔘 Button clicked:", { button, nodeId, pendingVariable, currentBlockType });
    
    // Para keyword_options, extrair o texto sem o número
    let displayText = button.text;
    let saveValue = button.value;
    
    if (currentBlockType === "keyword_options") {
      // Remover o número do início (ex: "1. Opção" -> "Opção")
      displayText = button.text.replace(/^\d+\.\s*/, '');
      saveValue = displayText;
    }
    
    addUserMessage(displayText);
    
    if (pendingVariable) {
      const cleanVarName = normalizeVarName(pendingVariable);
      console.log("💾 [BUTTON] Saving variable:", cleanVarName, "with value:", saveValue);
      console.log("📦 [BUTTON] Context before save:", contextRef.current);
      
      // Atualizar contextRef.current IMEDIATAMENTE
      const newContext = { ...contextRef.current, [cleanVarName]: saveValue };
      contextRef.current = newContext;
      console.log("📦 [BUTTON] Context after save:", contextRef.current);
      console.log("✅ [BUTTON] Variable saved in contextRef:", cleanVarName, "→", contextRef.current[cleanVarName]);
      
      // Atualizar o estado também (para UI)
      setContext(newContext);
      
      if (onContextChange) {
        onContextChange(newContext);
      }
      
      addSuccessMessage(`Variável "${cleanVarName}" = "${saveValue}"`);
      setPendingVariable(null);
      setIsWaitingInput(false);
      setCurrentBlockType(null);

      if (nodeId) {
        // Procurar edge específica do botão usando o buttonId como sourceHandle
        const buttonEdge = edges.find(
          (edge) => edge.source === nodeId && edge.sourceHandle === button.buttonId
        );
        
        if (buttonEdge) {
          const nextNode = nodes.find((node) => node.id === buttonEdge.target);
          if (nextNode) {
            console.log("➡️ [BUTTON] Executing next node via button edge:", nextNode.id);
            console.log("🚀 [BUTTON] Context available for next node:", contextRef.current);
            safeSetTimeout(() => {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }, 500);
            return;
          }
        }
        
        // Fallback: usar índice do botão
        const buttonIndex = parseInt(button.buttonId?.split('_').pop() || '0');
        console.log("🔍 Finding next node with index:", buttonIndex);
        const nextNode = getNextNode(nodeId, buttonIndex);
        if (nextNode) {
          console.log("➡️ [BUTTON] Executing next node:", nextNode.id);
          console.log("🚀 [BUTTON] Context available for next node:", contextRef.current);
          safeSetTimeout(() => {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }, 500);
        } else {
          console.log("❌ No next node found");
        }
      }
    } else {
      console.log("⚠️ No pending variable to save");
    }
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
    const emptyContext = {};
    setContext(emptyContext);
    onContextChange?.(emptyContext); // Notifica imediatamente o reset
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
                        {msg.text && <p className="text-sm whitespace-pre-wrap">{formatText(msg.text)}</p>}
                        
                        {msg.buttons && msg.buttons.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.buttons.map((button, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="w-full justify-start bg-pink-500 hover:bg-pink-600 text-white border-pink-500"
                                onClick={() => handleButtonClick(button, msg.nodeId)}
                                disabled={!isWaitingInput}
                              >
                                {button.text}
                              </Button>
                            ))}
                          </div>
                        )}
                        
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
