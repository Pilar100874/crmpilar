import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Node, Edge } from "@xyflow/react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface BotFlow {
  id: string;
  name: string;
  flow_data: {
    nodes: Node[];
    edges: Edge[];
  };
}

export default function BotTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `test-${Date.now()}`);
  const [context, setContext] = useState<Record<string, any>>({});
  const [activeFlow, setActiveFlow] = useState<BotFlow | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadActiveFlow();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadActiveFlow = async () => {
    const { data, error } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error("Error loading flow:", error);
      toast.error("Erro ao carregar fluxo ativo");
      return;
    }

    if (!data) {
      toast.error("Nenhum fluxo ativo encontrado. Salve um fluxo no Bot Builder primeiro.");
      return;
    }

    setActiveFlow(data as any);
    toast.success(`Fluxo "${data.name}" carregado!`);

    // Add welcome message
    addMessage("system", `Teste do fluxo: ${data.name}`);
  };

  const addMessage = (role: "user" | "assistant" | "system", content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const executeFlow = async (userMessage: string) => {
    if (!activeFlow) {
      toast.error("Nenhum fluxo ativo");
      return;
    }

    setIsLoading(true);
    addMessage("user", userMessage);

    try {
      // Execute flow locally using the flow engine
      const { FlowEngine } = await import("@/services/flowEngine");
      
      const newContext = {
        vars: { ...context, userMessage },
        userMessage,
        sessionId,
      };

      const engine = new FlowEngine(
        activeFlow.flow_data.nodes,
        activeFlow.flow_data.edges,
        newContext,
        async (response: any) => {
          // Handle bot responses
          if (response.type === "message") {
            addMessage("assistant", response.content);
          } else if (response.type === "question") {
            addMessage("assistant", response.question);
          } else if (response.type === "handoff") {
            addMessage("system", `🤝 Transferindo para: ${response.department}`);
            addMessage("system", `Nota: ${response.note}`);
          }
        }
      );

      await engine.execute();

      // Update context
      setContext(newContext.vars);

    } catch (error: any) {
      console.error("Flow execution error:", error);
      addMessage("system", `❌ Erro: ${error.message}`);
      toast.error("Erro ao executar fluxo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const messageText = input;
    setInput("");
    await executeFlow(messageText);
  };

  const handleReset = () => {
    setMessages([]);
    setContext({});
    if (activeFlow) {
      addMessage("system", `Teste do fluxo: ${activeFlow.name}`);
    }
    toast.success("Conversa reiniciada");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Teste do Bot</h2>
              <p className="text-sm text-muted-foreground">
                {activeFlow ? `Testando: ${activeFlow.name}` : "Nenhum fluxo ativo"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadActiveFlow}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar Fluxo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Chat Area */}
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Conversa</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                <div className="space-y-4 py-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : msg.role === "system"
                            ? "bg-muted text-muted-foreground text-sm italic"
                            : "bg-card border"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card border rounded-lg p-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    disabled={isLoading || !activeFlow}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim() || !activeFlow}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Context Variables */}
          <Card className="w-80">
            <CardHeader>
              <CardTitle>Variáveis de Contexto</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {Object.keys(context).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma variável definida
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(context).map(([key, value]) => (
                      <div key={key} className="border rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline">{key}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground break-all">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
