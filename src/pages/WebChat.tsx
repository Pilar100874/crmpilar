import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export default function WebChat() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const estabelecimentoId = searchParams.get("estabelecimento");
  const color = searchParams.get("color") || "#10b981";
  const title = searchParams.get("title") || "Atendimento";
  const welcomeMessage = searchParams.get("welcome") || "Olá! Como posso ajudar?";

  useEffect(() => {
    // Mensagem de boas-vindas inicial
    setMessages([
      {
        id: "welcome",
        text: welcomeMessage,
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
    setIsConnected(true);
  }, [welcomeMessage]);

  useEffect(() => {
    // Auto scroll para última mensagem
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !estabelecimentoId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    // Simular resposta do bot (aqui você integraria com seu backend)
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Obrigado pela sua mensagem! Em breve um atendente responderá.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div 
      className="flex flex-col h-screen bg-background"
      style={{ 
        colorScheme: "light",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 text-white flex items-center gap-3 shadow-md"
        style={{ backgroundColor: color }}
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
          💬
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-base">{title}</h2>
          <p className="text-xs text-white/80">
            {isConnected ? "● Online" : "○ Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.sender === "user"
                    ? "text-white"
                    : "bg-muted text-foreground"
                }`}
                style={
                  message.sender === "user"
                    ? { backgroundColor: color }
                    : {}
                }
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.text}
                </p>
                <p className={`text-xs mt-1 ${
                  message.sender === "user" ? "text-white/70" : "text-muted-foreground"
                }`}>
                  {message.timestamp.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-full"
          />
          <Button
            onClick={sendMessage}
            size="icon"
            className="rounded-full"
            style={{ backgroundColor: color }}
            disabled={!inputText.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Powered by Sistema de Atendimento
        </p>
      </div>
    </div>
  );
}
