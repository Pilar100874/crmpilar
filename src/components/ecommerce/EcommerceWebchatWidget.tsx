import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function EcommerceWebchatWidget() {
  const [open, setOpen] = useState(false);
  const [botId, setBotId] = useState<string | null>(null);
  const [botName, setBotName] = useState("Assistente");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for open event from floating chat
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setBotId(detail.botId);
      setBotName(detail.botName || "Assistente");
      setMessages([]);
      setOpen(true);
      // Load bot system prompt
      loadBotConfig(detail.botId);
    };
    window.addEventListener("ecommerce-webchat-open", handler);
    return () => window.removeEventListener("ecommerce-webchat-open", handler);
  }, []);

  const loadBotConfig = async (id: string) => {
    const { data } = await supabase
      .from("bot_flows")
      .select("flow_data, name")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      const flowData = data.flow_data as any;
      // Try to extract a welcome message or system prompt from flow data
      if (flowData?.welcomeMessage) {
        setMessages([{ id: "welcome", role: "assistant", content: flowData.welcomeMessage }]);
      } else {
        setMessages([{ id: "welcome", role: "assistant", content: `Olá! Sou o ${data.name}. Como posso ajudar?` }]);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      // Call the AI edge function or just echo for now
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: userMsg.content,
          botId,
          history: messages.filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content })),
        },
      });

      const reply = data?.reply || data?.message || "Desculpe, não consegui processar sua mensagem. Tente novamente.";
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: "Erro ao processar mensagem. Tente novamente." }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, botId, messages]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-6 z-[70] w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[70vh] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">{botName}</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground px-3 py-2 rounded-2xl rounded-bl-md">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
