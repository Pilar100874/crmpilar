import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import WebhookSelector from "@/components/chat/WebhookSelector";
import { Webhook, Sparkles, Send, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentType: "text" | "audio" | "image" | "file" | "variable";
  timestamp: Date;
  fileUrl?: string;
  fileName?: string;
  variables?: Record<string, string>;
}

export interface WebhookVariable {
  id: string;
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  format?: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: string;
  type: string;
  description: string;
  usageLocations: string[];
  hasVariables: boolean;
  variables?: WebhookVariable[];
  createdAt: Date;
}

export interface WebhookType {
  id: string;
  name: string;
}

export default function ChatWebhook() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [webhookTypes, setWebhookTypes] = useState<WebhookType[]>([
    { id: "n8n", name: "N8N" },
    { id: "waha", name: "WAHA" },
    { id: "whatsapp", name: "WhatsApp Oficial" },
  ]);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [showVariableForm, setShowVariableForm] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // AI Chat states
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiWebhooks, setAiWebhooks] = useState<WebhookConfig[]>([]);
  const [selectedAIWebhook, setSelectedAIWebhook] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedWebhooks = localStorage.getItem("webhooks");
    const savedTypes = localStorage.getItem("webhookTypes");
    if (savedWebhooks) {
      const parsed = JSON.parse(savedWebhooks);
      const loadedWebhooks = parsed.map((w: any) => ({ ...w, createdAt: new Date(w.createdAt) }));
      setWebhooks(loadedWebhooks);
      
      console.log("Total webhooks loaded:", loadedWebhooks.length);
      console.log("All webhooks:", loadedWebhooks.map((w: WebhookConfig) => ({
        name: w.name,
        usageLocations: w.usageLocations
      })));
      
      // Filter AI webhooks
      const aiWebhooksList = loadedWebhooks.filter((w: WebhookConfig) => {
        const locs = (w.usageLocations || []).map((l: string) => l.toLowerCase().replace(/[\s_]+/g, "-"));
        return locs.includes("menu-do-chat");
      });
      
      console.log("AI webhooks found:", aiWebhooksList.length);
      console.log("AI webhooks:", aiWebhooksList.map((w: WebhookConfig) => w.name));
      
      setAiWebhooks(aiWebhooksList);
      if (aiWebhooksList.length > 0) {
        setSelectedAIWebhook(aiWebhooksList[0].id);
      }
    }
    if (savedTypes) {
      setWebhookTypes(JSON.parse(savedTypes));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("webhooks", JSON.stringify(webhooks));
  }, [webhooks]);

  useEffect(() => {
    localStorage.setItem("webhookTypes", JSON.stringify(webhookTypes));
  }, [webhookTypes]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // Clear AI chat when webhook changes
  useEffect(() => {
    setAiMessages([]);
    setAiInput("");
  }, [selectedAIWebhook]);

  // Reset variable values when webhook changes
  useEffect(() => {
    if (selectedWebhook) {
      const webhook = webhooks.find((w) => w.id === selectedWebhook);
      if (webhook?.hasVariables && webhook.variables) {
        const defaultValues: Record<string, any> = {};
        webhook.variables.forEach(variable => {
          defaultValues[variable.name] = variable.defaultValue || "";
        });
        setVariableValues(defaultValues);
        setShowVariableForm(true);
      } else {
        setVariableValues({});
        setShowVariableForm(false);
      }
    } else {
      setVariableValues({});
      setShowVariableForm(false);
    }
  }, [selectedWebhook, webhooks]);

  const sendMessage = async (
    content: string,
    contentType: Message["contentType"],
    fileUrl?: string,
    fileName?: string,
    variables?: Record<string, string>
  ) => {
    if (!selectedWebhook) {
      toast.error("Selecione um webhook antes de enviar mensagens");
      return;
    }

    const webhook = webhooks.find((w) => w.id === selectedWebhook);
    if (!webhook) {
      toast.error("Webhook não encontrado");
      return;
    }

    // Validar variáveis obrigatórias
    if (webhook.hasVariables && webhook.variables) {
      const missingRequired = webhook.variables.filter(
        v => v.required && !variableValues[v.name]
      );
      if (missingRequired.length > 0) {
        toast.error(`Preencha as variáveis obrigatórias: ${missingRequired.map(v => v.name).join(", ")}`);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      contentType,
      timestamp: new Date(),
      fileUrl,
      fileName,
      variables: webhook.hasVariables ? variableValues : variables,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Preparar payload baseado nas variáveis
      let requestUrl = webhook.url;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      let bodyData: any = {
        timestamp: new Date().toISOString(),
        contentType,
        content,
        fileUrl,
        fileName,
      };

      // Processar variáveis por tipo
      if (webhook.hasVariables && webhook.variables) {
        webhook.variables.forEach(variable => {
          const value = variableValues[variable.name];
          
          if (variable.type === "header") {
            headers[variable.name] = value || variable.defaultValue || "";
          } else if (variable.type === "query") {
            const separator = requestUrl.includes("?") ? "&" : "?";
            requestUrl += `${separator}${variable.name}=${encodeURIComponent(value || variable.defaultValue || "")}`;
          } else if (variable.type === "path") {
            requestUrl = requestUrl.replace(`:${variable.name}`, value || variable.defaultValue || "");
          } else if (variable.type === "json") {
            bodyData[variable.name] = value || variable.defaultValue || "";
          }
          // form-data será implementado separadamente se necessário
        });
      }

      const response = await fetch(requestUrl, {
        method: webhook.method || "POST",
        headers,
        body: JSON.stringify(bodyData),
      });

      let responseData: any;
      const responseContentType = response.headers.get("content-type");
      
      if (responseContentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: typeof responseData === "string" ? responseData : JSON.stringify(responseData, null, 2),
        contentType: "text",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      if (!responseData || (typeof responseData === "string" && !responseData.trim())) {
        toast.warning("Webhook retornou resposta vazia");
      } else {
        toast.success("Mensagem enviada com sucesso!");
      }
    } catch (error: any) {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendAIMessage = async () => {
    if (!aiInput.trim() || !selectedAIWebhook) {
      toast.error("Digite uma mensagem e selecione um webhook de IA");
      return;
    }

    const webhook = aiWebhooks.find((w) => w.id === selectedAIWebhook);
    if (!webhook) {
      toast.error("Webhook de IA não encontrado");
      return;
    }

    const userMessage = { role: "user" as const, content: aiInput };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setIsAILoading(true);

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          contentType: "text",
          content: aiInput,
        }),
      });

      let responseData: any;
      const responseContentType = response.headers.get("content-type");
      
      if (responseContentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      const assistantMessage = {
        role: "assistant" as const,
        content: typeof responseData === "string" ? responseData : JSON.stringify(responseData, null, 2),
      };

      setAiMessages((prev) => [...prev, assistantMessage]);
      toast.success("Resposta recebida!");
    } catch (error: any) {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
      console.error("Error sending AI message:", error);
    } finally {
      setIsAILoading(false);
    }
  };

  const sendAIResponseToMainChat = (content: string) => {
    if (!selectedWebhook) {
      toast.error("Selecione um webhook no chat principal primeiro");
      return;
    }
    sendMessage(content, "text");
    toast.success("Mensagem enviada para o chat principal!");
  };

  const filteredWebhooks = selectedType
    ? webhooks.filter((w) => w.type === selectedType && w.usageLocations?.includes("teste"))
    : [];

  const currentWebhook = webhooks.find((w) => w.id === selectedWebhook);
  const currentAIWebhook = aiWebhooks.find((w) => w.id === selectedAIWebhook);

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-br from-background to-secondary/20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card backdrop-blur-sm flex items-center justify-between shadow-sm">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">TESTE DE WEBHOOKS</h2>
            <p className="text-sm text-muted-foreground">
              Configure e teste suas integrações
            </p>
            {currentWebhook && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-medium">Webhook:</span>
                <span className="text-sm text-muted-foreground">{currentWebhook.name}</span>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono">
                  {currentWebhook.method}
                </span>
                {currentWebhook.hasVariables && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {currentWebhook.variables?.length || 0} variáveis
                  </span>
                )}
              </div>
            )}
          </div>
          
          <WebhookSelector
            webhooks={filteredWebhooks}
            webhookTypes={webhookTypes}
            selectedWebhook={selectedWebhook}
            selectedType={selectedType}
            onSelectWebhook={setSelectedWebhook}
            onSelectType={setSelectedType}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl">
          <Card className="flex-1 flex flex-col bg-card/50 backdrop-blur-sm border-primary/20 shadow-xl">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="bg-gradient-to-br from-primary/20 to-primary-glow/20 p-6 rounded-full mb-4">
                    <Webhook className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Bem-vindo ao Chat de Webhooks</h3>
                  <p className="text-muted-foreground max-w-md">
                    Selecione um webhook e comece a testar suas integrações. Você pode enviar texto, áudio, imagens,
                    arquivos e variáveis customizadas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Webhook className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                        <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Variable Form */}
            {showVariableForm && currentWebhook?.variables && currentWebhook.variables.length > 0 && (
              <div className="border-t border-border bg-secondary/30 p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-sm mb-1">Variáveis do Webhook</h3>
                  <p className="text-xs text-muted-foreground">Preencha os valores antes de enviar a mensagem</p>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {currentWebhook.variables.map((variable) => (
                    <div key={variable.id} className="space-y-1">
                      <label className="text-xs font-medium flex items-center gap-1">
                        {variable.name}
                        {variable.required && <span className="text-destructive">*</span>}
                        <span className="text-xs text-muted-foreground">({variable.type})</span>
                      </label>
                      {variable.type === "form-data" ? (
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setVariableValues(prev => ({
                                ...prev,
                                [variable.name]: file
                              }));
                            }
                          }}
                          className="text-xs w-full border rounded px-2 py-1"
                        />
                      ) : (
                        <input
                          type="text"
                          value={variableValues[variable.name] || ""}
                          onChange={(e) => {
                            setVariableValues(prev => ({
                              ...prev,
                              [variable.name]: e.target.value
                            }));
                          }}
                          placeholder={variable.defaultValue || `Digite ${variable.name}...`}
                          className="text-xs w-full border rounded px-2 py-1 bg-background"
                        />
                      )}
                      {variable.description && (
                        <p className="text-[10px] text-muted-foreground">{variable.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                {/* AI Button */}
                <Button
                  variant={showAIChat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAIChat(!showAIChat)}
                  className="gap-2 px-4"
                >
                  <Sparkles className="h-4 w-4" />
                  IA {aiWebhooks.length > 0 && `(${aiWebhooks.length})`}
                </Button>
                
                {/* AI Webhook Selector - Only shown when AI chat is open */}
                {showAIChat && aiWebhooks.length > 0 && (
                  <select
                    value={selectedAIWebhook || ""}
                    onChange={(e) => setSelectedAIWebhook(e.target.value)}
                    className="flex-1 text-sm border rounded-lg px-3 py-2.5 bg-card hover:bg-secondary/50 transition-colors shadow-sm font-medium"
                  >
                    {aiWebhooks.map((webhook) => (
                      <option key={webhook.id} value={webhook.id}>
                        {webhook.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* AI Chat Box */}
              {showAIChat && (
                <Card className="mb-3 bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/20 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 px-4 py-2.5 border-b border-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-sm font-semibold text-foreground">
                        Chat com IA - {currentAIWebhook?.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* AI Messages */}
                    <div
                      ref={aiScrollRef}
                      className="max-h-48 overflow-y-auto mb-4 space-y-3 rounded-lg"
                    >
                      {aiMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center mb-4">
                            <Sparkles className="h-8 w-8 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Comece uma conversa com a IA
                          </p>
                        </div>
                      ) : (
                        aiMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`group relative flex gap-3 ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {msg.role === "assistant" && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shrink-0 mt-1">
                                <Sparkles className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                            
                            <div
                              className={`relative max-w-[75%] p-3 rounded-2xl transition-all ${
                                msg.role === "user"
                                  ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-md rounded-br-sm"
                                  : "bg-card border border-border shadow-sm rounded-bl-sm hover:border-primary/30"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {msg.content}
                              </p>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`absolute -top-2 -right-2 h-7 w-7 p-0 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all ${
                                  msg.role === "user" 
                                    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" 
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                }`}
                                onClick={() => sendAIResponseToMainChat(msg.content)}
                                title="Enviar para o chat principal"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            
                            {msg.role === "user" && (
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                                <span className="text-xs font-semibold">Você</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* AI Input */}
                    <div className="flex gap-2 bg-background/50 p-3 rounded-lg border border-border">
                      <Textarea
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendAIMessage();
                          }
                        }}
                        placeholder="Digite sua mensagem..."
                        className="min-h-[60px] text-sm resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        disabled={isAILoading}
                      />
                      <Button
                        onClick={sendAIMessage}
                        disabled={!aiInput.trim() || isAILoading}
                        className="shrink-0 h-auto px-4 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                      >
                        {isAILoading ? (
                          <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <ChatInput onSendMessage={sendMessage} disabled={!selectedWebhook || isLoading} />
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
