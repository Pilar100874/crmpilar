import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FlowEngine } from "@/services/flowEngine";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export default function BotTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`test-${Date.now()}`);
  const [flowData, setFlowData] = useState<any>(null);
  const [savedBots, setSavedBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSavedBots();
  }, []);

  const loadSavedBots = async () => {
    const { data, error } = await supabase
      .from("bot_flows")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading bots:", error);
      toast.error("Erro ao carregar bots");
    } else {
      setSavedBots(data || []);
      // Auto-select active bot
      const activeBot = data?.find(b => b.active);
      if (activeBot) {
        setSelectedBotId(activeBot.id);
        loadBot(activeBot.id);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadBot = async (botId: string) => {
    try {
      const { data: dbFlow, error } = await supabase
        .from("bot_flows")
        .select("*")
        .eq("id", botId)
        .single();

      if (error) throw error;

      if (dbFlow && dbFlow.flow_data) {
        const flowData = dbFlow.flow_data as any;
        setFlowData(flowData);
        addMessage("system", `Bot "${dbFlow.name}" carregado!`);
      }
    } catch (error) {
      console.error("Error loading bot:", error);
      toast.error("Erro ao carregar bot");
      setFlowData(null);
    }
  };

  const handleBotChange = (botId: string) => {
    setSelectedBotId(botId);
    setMessages([]);
    loadBot(botId);
  };

  const addMessage = (role: "user" | "assistant" | "system", content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSend = async () => {
    if (!input.trim() || !flowData) return;

    const userMessage = input.trim();
    setInput("");
    addMessage("user", userMessage);
    setIsLoading(true);

    try {
      // Get or create session context
      const { data: sessionData } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      const context: any = sessionData?.context || { vars: {} };
      context.vars.userMessage = userMessage;

      // Execute flow
      const engine = new FlowEngine(
        flowData.nodes,
        flowData.edges,
        {
          vars: context.vars as Record<string, any>,
          userMessage: userMessage,
          sessionId: sessionId,
        },
        async (response) => {
          // Handle bot responses
          if (response.type === "message") {
            addMessage("assistant", response.content);
          } else if (response.type === "question") {
            addMessage("assistant", response.question);
          } else if (response.type === "handoff") {
            addMessage("system", `🤝 Transferindo para: ${response.department}`);
            if (response.note) {
              addMessage("system", `Nota: ${response.note}`);
            }
          }
        }
      );

      await engine.execute();

      // Save session
      await supabase.from("chat_sessions").upsert({
        session_id: sessionId,
        context: context,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error executing flow:", error);
      addMessage("system", `❌ Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    toast.success("Conversa limpa!");
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
        <div className="p-4 border-b border-slate-800 bg-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Teste do Bot</h2>
            <p className="text-sm text-white/70">
              Simule conversas e teste seu fluxo
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={selectedBotId} onValueChange={handleBotChange}>
              <SelectTrigger className="w-[200px] bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Selecione um bot" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {savedBots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id} className="text-white">
                    {bot.name} {bot.active && "⭐"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => selectedBotId && loadBot(selectedBotId)} className="bg-slate-900 border-slate-700 text-white hover:bg-slate-700">
              Recarregar
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} className="bg-slate-900 border-slate-700 text-white hover:bg-slate-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-3xl h-[600px] flex flex-col bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bot className="w-5 h-5" />
                Chat de Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 p-0">
              <ScrollArea className="flex-1 px-6" ref={scrollRef}>
                <div className="space-y-4 py-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role !== "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : msg.role === "system"
                            ? "bg-slate-700 text-white/70 italic"
                            : "bg-slate-700 text-white"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-accent" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <div className="bg-slate-700 rounded-lg px-4 py-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="border-t border-slate-700 p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    disabled={isLoading || !flowData}
                    className="flex-1 bg-slate-900 border-slate-700 text-white"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim() || !flowData}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {!flowData && (
                  <p className="text-sm text-white/70 mt-2">
                    ⚠️ Nenhum fluxo carregado. Crie e salve um fluxo no Bot Builder.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
