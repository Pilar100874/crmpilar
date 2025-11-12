import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, User, Clock, MessageSquare, Phone, Mail, Sparkles, Send, ArrowUp, ArrowDown, FileText, Bot, Webhook, UserPlus, ChevronRight, ChevronLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ChatInput from "@/components/chat/ChatInput";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Conversation {
  id: string;
  customer_id: string;
  canal: string;
  status: string;
  updated_at: string;
  metadata: any;
  bot_active?: boolean;
  customer?: {
    id?: string;
    nome: string;
    email: string;
    telefone: string;
  };
  lastMessage?: {
    text: string;
    created_at: string;
  };
  customerCompanies?: any[];
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
  const [showClientDetails, setShowClientDetails] = useState(true);
  
  // AI Chat states
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiWebhooks, setAiWebhooks] = useState<any[]>([]);
  const [selectedAIWebhook, setSelectedAIWebhook] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [showContextBox, setShowContextBox] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const [currentAISessionId, setCurrentAISessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Bot redirect states
  const [availableBots, setAvailableBots] = useState<any[]>([]);
  const [selectedBotRedirect, setSelectedBotRedirect] = useState<string | null>(null);
  
  // Webhook auto-response states
  const [webhooksForAutoResponse, setWebhooksForAutoResponse] = useState<any[]>([]);
  const [selectedWebhookAutoResponse, setSelectedWebhookAutoResponse] = useState<string | null>(null);
  const [webhookAutoResponseActive, setWebhookAutoResponseActive] = useState(false);
  
  // Transfer to user states
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedTransferUser, setSelectedTransferUser] = useState<string | null>(null);
  
  // Customer companies
  const [customerCompanies, setCustomerCompanies] = useState<any[]>([]);

  useEffect(() => {
    loadConversations();
    subscribeToConversations();
    loadAIWebhooks();
    loadAvailableBots();
    loadWebhooksForAutoResponse();
    loadAvailableUsers();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      subscribeToMessages(selectedConversation);
      loadConversationWebhookConfig(selectedConversation);
      loadCustomerCompanies(selectedConversation);
      // Limpar mensagens de IA ao trocar de conversa
      setAiMessages([]);
      setCurrentAISessionId(null);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadWebhooksForAutoResponse = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const { data: webhooksData } = await supabase
      .from('webhooks')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (webhooksData) {
      // Filter webhooks that have "ia-atendimento" in usage_locations
      const autoResponseWebhooks = webhooksData.filter(w => 
        w.usage_locations && Array.isArray(w.usage_locations) && w.usage_locations.includes('ia-atendimento')
      );
      setWebhooksForAutoResponse(autoResponseWebhooks);
    }
  };

  const loadConversationWebhookConfig = async (conversationId: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('id', conversationId)
      .single();

    const metadata = data?.metadata as any;
    if (metadata?.webhook_auto_response) {
      setSelectedWebhookAutoResponse(metadata.webhook_auto_response.webhook_id);
      setWebhookAutoResponseActive(metadata.webhook_auto_response.active || false);
    } else {
      setSelectedWebhookAutoResponse(webhooksForAutoResponse[0]?.id || null);
      setWebhookAutoResponseActive(false);
    }
  };

  const handleToggleWebhookAutoResponse = async () => {
    if (!selectedConversation || !selectedWebhookAutoResponse) {
      toast.error("Selecione um webhook primeiro");
      return;
    }

    const newActiveState = !webhookAutoResponseActive;

    try {
      const { data: currentConv } = await supabase
        .from('conversations')
        .select('metadata')
        .eq('id', selectedConversation)
        .single();

      const currentMetadata = (currentConv?.metadata || {}) as any;
      const updatedMetadata = {
        ...currentMetadata,
        webhook_auto_response: {
          webhook_id: selectedWebhookAutoResponse,
          active: newActiveState
        }
      };

      const { error } = await supabase
        .from('conversations')
        .update({ metadata: updatedMetadata })
        .eq('id', selectedConversation);

      if (error) throw error;

      setWebhookAutoResponseActive(newActiveState);
      
      if (newActiveState) {
        const webhookName = webhooksForAutoResponse.find(w => w.id === selectedWebhookAutoResponse)?.name || "Webhook";
        toast.success(`Respostas automáticas via ${webhookName} ativadas`);
      } else {
        toast.success("Respostas automáticas via webhook desativadas");
      }
    } catch (error) {
      console.error("Erro ao atualizar webhook auto-response:", error);
      toast.error("Erro ao configurar webhook");
    }
  };

  // Load available bots
  const loadAvailableBots = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const { data: botsData } = await supabase
      .from('bot_flows')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .eq('active', true)
      .order('name');

    if (botsData) {
      setAvailableBots(botsData);
      if (botsData.length > 0) {
        setSelectedBotRedirect(botsData[0].id);
      }
    }
  };

  // Load available users for transfer
  const loadAvailableUsers = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const { data: usersData } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('estabelecimento_id', estabId)
      .order('nome');

    if (usersData) {
      setAvailableUsers(usersData);
      if (usersData.length > 0) {
        setSelectedTransferUser(usersData[0].id);
      }
    }
  };

  const handleTransferToUser = async () => {
    if (!selectedConversation || !selectedTransferUser) {
      toast.error("Selecione um usuário para transferir");
      return;
    }

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          assignee_id: selectedTransferUser,
          bot_active: false 
        })
        .eq('id', selectedConversation);

      if (error) throw error;

      const userName = availableUsers.find(u => u.id === selectedTransferUser)?.nome || "Usuário";
      toast.success(`Conversa transferida para ${userName}`);
      
      // Reload conversations to update UI
      loadConversations();
    } catch (error) {
      console.error("Erro ao transferir conversa:", error);
      toast.error("Erro ao transferir conversa");
    }
  };

  const loadCustomerCompanies = async (conversationId: string) => {
    try {
      const { data: convData } = await supabase
        .from('conversations')
        .select('customer_id')
        .eq('id', conversationId)
        .single();

      if (!convData?.customer_id) {
        setCustomerCompanies([]);
        return;
      }

      const { data: companiesData } = await supabase
        .from('customer_empresas')
        .select(`
          empresa_id,
          is_primary,
          cargo,
          empresas (
            id,
            nome,
            nome_fantasia,
            cnpj
          )
        `)
        .eq('customer_id', convData.customer_id);

      if (companiesData) {
        setCustomerCompanies(companiesData);
      } else {
        setCustomerCompanies([]);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas do cliente:", error);
      setCustomerCompanies([]);
    }
  };

  const handleRedirectToBot = async () => {
    if (!selectedConversation || !selectedBotRedirect) {
      toast.error("Selecione um bot para direcionar");
      return;
    }

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ 
          bot_id: selectedBotRedirect,
          bot_active: true
        })
        .eq("id", selectedConversation);

      if (error) throw error;

      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation
            ? { ...conv, bot_id: selectedBotRedirect, bot_active: true }
            : conv
        )
      );

      const botName = availableBots.find(b => b.id === selectedBotRedirect)?.name || "Bot";
      toast.success(`Cliente direcionado para ${botName}`);
    } catch (error) {
      console.error("Erro ao direcionar para bot:", error);
      toast.error("Erro ao direcionar para bot");
    }
  };

  // Load AI webhooks
  const loadAIWebhooks = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const { data: webhooksData } = await supabase
      .from('webhooks')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (webhooksData) {
      // Filtrar webhooks que têm "ia-atendimento" nos usage_locations
      const aiAtendimentoWebhooks = webhooksData.filter(w => 
        w.usage_locations && Array.isArray(w.usage_locations) && w.usage_locations.includes('ia-atendimento')
      );
      setAiWebhooks(aiAtendimentoWebhooks);
      if (aiAtendimentoWebhooks.length > 0) {
        setSelectedAIWebhook(aiAtendimentoWebhooks[0].id);
      }
    }
  };

  // Create or load AI session
  useEffect(() => {
    if (selectedAIWebhook && selectedConversation) {
      loadOrCreateAISession();
    }
  }, [selectedAIWebhook, selectedConversation]);

  const loadOrCreateAISession = async () => {
    if (!selectedAIWebhook || !selectedConversation) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    // Check for existing session vinculada a esta conversa específica
    const { data: existingSession } = await supabase
      .from('webhook_chat_sessions')
      .select('id, user_id, webhook_id, session_type, conversation_id, created_at')
      .eq('user_id', user.id)
      .eq('webhook_id', selectedAIWebhook)
      .eq('session_type', 'ai')
      .eq('conversation_id', selectedConversation)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sessionId = existingSession?.id;

    if (!sessionId) {
      const { data: newSession } = await supabase
        .from('webhook_chat_sessions')
        .insert({
          user_id: user.id,
          estabelecimento_id: estabId,
          webhook_id: selectedAIWebhook,
          session_type: 'ai',
          conversation_id: selectedConversation
        })
        .select()
        .single();

      sessionId = newSession?.id;
    }

    if (sessionId) {
      setCurrentAISessionId(sessionId);
      loadAIMessages(sessionId);
    }
  };

  const loadAIMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from('webhook_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      const msgs = data.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));
      setAiMessages(msgs);
    }
  };

  const addConversationContext = () => {
    if (!selectedConv) return;
    
    const recentMessages = messages.slice(-10).map(m => 
      `[${m.sender === "agent" ? "Você" : "Cliente"}]: ${m.text}`
    ).join("\n");
    
    const contextData = `
=== DADOS DO CLIENTE ===
Nome: ${selectedConv.customer?.nome || "N/A"}
Email: ${selectedConv.customer?.email || "N/A"}
Telefone: ${selectedConv.customer?.telefone || "N/A"}
Canal: ${selectedConv.canal}
Status: ${selectedConv.status}
Bot Ativo: ${selectedConv.bot_active !== false ? "Sim" : "Não"}

=== ÚLTIMAS MENSAGENS ===
${recentMessages}
    `.trim();
    
    setAiContext(contextData);
    toast.success("Contexto da conversa adicionado!");
  };

  const sendAIMessage = async () => {
    if (!aiInput.trim() || !selectedAIWebhook || !currentAISessionId) {
      toast.error("Digite uma mensagem");
      return;
    }

    const webhook = aiWebhooks.find(w => w.id === selectedAIWebhook);
    if (!webhook) {
      toast.error("Webhook de IA não encontrado");
      return;
    }

    if (!webhook.url || !webhook.url.startsWith('http')) {
      toast.error("URL do webhook inválida");
      return;
    }

    // Combine context and input
    const fullMessage = aiContext 
      ? `${aiContext}\n\n---\n\n${aiInput}`
      : aiInput;

    const messageContent = aiInput;
    setAiInput("");
    setIsAILoading(true);

    // Save user message
    await supabase
      .from('webhook_chat_messages')
      .insert({
        session_id: currentAISessionId,
        role: 'user',
        content: messageContent,
        content_type: 'text'
      });

    setAiMessages(prev => [...prev, { role: "user", content: messageContent }]);

    try {
      console.log('Chamando webhook:', webhook.url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(webhook.url, {
        method: webhook.method || "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          contentType: "text",
          content: fullMessage,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let assistantContent: string;

      if (contentType?.includes('application/json')) {
        const responseData = await response.json();
        assistantContent = typeof responseData === "string" 
          ? responseData 
          : JSON.stringify(responseData, null, 2);
      } else {
        assistantContent = await response.text();
      }

      console.log('Resposta do webhook:', assistantContent);

      // Save assistant response
      await supabase
        .from('webhook_chat_messages')
        .insert({
          session_id: currentAISessionId,
          role: 'assistant',
          content: assistantContent,
          content_type: 'text'
        });

      setAiMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
      toast.success("Resposta recebida!");
    } catch (error: any) {
      console.error('Erro ao chamar webhook:', error);
      
      let errorMessage = "Erro ao conectar com o webhook";
      
      if (error.name === 'AbortError') {
        errorMessage = "Timeout: webhook demorou muito para responder";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "Erro de conexão. Verifique se o webhook está acessível e permite CORS";
      } else {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      
      // Remove user message from UI if webhook fails
      setAiMessages(prev => prev.slice(0, -1));
    } finally {
      setIsAILoading(false);
    }
  };

  const sendAIResponseToChat = (content: string) => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa primeiro");
      return;
    }
    handleSendMessage(content, "text");
    toast.success("Mensagem enviada ao cliente!");
  };

  const copyMessageToAI = (content: string) => {
    setAiInput(content);
    setShowAIChat(true);
    toast.success("Mensagem copiada para o chat da IA!");
  };

  const loadConversations = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      
      // Build optimized query with last message in single query
      let query = supabase
        .from("conversations")
        .select(`
          *,
          customer:customers!conversations_customer_id_fkey (
            id,
            nome,
            email,
            telefone
          )
        `);

      if (estabId) {
        query = query.eq("estabelecimento_id", estabId);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;

      // Get last messages for all conversations in one query
      if (data && data.length > 0) {
        const convIds = data.map(c => c.id);
        
        // Get last message for each conversation using a lateral join approach
        const { data: lastMessages } = await supabase
          .from("messages")
          .select("conversation_id, text, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });

        // Create a map of last messages
        const lastMessageMap = new Map();
        lastMessages?.forEach(msg => {
          if (!lastMessageMap.has(msg.conversation_id)) {
            lastMessageMap.set(msg.conversation_id, msg);
          }
        });

        // Get all customer IDs
        const customerIds = data.map(c => c.customer_id).filter(Boolean);
        
        // Get all companies for these customers
        const { data: companiesData } = await supabase
          .from('customer_empresas')
          .select(`
            customer_id,
            is_primary,
            empresas (
              nome_fantasia,
              nome
            )
          `)
          .in('customer_id', customerIds);

        // Create a map of companies by customer_id
        const companiesMap = new Map();
        companiesData?.forEach(rel => {
          if (!companiesMap.has(rel.customer_id)) {
            companiesMap.set(rel.customer_id, []);
          }
          companiesMap.get(rel.customer_id).push(rel);
        });

        // Attach last messages and companies to conversations
        const conversationsWithMessages = data.map(conv => ({
          ...conv,
          lastMessage: lastMessageMap.get(conv.id) || null,
          customerCompanies: companiesMap.get(conv.customer_id) || [],
        }));

        setConversations(conversationsWithMessages);
      } else {
        setConversations([]);
      }
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

    console.log("💬 Atendimento - Enviando mensagem:", { content, contentType, fileUrl, fileName });

    try {
      // Save message to database
      const { error: dbError } = await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender: "agent",
        text: content,
        attachments: fileUrl ? [fileUrl] : [],
        payload: {
          contentType,
          fileName,
        },
      });

      if (dbError) {
        console.error("❌ Erro ao salvar mensagem no banco:", dbError);
        throw dbError;
      }

      console.log("✅ Mensagem salva no banco com sucesso");

      // Immediately add message to local state for instant feedback
      const newMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: selectedConversation,
        sender: "agent",
        text: content,
        attachments: fileUrl ? [fileUrl] : [],
        payload: { contentType, fileName },
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMessage]);

      // Send message via WhatsApp
      const { data: sendData, error: sendError } = await supabase.functions.invoke("send-agent-message", {
        body: {
          conversationId: selectedConversation,
          text: content,
          fileUrl: fileUrl,
          fileName: fileName,
          contentType: contentType,
        },
      });

      console.log("📤 Resposta do send-agent-message:", { sendData, sendError });

      if (sendError) {
        console.error("❌ Erro ao enviar via WhatsApp:", sendError);
        toast.error("Mensagem salva, mas não enviada ao cliente");
      }

      // Update conversation timestamp and pause bot (agent took over)
      await supabase
        .from("conversations")
        .update({ 
          updated_at: new Date().toISOString(),
          bot_active: false
        })
        .eq("id", selectedConversation);

      toast.success("Mensagem enviada • Bot pausado");
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
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
    <div className="h-[100vh] flex bg-background overflow-hidden">
      {/* Conversation List */}
      <div className="w-80 border-r border-border bg-card flex flex-col h-full">
        <div className="px-4 py-3 border-b bg-primary/5 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-3">Chat ao Vivo</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              className="pl-10 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
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
                className={`px-3 py-3 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedConversation === conv.id ? "bg-accent border-l-4 border-l-primary" : ""
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-sm truncate">
                        {conv.customer?.nome || "Cliente"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {conv.lastMessage?.created_at
                          ? getTimeAgo(conv.lastMessage.created_at)
                          : getTimeAgo(conv.updated_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {conv.lastMessage?.text || "Sem mensagens"}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {conv.bot_active !== false && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-500">
                          BOT
                        </Badge>
                      )}
                      {conv.customerCompanies && conv.customerCompanies.length > 0 && (
                        <>
                          {conv.customerCompanies.slice(0, 1).map((rel: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-500 text-white">
                              {rel.empresas?.nome_fantasia || rel.empresas?.nome || 'COMERCIAL'}
                            </Badge>
                          ))}
                        </>
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
      <div className="flex-1 flex flex-col h-full min-w-0 border-r border-border">
        {selectedConversation && selectedConv ? (
          <>
            <div className="px-4 py-3 border-b bg-card shadow-sm flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      {selectedConv.customer?.nome || "Cliente"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedConv.customer?.telefone || "Sem telefone"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConv.bot_active === false && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleReactivateBot}
                      className="text-xs h-7"
                    >
                      Reativar Bot
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowClientDetails(!showClientDetails)}
                    className="h-7 w-7 p-0"
                    title={showClientDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
                  >
                    {showClientDetails ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2 bg-muted/10">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`group flex gap-2 ${
                        msg.sender === "agent" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.sender !== "agent" && (
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}

                      <div
                        className={`flex flex-col ${
                          msg.sender === "agent" ? "items-end" : "items-start"
                        } max-w-[70%]`}
                      >
                        <div
                          className={`relative px-3 py-2 rounded-2xl transition-all ${
                            msg.sender === "agent"
                              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm"
                              : "bg-card border border-border shadow-sm hover:border-primary/30"
                          }`}
                        >
                          <p className="text-[13px] whitespace-pre-wrap break-words leading-snug">{msg.text}</p>
                          {msg.attachments && msg.attachments.length > 0 ? (
                            msg.payload?.contentType === "image" ? (
                              <div className="mt-1.5">
                                <img
                                  src={msg.attachments[0]}
                                  alt={msg.payload?.fileName || "imagem"}
                                  className="rounded-md max-w-full h-auto border border-border/50"
                                />
                              </div>
                            ) : (
                              <div className="mt-1.5 space-y-1">
                                {msg.attachments.map((attachment, idx) => (
                                  <a
                                    key={idx}
                                    href={attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs underline opacity-80 hover:opacity-100"
                                  >
                                    {msg.payload?.fileName || "Baixar arquivo"}
                                  </a>
                                ))}
                              </div>
                            )
                          ) : null}
                          
                          {msg.sender !== "agent" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute -top-1.5 -right-1.5 h-6 w-6 p-0 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyMessageToAI(msg.text);
                              }}
                              title="Copiar para o chat da IA"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <span className={`text-[10px] mt-1 block ${msg.sender === "agent" ? "text-white/70" : "text-muted-foreground"}`}>
                            {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      {msg.sender === "agent" && (
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="border-t bg-card flex-shrink-0 p-4">
              {/* AI Chat Box */}
              {showAIChat && aiWebhooks.length > 0 && (
                <Card className="mb-3 bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/20 rounded-2xl">
                  <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 px-4 py-2.5 border-b border-primary/20 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-sm font-semibold">Chat com IA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowContextBox(!showContextBox)}
                          className="h-7 text-xs gap-1 hover:bg-primary/20 rounded-full"
                        >
                          <FileText className="h-3 w-3" />
                          {showContextBox ? "Ocultar contexto" : "Adicionar contexto"}
                        </Button>
                        {aiWebhooks.length > 1 && (
                          <select
                            value={selectedAIWebhook || ""}
                            onChange={(e) => setSelectedAIWebhook(e.target.value)}
                            className="text-xs border rounded-full px-2 py-1 bg-card h-7"
                          >
                            {aiWebhooks.map(webhook => (
                              <option key={webhook.id} value={webhook.id}>
                                {webhook.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Context Field - Collapsible */}
                    {showContextBox && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-2xl border border-border/50 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-medium">Contexto adicional</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={addConversationContext}
                            className="h-6 text-xs gap-1 rounded-full"
                            disabled={!selectedConversation}
                          >
                            <FileText className="h-3 w-3" />
                            Carregar da conversa
                          </Button>
                        </div>
                        <Textarea
                          value={aiContext}
                          onChange={(e) => setAiContext(e.target.value)}
                          placeholder="Cole ou digite informações relevantes..."
                          className="min-h-[70px] text-xs resize-none bg-background rounded-2xl"
                        />
                      </div>
                    )}

                    {/* AI Messages */}
                    <div
                      ref={aiScrollRef}
                      className="max-h-64 overflow-y-auto mb-4 space-y-2 px-1"
                    >
                      {aiMessages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">Comece uma conversa com a IA</p>
                          {showContextBox && aiContext && (
                            <p className="text-xs mt-2 opacity-70">Contexto adicionado ✓</p>
                          )}
                        </div>
                      ) : (
                        aiMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`group relative flex gap-2 ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {msg.role === "assistant" && (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                              </div>
                            )}

                            <div
                              onClick={() => msg.role === "assistant" && sendAIResponseToChat(msg.content)}
                              className={`relative max-w-[80%] px-3 py-2 rounded-2xl transition-all ${
                                msg.role === "user"
                                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm"
                                  : "bg-card border border-border shadow-sm hover:border-primary/30 cursor-pointer hover:shadow-md"
                              }`}
                              title={msg.role === "assistant" ? "Clique para enviar ao cliente" : ""}
                            >
                              <p className="whitespace-pre-wrap break-words text-[13px] leading-snug">
                                {msg.content}
                              </p>
                              
                              {msg.role === "assistant" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute -top-1.5 -right-1.5 h-6 w-6 p-0 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all bg-primary text-primary-foreground hover:bg-primary/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendAIResponseToChat(msg.content);
                                  }}
                                  title="Enviar para o chat do cliente"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                              )}
                              
                              <span className={`text-[10px] mt-1 block ${msg.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>
                                {format(new Date(), "HH:mm", { locale: ptBR })}
                              </span>
                            </div>

                            {msg.role === "user" && (
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <User className="h-3.5 w-3.5 text-primary" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* AI Input */}
                    <div className="flex items-center gap-2">
                      <Textarea
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendAIMessage();
                          }
                        }}
                        placeholder="Pergunte algo à IA..."
                        className="flex-1 min-h-[44px] max-h-[120px] text-sm resize-none rounded-full px-4 py-3"
                        disabled={isAILoading}
                      />
                      <Button
                        onClick={sendAIMessage}
                        disabled={!aiInput.trim() || isAILoading}
                        size="icon"
                        className="h-11 w-11 shrink-0 rounded-full"
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

              <div className="flex flex-col gap-3">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={false}
                  availableBots={availableBots}
                  selectedBotRedirect={selectedBotRedirect}
                  onBotRedirectChange={setSelectedBotRedirect}
                  onBotRedirect={handleRedirectToBot}
                  webhooksForAutoResponse={webhooksForAutoResponse}
                  selectedWebhookAutoResponse={selectedWebhookAutoResponse}
                  onWebhookChange={setSelectedWebhookAutoResponse}
                  webhookAutoResponseActive={webhookAutoResponseActive}
                  onWebhookToggle={handleToggleWebhookAutoResponse}
                  botVariables={
                    selectedConversation 
                      ? conversations.find(c => c.id === selectedConversation)?.metadata?.vars || {}
                      : {}
                  }
                  availableUsers={availableUsers}
                  selectedTransferUser={selectedTransferUser}
                  onTransferUserChange={setSelectedTransferUser}
                  onTransferUser={handleTransferToUser}
                  showAIChat={showAIChat}
                  onToggleAIChat={() => setShowAIChat(!showAIChat)}
                  aiWebhooks={aiWebhooks}
                />
              </div>
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

      {/* Right Sidebar - Details Panel */}
      {selectedConversation && selectedConv && showClientDetails && (
        <div className="w-80 bg-card flex flex-col h-full overflow-hidden border-l border-border">
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex flex-col items-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center mb-2">
                <User className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{selectedConv.customer?.nome || "Cliente"}</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Protocolo</span>
                <span className="font-medium">{selectedConv.id.slice(0, 8).toUpperCase()}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Tags</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full">
                  <span className="text-primary">+</span>
                </Button>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Dispositivo</span>
                <div className="flex gap-1">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Data e Hora</span>
                <span className="text-xs">
                  {format(new Date(selectedConv.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Canal</span>
                <Badge variant="secondary" className="bg-green-500 text-white">
                  {selectedConv.canal}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Satisfação</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((star) => (
                    <span key={star} className="text-orange-400">★</span>
                  ))}
                  {[4, 5].map((star) => (
                    <span key={star} className="text-gray-300">★</span>
                  ))}
                </div>
              </div>

              <div className="flex items-start justify-between py-2 border-b">
                <span className="text-muted-foreground">Pergunta</span>
                <span className="text-right text-xs max-w-[60%]">falar com</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Email</span>
                <span className="text-xs truncate max-w-[60%]">
                  {selectedConv.customer?.email || "hyp2020g"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Telefone</span>
                <span className="text-xs">
                  {selectedConv.customer?.telefone || "(48) 3205"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Lead</span>
                <span className="text-xs">-</span>
              </div>

              <div className="flex items-start justify-between py-2">
                <span className="text-muted-foreground">Obs</span>
                <span className="text-xs text-right max-w-[60%]">-</span>
              </div>
            </div>
          </div>

          {/* Attendant Status Card */}
          <div className="border-t p-4 flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center mb-2">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold">Felipe</h4>
              <p className="text-xs text-muted-foreground mb-3">CEO</p>
              
              <div className="w-full space-y-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm">Online</span>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-sm">Away</span>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-sm">Offline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
