import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Clock, MessageSquare, Phone, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ChatInput from "@/components/chat/ChatInput";
import { toast } from "sonner";

interface Conversation {
  id: string;
  customer_id: string;
  canal: string;
  status: string;
  updated_at: string;
  metadata: any;
  bot_active?: boolean;
  customer?: {
    nome: string;
    email: string;
    telefone: string;
  };
  lastMessage?: {
    text: string;
    created_at: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender: string;
  text: string;
  created_at: string;
  attachments: string[];
  payload: any;
}

export default function Atendimento() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    subscribeToConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      subscribeToMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          customer:customers!conversations_customer_id_fkey (
            nome,
            email,
            telefone
          )
        `)
        .eq("estabelecimento_id", estabId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Load last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: msgData } = await supabase
            .from("messages")
            .select("text, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            lastMessage: msgData,
          };
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
      toast.error("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      toast.error("Erro ao carregar mensagens");
    }
  };

  const subscribeToConversations = () => {
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (
    content: string,
    contentType: string,
    fileUrl?: string,
    fileName?: string
  ) => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender: "agent",
        text: content,
        attachments: fileUrl ? [fileUrl] : [],
        payload: {
          contentType,
          fileName,
        },
      });

      if (error) throw error;

      // Update conversation timestamp and pause bot (agent took over)
      await supabase
        .from("conversations")
        .update({ 
          updated_at: new Date().toISOString(),
          bot_active: false  // Pause bot when agent sends message
        })
        .eq("id", selectedConversation);

      toast.success("Mensagem enviada • Bot pausado");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    }
  };

  const handleReactivateBot = async () => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ bot_active: true })
        .eq("id", selectedConversation);

      if (error) throw error;

      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation
            ? { ...conv, bot_active: true }
            : conv
        )
      );

      toast.success("Bot reativado");
    } catch (error) {
      console.error("Erro ao reativar bot:", error);
      toast.error("Erro ao reativar bot");
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.customer?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      {/* Conversation List */}
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b bg-card/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversation === conv.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate text-foreground">
                        {conv.customer?.nome || "Cliente"}
                      </span>
                      <Badge
                        variant={conv.status === "open" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {conv.canal}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage?.text || "Sem mensagens"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {conv.lastMessage?.created_at
                            ? getTimeAgo(conv.lastMessage.created_at)
                            : getTimeAgo(conv.updated_at)}
                        </span>
                      </div>
                      {conv.customer?.telefone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span className="truncate">{conv.customer.telefone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConv ? (
          <>
            <div className="p-4 border-b bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">
                    {selectedConv.customer?.nome || "Cliente"}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {selectedConv.customer?.telefone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{selectedConv.customer.telefone}</span>
                      </div>
                    )}
                    {selectedConv.customer?.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span>{selectedConv.customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedConv.canal}</Badge>
                  <Badge 
                    variant={selectedConv.bot_active !== false ? "default" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    <div className={`w-2 h-2 rounded-full ${selectedConv.bot_active !== false ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {selectedConv.bot_active !== false ? "Bot Ativo" : "Bot Pausado"}
                  </Badge>
                  {selectedConv.bot_active === false && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleReactivateBot}
                      className="text-xs"
                    >
                      Reativar Bot
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4 bg-muted/20">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.sender === "agent" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.sender !== "agent" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col gap-1 max-w-[70%] ${
                        msg.sender === "agent" ? "items-end" : "items-start"
                      }`}
                    >
                      <Badge
                        variant={msg.sender === "agent" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {msg.sender === "agent" ? "Você" : "Cliente"}
                      </Badge>

                      <div
                        className={`p-3 rounded-lg ${
                          msg.sender === "agent"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((attachment, idx) => (
                              <a
                                key={idx}
                                href={attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline opacity-80 hover:opacity-100"
                              >
                                Ver anexo
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {msg.sender === "agent" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t bg-card">
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-lg font-medium mb-2">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa da lista para começar o atendimento</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
