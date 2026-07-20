import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, User, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/lib/toast-config";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessage from "@/components/chat/ChatMessage";
import { Message } from "@/pages/ChatWebhook";
import { cn } from "@/lib/utils";

interface EmbeddedChatPanelProps {
  customerPhone: string;
  customerName: string;
  customerId?: string;
  estabelecimentoId: string;
}

interface ConversationMessage {
  id: string;
  sender: "customer" | "agent" | "bot";
  text: string;
  timestamp: string;
  contentType?: string;
  fileUrl?: string;
  fileName?: string;
}

export function EmbeddedChatPanel({
  customerPhone,
  customerName,
  customerId,
  estabelecimentoId
}: EmbeddedChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customerPhone || customerId) {
      loadConversation();
    }
  }, [customerPhone, customerId, estabelecimentoId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      // Find customer
      let customerIdToUse = customerId;
      if (!customerIdToUse && customerPhone) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("estabelecimento_id", estabelecimentoId)
          .or(`telefone.eq.${customerPhone},tel.eq.${customerPhone}`)
          .maybeSingle();
        
        customerIdToUse = customer?.id;
      }

      if (!customerIdToUse) {
        setLoading(false);
        return;
      }

      // Find conversation with this customer
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, created_at, canal")
        .eq("customer_id", customerIdToUse)
        .eq("estabelecimento_id", estabelecimentoId)
        .in("canal", ["whatsapp", "webchat", "telegram"])
        .order("updated_at", { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        const conv = conversations[0];
        setConversationId(conv.id);

        // Load messages
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (msgs) {
          const formattedMessages: Message[] = msgs.map(msg => {
            // Extract content type and file info from payload if available
            const payload = msg.payload as Record<string, any> | null;
            const contentType = payload?.content_type || "text";
            const fileUrl = payload?.file_url || undefined;
            const fileName = payload?.file_name || undefined;
            
            return {
              id: msg.id,
              role: msg.sender === "customer" ? "user" : "assistant",
              content: msg.text || "",
              contentType: contentType as Message["contentType"],
              timestamp: new Date(msg.created_at),
              fileUrl,
              fileName,
            };
          });
          setMessages(formattedMessages);

          // Also store for agent assist
          const convMessages: ConversationMessage[] = msgs.map(msg => {
            const payload = msg.payload as Record<string, any> | null;
            return {
              id: msg.id,
              sender: msg.sender as "customer" | "agent" | "bot",
              text: msg.text || "",
              timestamp: msg.created_at,
              contentType: payload?.content_type || undefined,
              fileUrl: payload?.file_url || undefined,
              fileName: payload?.file_name || undefined,
            };
          });
          setConversationMessages(convMessages);
        }
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Erro ao carregar conversa");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (
    content: string,
    contentType: Message["contentType"],
    fileUrl?: string,
    fileName?: string,
    variables?: Record<string, string>
  ) => {
    if (!content.trim()) return;

    // Add message to local state immediately
    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "assistant",
      content,
      contentType,
      timestamp: new Date(),
      fileUrl,
      fileName,
      variables,
    };
    setMessages(prev => [...prev, newMessage]);

    try {
      // If WhatsApp, open in new tab with message
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(content)}`;
        window.open(whatsappUrl, '_blank');
        toast.success("WhatsApp aberto com a mensagem");
      }

      // Save to conversation if exists
      if (conversationId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender: "agent",
          text: content,
          content_type: contentType,
          file_url: fileUrl,
          file_name: fileName,
        } as any);

      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px] min-h-[500px] bg-background rounded-lg border border-border/50 overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
            <MessageSquare className="h-3.5 w-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-medium">{customerName}</p>
            <p className="text-[10px] text-muted-foreground">{customerPhone}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={loadConversation}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma mensagem encontrada</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Envie uma mensagem para iniciar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-2 border-t border-border/50 relative z-[100] overflow-visible">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={false}
          conversationId={conversationId || undefined}
          conversationMessages={conversationMessages}
          customerPhone={customerPhone}
          customerName={customerName}
        />
      </div>
    </div>
  );
}
