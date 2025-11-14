import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, User, Clock, MessageSquare, Phone, Mail, Sparkles, Send, ArrowUp, ArrowDown, FileText, Bot, Webhook, UserPlus, ChevronRight, ChevronLeft, Building2, Plus, Receipt, Inbox, Calendar, CheckCircle2, MailOpen, ArrowUpDown, CalendarDays } from "lucide-react";
import { NovoContatoDialog } from "@/components/NovoContatoDialog";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import ChatInput from "@/components/chat/ChatInput";
import { toast } from "@/lib/toast-config";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

// Função para normalizar telefone (remove tudo exceto números)
const normalizePhone = (phone: string | undefined | null): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

export default function Atendimento() {
  const navigate = useNavigate();
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
  
  // Novo contato dialog
  const [showNovoContatoDialog, setShowNovoContatoDialog] = useState(false);
  
  // Tab states
  const [activeTab, setActiveTab] = useState("chat");
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [userEmails, setUserEmails] = useState<any[]>([]);
  
  // Agenda states
  const [agendaDate, setAgendaDate] = useState(new Date());
  const [taskSortOrder, setTaskSortOrder] = useState<Array<'created_at' | 'origem' | 'origem_sub_item' | 'time'>>(['time', 'created_at', 'origem', 'origem_sub_item']);
  const [showSortDialog, setShowSortDialog] = useState(false);

  useEffect(() => {
    loadConversations();
    subscribeToConversations();
    loadAIWebhooks();
    loadAvailableBots();
    loadWebhooksForAutoResponse();
    loadAvailableUsers();
    loadTodayTasks();
    loadUserEmails();
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
        .select('customer_id, metadata, customer:customers!conversations_customer_id_fkey(telefone)')
        .eq('id', conversationId)
        .single();

      if (!convData) {
        setCustomerCompanies([]);
        return;
      }

      // Buscar pelo telefone normalizado
      const metadata = convData.metadata as any;
      const phone = metadata?.phone || convData.customer?.telefone;
      let customerId = convData.customer_id;
      
      if (phone) {
        const estabId = await getEstabelecimentoId();
        if (estabId) {
          // Buscar TODOS os contatos e comparar telefones normalizados
          const { data: allContactsData } = await supabase
            .from('customers')
            .select('id, telefone, tipo_operador, nome')
            .eq('estabelecimento_id', estabId);
          
          const normalizedPhone = normalizePhone(phone);
          
          // Filtrar contatos com telefone correspondente
          const matchedContacts = allContactsData?.filter(contact => 
            normalizePhone(contact.telefone) === normalizedPhone
          ) || [];
          
          // Priorizar contatos com tipo_operador=true ou que não tenham nome padrão "Cliente XXXXX"
          const matchedContact = matchedContacts.sort((a, b) => {
            if (a.tipo_operador && !b.tipo_operador) return -1;
            if (!a.tipo_operador && b.tipo_operador) return 1;
            if (!a.nome.startsWith('Cliente ') && b.nome.startsWith('Cliente ')) return -1;
            if (a.nome.startsWith('Cliente ') && !b.nome.startsWith('Cliente ')) return 1;
            return 0;
          })[0];
          
          if (matchedContact) {
            customerId = matchedContact.id;
          }
        }
      }

      if (!customerId) {
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
        .eq('customer_id', customerId);

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

  // Load tasks for selected date
  const loadTodayTasks = async (date: Date = agendaDate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      const { data: tasksData, error } = await supabase
        .from('calendario_tarefas')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) {
        console.error("Erro ao carregar tarefas:", error);
        return;
      }

      // Apply custom sorting
      const sortedTasks = sortTasks(tasksData || []);
      setTodayTasks(sortedTasks);
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
    }
  };

  // Sort tasks based on custom order
  const sortTasks = (tasks: any[]) => {
    return [...tasks].sort((a, b) => {
      for (const criterion of taskSortOrder) {
        let comparison = 0;
        
        if (criterion === 'created_at') {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (criterion === 'origem') {
          comparison = (a.origem || '').localeCompare(b.origem || '');
        } else if (criterion === 'origem_sub_item') {
          comparison = (a.origem_sub_item || '').localeCompare(b.origem_sub_item || '');
        } else if (criterion === 'time') {
          comparison = (a.time || '').localeCompare(b.time || '');
        }
        
        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  };

  // Reload tasks when date or sort order changes
  useEffect(() => {
    if (activeTab === 'agenda') {
      loadTodayTasks(agendaDate);
    }
  }, [agendaDate, taskSortOrder, activeTab]);

  const handlePreviousDay = () => {
    setAgendaDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setAgendaDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setAgendaDate(new Date());
  };

  const moveSortCriterion = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...taskSortOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setTaskSortOrder(newOrder);
    }
  };

  const getSortLabel = (criterion: string) => {
    switch (criterion) {
      case 'created_at': return 'Data de Entrada';
      case 'origem': return 'Origem';
      case 'origem_sub_item': return 'Sub-item da Origem';
      case 'time': return 'Horário';
      default: return criterion;
    }
  };

  // Load user emails
  const loadUserEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emailsData, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', user.id)
        .eq('folder', 'inbox')
        .order('date', { ascending: false })
        .limit(20);

      if (error) {
        console.error("Erro ao carregar emails:", error);
        return;
      }

      setUserEmails(emailsData || []);
    } catch (error) {
      console.error("Erro ao carregar emails:", error);
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

        // Buscar contatos pelo telefone da conversa PRIMEIRO
        const phonesMap = new Map();
        for (const conv of data) {
          // Tentar pegar o telefone do metadata ou do customer
          const metadata = conv.metadata as any;
          const phone = metadata?.phone || conv.customer?.telefone;
          if (phone) {
            phonesMap.set(conv.id, phone);
          }
        }

        // Buscar todos os contatos comparando telefones normalizados
        const phones = Array.from(phonesMap.values()).filter(Boolean);
        const contactsMap = new Map();
        
        if (phones.length > 0 && estabId) {
          // Buscar TODOS os contatos do estabelecimento
          const { data: allContactsData } = await supabase
            .from('customers')
            .select('id, nome, email, telefone, tipo_operador')
            .eq('estabelecimento_id', estabId);

          // Criar um mapa com telefones normalizados, priorizando tipo_operador=true
          const normalizedContactsMap = new Map();
          allContactsData?.forEach(contact => {
            const normalized = normalizePhone(contact.telefone);
            if (normalized) {
              const existing = normalizedContactsMap.get(normalized);
              // Priorizar contatos com tipo_operador=true ou que não tenham nome padrão "Cliente XXXXX"
              if (!existing || 
                  (contact.tipo_operador && !existing.tipo_operador) ||
                  (!contact.nome.startsWith('Cliente ') && existing.nome.startsWith('Cliente '))) {
                normalizedContactsMap.set(normalized, contact);
              }
            }
          });

          // Para cada telefone da conversa, buscar o contato correspondente
          phones.forEach(phone => {
            const normalized = normalizePhone(phone);
            if (normalized && normalizedContactsMap.has(normalized)) {
              const contact = normalizedContactsMap.get(normalized);
              contactsMap.set(phone, contact);
            }
          });
        }

        // AGORA buscar customer IDs corretos (incluindo os encontrados por telefone)
        const customerIds = new Set<string>();
        data.forEach(conv => {
          const phone = phonesMap.get(conv.id);
          const contactByPhone = phone ? contactsMap.get(phone) : null;
          const finalCustomerId = contactByPhone?.id || conv.customer_id;
          if (finalCustomerId) {
            customerIds.add(finalCustomerId);
          }
        });
        
        // Get all companies for these customers usando os IDs corretos
        const { data: companiesData } = await supabase
          .from('customer_empresas')
          .select(`
            customer_id,
            is_primary,
            cargo,
            empresas (
              id,
              nome_fantasia,
              nome,
              cnpj
            )
          `)
          .in('customer_id', Array.from(customerIds));

        // Create a map of companies by customer_id
        const companiesMap = new Map();
        companiesData?.forEach(rel => {
          if (!companiesMap.has(rel.customer_id)) {
            companiesMap.set(rel.customer_id, []);
          }
          companiesMap.get(rel.customer_id).push(rel);
        });

        // Attach last messages, contacts by phone, and companies to conversations
        const conversationsWithMessages = data.map(conv => {
          const phone = phonesMap.get(conv.id);
          const contactByPhone = phone ? contactsMap.get(phone) : null;
          
          // Usar o contato encontrado pelo telefone ou o customer_id original
          const finalCustomer = contactByPhone || conv.customer;
          const finalCustomerId = contactByPhone?.id || conv.customer_id;

          return {
            ...conv,
            customer: finalCustomer,
            customer_id: finalCustomerId,
            lastMessage: lastMessageMap.get(conv.id) || null,
            customerCompanies: companiesMap.get(finalCustomerId) || [],
          };
        });

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
      let finalFileUrl = fileUrl;

      // If we have a blob URL (from audio recording), upload it to Storage first
      if (fileUrl && fileUrl.startsWith('blob:')) {
        console.log("📦 Blob URL detectada, fazendo upload para Storage...");
        
        try {
          // Fetch the blob data
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          
          // Generate a unique filename
          const timestamp = Date.now();
          const extension = fileName?.split('.').pop() || 'webm';
          const storagePath = `agent-messages/${timestamp}_${fileName || `audio.${extension}`}`;
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('bot-media')
            .upload(storagePath, blob, {
              contentType: blob.type,
              cacheControl: '3600',
            });

          if (uploadError) {
            console.error("❌ Erro ao fazer upload:", uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('bot-media')
            .getPublicUrl(storagePath);

          finalFileUrl = publicUrl;
          console.log("✅ Arquivo enviado para Storage:", finalFileUrl);
        } catch (uploadErr) {
          console.error("❌ Erro no processo de upload:", uploadErr);
          toast.error("Erro ao processar arquivo");
          return;
        }
      }

      // Save message to database
      const { error: dbError } = await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender: "agent",
        text: content,
        attachments: finalFileUrl ? [finalFileUrl] : [],
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
        attachments: finalFileUrl ? [finalFileUrl] : [],
        payload: { contentType, fileName },
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMessage]);

      // Send message via WhatsApp
      const { data: sendData, error: sendError } = await supabase.functions.invoke("send-agent-message", {
        body: {
          conversationId: selectedConversation,
          text: content,
          fileUrl: finalFileUrl,
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
    <div className="h-screen min-h-0 flex bg-gray-100 overflow-hidden">
      {/* Conversation List */}
      <div className="w-80 border-r border-border bg-gray-100 flex flex-col h-full min-h-0">
        <div className="px-4 py-3 border-b bg-primary/5 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-3">Painel de Atendimento</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              className="pl-10 h-9 rounded-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="w-full grid grid-cols-3 mx-4 my-2 flex-shrink-0 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-medium">Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="agenda" 
              className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium">Agenda</span>
            </TabsTrigger>
            <TabsTrigger 
              value="email" 
              className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="font-medium">Email</span>
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 overflow-y-auto min-h-0 overscroll-contain m-0">
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
                  className={`px-3 py-3 border-b cursor-pointer hover:bg-gray-200/50 transition-colors ${
                    selectedConversation === conv.id ? "bg-gray-200 border-l-4 border-l-primary" : ""
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
                              <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5" />
                                {rel.empresas?.nome_fantasia || rel.empresas?.nome || "Empresa"}
                              </Badge>
                            ))}
                            {conv.customerCompanies.length > 1 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                +{conv.customerCompanies.length - 1}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Agenda Tab */}
          <TabsContent value="agenda" className="flex-1 flex flex-col min-h-0 m-0">
            {/* Agenda Controls */}
            <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b bg-background space-y-2">
              {/* Date Navigation */}
              <div className="flex items-center justify-between gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePreviousDay}
                  className="h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 text-center">
                  <p className="text-sm font-semibold">
                    {format(agendaDate, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(agendaDate, "EEEE", { locale: ptBR })}
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNextDay}
                  className="h-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleToday}
                  className="flex-1 h-8"
                >
                  <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                  Hoje
                </Button>
                
                <Dialog open={showSortDialog} onOpenChange={setShowSortDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 h-8">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                      Ordenação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Configurar Ordenação</DialogTitle>
                      <DialogDescription>
                        Defina a ordem de prioridade dos critérios de ordenação
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                      {taskSortOrder.map((criterion, index) => (
                        <Card key={criterion} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">
                                {index + 1}
                              </Badge>
                              <span className="text-sm font-medium">
                                {getSortLabel(criterion)}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveSortCriterion(index, 'up')}
                                disabled={index === 0}
                                className="h-8 w-8 p-0"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveSortCriterion(index, 'down')}
                                disabled={index === taskSortOrder.length - 1}
                                className="h-8 w-8 p-0"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {todayTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhuma tarefa para esta data</p>
                </div>
              ) : (
                todayTasks.map((task) => (
                  <Card key={task.id} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        task.status === 'concluida' ? 'text-success' : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{task.contact_name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {task.time && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {task.time}
                            </span>
                          )}
                          {task.origem && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {task.origem}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="flex-1 overflow-y-auto min-h-0 overscroll-contain m-0 p-3 space-y-2">
            {userEmails.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum email recebido</p>
              </div>
            ) : (
              userEmails.map((email) => (
                <Card 
                  key={email.id} 
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-all ${
                    !email.read ? 'bg-primary/5 border-primary/30 shadow-sm' : ''
                  }`}
                  onClick={() => navigate('/email')}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {email.read ? (
                        <MailOpen className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Mail className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-medium text-sm truncate ${!email.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {email.from_email}
                        </p>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {format(new Date(email.date), 'dd/MM', { locale: ptBR })}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!email.read ? 'font-medium' : 'text-muted-foreground'}`}>
                        {email.subject}
                      </p>
                      {!email.read && (
                        <Badge variant="default" className="mt-1.5 text-[10px] px-1.5 py-0">
                          Novo
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden min-w-0 border-r border-border">
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
                      className="text-xs h-7 rounded-full"
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

            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-4 space-y-2 bg-gray-200">
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
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-sm font-semibold">Chat com IA</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {aiWebhooks.length > 1 && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Webhook:</Label>
                            <Select
                              value={selectedAIWebhook || ""}
                              onValueChange={setSelectedAIWebhook}
                            >
                              <SelectTrigger className="h-7 text-xs bg-background/80 border-border/50 rounded-full w-[180px]">
                                <SelectValue placeholder="Selecione o webhook" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl">
                                {aiWebhooks.map(webhook => (
                                  <SelectItem key={webhook.id} value={webhook.id}>
                                    {webhook.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowContextBox(!showContextBox)}
                          className="h-7 text-xs gap-1 hover:bg-primary/20 rounded-full flex-shrink-0"
                        >
                          <FileText className="h-3 w-3" />
                          {showContextBox ? "Ocultar contexto" : "Adicionar contexto"}
                        </Button>
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
                      className="max-h-64 overflow-y-auto overscroll-contain mb-4 space-y-2 px-1"
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
                        className="flex-1 min-h-[44px] max-h-[120px] text-sm resize-none rounded-full px-4"
                        style={{ paddingTop: '12px', paddingBottom: '12px' }}
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

      {/* Right Sidebar - Company Details Panel */}
      {selectedConversation && selectedConv && showClientDetails && (
        <div className="w-80 bg-card flex flex-col h-full min-h-0 overflow-hidden border-l border-border">
          {/* Header com nome do cliente */}
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex flex-col items-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center mb-2">
                <User className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{selectedConv.customer?.nome || "Cliente"}</h3>
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedConv.customer?.telefone}
                </span>
              </div>
            </div>
          </div>

          {/* Resumo da Empresa */}
          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-4 space-y-4">
            {/* Seção de Empresas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Empresas Vinculadas
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={() => setShowNovoContatoDialog(true)}
                >
                  <Plus className="w-4 h-4 text-primary" />
                </Button>
              </div>

              {customerCompanies.length > 0 ? (
                <div className="space-y-2">
                  {customerCompanies.map((companyRel: any) => {
                    const empresa = companyRel.empresas;
                    return (
                      <Card key={companyRel.empresa_id} className="p-3 rounded-2xl">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm truncate">
                                  {empresa?.nome_fantasia || empresa?.nome}
                                </p>
                                {companyRel.is_primary && (
                                  <Badge variant="secondary" className="text-xs h-5 bg-orange-500 text-white">
                                    Principal
                                  </Badge>
                                )}
                              </div>
                              {empresa?.cnpj && (
                                <p className="text-xs text-muted-foreground">
                                  CNPJ: {empresa.cnpj}
                                </p>
                              )}
                            </div>
                          </div>

                          {companyRel.cargo && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Cargo:</span>
                              <span className="font-medium">{companyRel.cargo}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-4 rounded-2xl">
                  <div className="text-center">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">
                      Nenhuma empresa vinculada
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-7 text-xs"
                      onClick={() => setShowNovoContatoDialog(true)}
                    >
                      Vincular empresa
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Informações da Conversa */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Informações da Conversa</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground text-xs">Protocolo</span>
                  <span className="font-medium text-xs">{selectedConv.id.slice(0, 8).toUpperCase()}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground text-xs">Canal</span>
                  <Badge variant="secondary" className="bg-green-500 text-white text-xs h-5">
                    {selectedConv.canal}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground text-xs">Data/Hora</span>
                  <span className="text-xs">
                    {format(new Date(selectedConv.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground text-xs">Email</span>
                  <span className="text-xs truncate max-w-[60%]">
                    {selectedConv.customer?.email || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="border-t p-4 flex-shrink-0 space-y-2">
            <Button
              className="w-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              onClick={() => {
                if (selectedConv.customer?.id) {
                  navigate(`/orcamentos?cliente_id=${selectedConv.customer.id}`);
                }
              }}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Abrir Orçamento
            </Button>
            
            <Button
              className="w-full rounded-full"
              variant="outline"
              onClick={() => {
                if (selectedConv.customer?.email) {
                  navigate(`/email?filter=${encodeURIComponent(selectedConv.customer.email)}`);
                }
              }}
            >
              <Inbox className="w-4 h-4 mr-2" />
              Ver Emails
            </Button>
          </div>
        </div>
      )}
      
      {/* Novo Contato Dialog */}
      <NovoContatoDialog 
        open={showNovoContatoDialog}
        onOpenChange={setShowNovoContatoDialog}
      />
    </div>
  );
}
