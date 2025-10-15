import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Send, User, Clock, MessageSquare } from "lucide-react";
import { useState } from "react";

export default function Atendimento() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const conversations = [
    { id: 1, customer: "Ana Silva", canal: "WhatsApp", status: "open", lastMessage: "Preciso de ajuda", time: "2min" },
    { id: 2, customer: "Carlos Santos", canal: "Web", status: "pending", lastMessage: "Obrigado!", time: "15min" },
    { id: 3, customer: "Maria Oliveira", canal: "Telegram", status: "open", lastMessage: "Como faço para...", time: "1h" },
  ];

  const messages = selectedConversation ? [
    { id: 1, sender: "customer", text: "Olá, preciso de ajuda", time: "14:30" },
    { id: 2, sender: "agent", text: "Olá! Como posso ajudar você?", time: "14:31" },
    { id: 3, sender: "customer", text: "Gostaria de saber sobre meu pedido", time: "14:32" },
  ] : [];

  const handleSendMessage = () => {
    if (!message.trim()) return;
    // TODO: Implement send message
    setMessage("");
  };

  return (
    <Layout>
      <div className="h-full flex">
        {/* Conversation List */}
        <div className="w-96 border-r border-slate-800 bg-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-10 bg-slate-900 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors ${
                  selectedConversation === conv.id ? "bg-slate-700" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate text-white">{conv.customer}</span>
                      <Badge variant={conv.status === "open" ? "default" : "secondary"} className="text-xs">
                        {conv.canal}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/70 truncate">
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/70">
                      <Clock className="w-3 h-3" />
                      <span>{conv.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-slate-800 bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {conversations.find(c => c.id === selectedConversation)?.customer}
                    </h3>
                    <p className="text-sm text-white/70">Online</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.sender === "agent"
                          ? "bg-gradient-primary text-primary-foreground"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <span className="text-xs opacity-70 mt-1 block">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-800">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/70">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
