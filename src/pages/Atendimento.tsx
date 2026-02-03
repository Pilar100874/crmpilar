import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, User, Clock, MessageSquare, Phone, Mail, Sparkles, Send, ArrowUp, ArrowDown, FileText, Bot, Webhook, UserPlus, ChevronRight, ChevronLeft, Building2, Plus, Receipt, Inbox, Calendar as CalendarIcon, CheckCircle2, MailOpen, ArrowUpDown, CalendarDays, PanelLeftClose, PanelLeft, File, PhoneCall, Languages, BookOpen, Wand2, Image, Paperclip, Variable, Zap, FileCheck, FileSpreadsheet, Copy, Trash2, MoreVertical, Archive, Edit3, Star, RefreshCw, Reply, Forward, Download, AlertTriangle, Play, Users, Settings2, Package, FileDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { RadialMenu, type RadialMenuItem } from "@/components/ui/radial-menu";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { PredictiveDialerDialog } from "@/components/atendimento/PredictiveDialerDialog";
import { NovoContatoDialog } from "@/components/NovoContatoDialog";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import POSView from "@/components/orcamento/POSView";
import { ClientDetailsPanel } from "@/components/atendimento/ClientDetailsPanel";
import { UnifiedDetailsPanel } from "@/components/atendimento/UnifiedDetailsPanel";
import { EditContatoEmbedded } from "@/components/atendimento/EditContatoEmbedded";
import { EditEmpresaEmbedded } from "@/components/atendimento/EditEmpresaEmbedded";
import { CreateContatoEmbedded } from "@/components/atendimento/CreateContatoEmbedded";
import { CreateEmpresaEmbedded } from "@/components/atendimento/CreateEmpresaEmbedded";
import { SoftphoneDialog } from "@/components/softphone/SoftphoneDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { OmnichannelManager } from "@/components/atendimento/OmnichannelManager";
import { useOmnichannelRouting } from "@/hooks/useOmnichannelRouting";
import { AtendenteStatusSelector } from "@/components/atendimento/AtendenteStatusSelector";
import { ConversationSummaryPanel } from "@/components/atendimento/ConversationSummaryPanel";
import { GlobalClientFilter, type GlobalFilter } from "@/components/atendimento/GlobalClientFilter";
import { EmailFolderSidebar } from "@/components/email/EmailFolderSidebar";
import { EmailPanel } from "@/components/email/EmailPanel";
import { ComposeEmailDialog } from "@/components/email/ComposeEmailDialog";
import type { Atendente } from "@/types/atendimento";
import { useFerramentasAtendimento, type TabType } from "@/hooks/useFerramentasAtendimento";
import { ToolsDropdown } from "@/components/atendimento/ToolsDropdown";
import { FluxoAtendimentoDialog } from "@/components/atendimento/agenda/FluxoAtendimentoDialog";
import { ConfigDatasProximoContatoDialog } from "@/components/atendimento/agenda/ConfigDatasProximoContatoDialog";
import { EnvioMassaDialog } from "@/components/atendimento/agenda/EnvioMassaDialog";
import { FluxoAtendimentoPanel } from "@/components/atendimento/agenda/FluxoAtendimentoPanel";
import { EnvioMassaPanel } from "@/components/atendimento/agenda/EnvioMassaPanel";
import { ListasPanel } from "@/components/atendimento/ListasPanel";
import { EnvioMassaWizardContent, EnvioMassaWizardPanel } from "@/components/envio-massa";

interface Conversation {
  id: string;
  customer_id: string;
  canal: string;
  status: string;
  chat_status?: string;
  updated_at: string;
  metadata: any;
  bot_active?: boolean;
  customer?: {
    id?: string;
    nome: string;
    email: string;
    telefone: string;
    tel?: string;
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
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Atualizar windowWidth no resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isTablet = !isMobile && windowWidth < 1280; // Considera tablet entre 768-1280px
  const isSmallTablet = !isMobile && windowWidth >= 768 && windowWidth < 1024; // Tablet pequeno
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Mobile view state: "list" | "main" | "details"
  const [mobileView, setMobileView] = useState<"list" | "main" | "details">("list");
  
  // Estado do painel de conversas (expandido por padrão)
  const [showConversationsList, setShowConversationsList] = useState(true);
  
  // Estados independentes de Client Details por aba (fechado por padrão em mobile/tablet)
  const [showClientDetailsChat, setShowClientDetailsChat] = useState(!isMobile);
  const [showClientDetailsAgenda, setShowClientDetailsAgenda] = useState(!isMobile);
  const [showClientDetailsEmail, setShowClientDetailsEmail] = useState(!isMobile);
  const [showClientDetailsOrcamento, setShowClientDetailsOrcamento] = useState(!isMobile);
  const [showClientDetailsFluxo, setShowClientDetailsFluxo] = useState(!isMobile);
  
  // Estados específicos por aba
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedTaskData, setSelectedTaskData] = useState<any>(null);
  const [selectedEmailData, setSelectedEmailData] = useState<any>(null);
  
  // AI Chat states
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiWebhooks, setAiWebhooks] = useState<any[]>([]);
  const [selectedAIWebhook, setSelectedAIWebhook] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [showContextBox, setShowContextBox] = useState(false);
  
  // Real-time translation states
  const [isRealTimeTranslationActive, setIsRealTimeTranslationActive] = useState(false);
  const [messageTranslations, setMessageTranslations] = useState<Record<string, string>>({});
  const [translationLanguage, setTranslationLanguage] = useState<string>("pt");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  
  // Summary Panel states
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [conversationSummary, setConversationSummary] = useState<string | null>(null);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<Date | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const [currentAISessionId, setCurrentAISessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Softphone states
  const [showSoftphone, setShowSoftphone] = useState(false);
  const [softphoneNumber, setSoftphoneNumber] = useState("");
  
  // Predictive Dialer state
  const [showPredictiveDialer, setShowPredictiveDialer] = useState(false);
  
  // Tool trigger state (for radial menu -> ChatInput communication)
  const [triggerTool, setTriggerTool] = useState<import("@/components/chat/ChatInput").ChatToolTrigger>(null);
  
  // RadialMenu direct dialogs
  const [showRadialTranslateDialog, setShowRadialTranslateDialog] = useState(false);
  const [showRadialBotDialog, setShowRadialBotDialog] = useState(false);
  const [showRadialWebhookDialog, setShowRadialWebhookDialog] = useState(false);
  const [showRadialTransferDialog, setShowRadialTransferDialog] = useState(false);
  const [showRadialReportsDialog, setShowRadialReportsDialog] = useState(false);
  const [showRadialRealTimeTranslateDialog, setShowRadialRealTimeTranslateDialog] = useState(false);
  const [radialTargetLanguage, setRadialTargetLanguage] = useState("en");
  const [radialTranslateText, setRadialTranslateText] = useState("");
  
  // Import Reports states for RadialMenu
  const [radialImportReports, setRadialImportReports] = useState<any[]>([]);
  const [isRadialProcessingReport, setIsRadialProcessingReport] = useState(false);
  const [radialReportProgress, setRadialReportProgress] = useState(0);
  const [selectedRadialReport, setSelectedRadialReport] = useState<string | null>(null);
  
  // Catalog states for RadialMenu
  const [showRadialCatalogDialog, setShowRadialCatalogDialog] = useState(false);
  const [radialCatalogs, setRadialCatalogs] = useState<any[]>([]);
  const [isRadialProcessingCatalog, setIsRadialProcessingCatalog] = useState(false);
  const [radialCatalogProgress, setRadialCatalogProgress] = useState(0);
  const [selectedRadialCatalog, setSelectedRadialCatalog] = useState<string | null>(null);
  const [radialCatalogSearch, setRadialCatalogSearch] = useState("");
  
  // Confirmation dialogs for orcamento actions
  const [confirmDeleteOrcamento, setConfirmDeleteOrcamento] = useState<string | null>(null);
  const [confirmDuplicateOrcamento, setConfirmDuplicateOrcamento] = useState<string | null>(null);
  
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
  const [activeTab, setActiveTab] = useState("agenda");
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [userEmails, setUserEmails] = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [emailFolder, setEmailFolder] = useState<string>("inbox");
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [composeEmailMode, setComposeEmailMode] = useState<'compose' | 'reply' | 'forward'>('compose');
  const [composeEmailDefaults, setComposeEmailDefaults] = useState<{ to: string; subject: string; body: string }>({ to: '', subject: '', body: '' });
  const [orcamentosStatusFilter, setOrcamentosStatusFilter] = useState<string>("");
  const [orcamentosDateRange, setOrcamentosDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [orcamentosEmpresaFilter, setOrcamentosEmpresaFilter] = useState<string>("");
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string | null>(null);
  const [selectedOrcamentoData, setSelectedOrcamentoData] = useState<any | null>(null);
  const [orcamentoSheetOpen, setOrcamentoSheetOpen] = useState(false);
  const [showNovoOrcamentoConfirm, setShowNovoOrcamentoConfirm] = useState(false);
  const [initialEmpresaForOrcamento, setInitialEmpresaForOrcamento] = useState<string | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  
  // Agenda states
  const [agendaDate, setAgendaDate] = useState(new Date());
  
  type SortCriterion = 
    | { type: 'field'; field: 'created_at' | 'time' | 'dias_atraso' }
    | { type: 'origem_filter'; origem: string; subItem?: string };
  
  const [taskSortOrder, setTaskSortOrder] = useState<SortCriterion[]>([
    { type: 'field', field: 'time' },
    { type: 'field', field: 'created_at' }
  ]);
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [newSortField, setNewSortField] = useState<'created_at' | 'time' | 'dias_atraso' | ''>('');
  const [newOrigemFilter, setNewOrigemFilter] = useState({ origem: '', subItem: '' });
  const [availableOrigens, setAvailableOrigens] = useState<string[]>([]);
  const [availableSubItems, setAvailableSubItems] = useState<string[]>([]);
  
  // Agenda contact filters
  const [agendaFilterPossuiTel, setAgendaFilterPossuiTel] = useState(false);
  const [agendaFilterPossuiWhatsapp, setAgendaFilterPossuiWhatsapp] = useState(false);
  const [agendaFilterPossuiEmail, setAgendaFilterPossuiEmail] = useState(false);
  
  // Fluxo de atendimento states
  const [showFluxoAtendimento, setShowFluxoAtendimento] = useState(false);
  const [showConfigDatas, setShowConfigDatas] = useState(false);
  const [showEnvioMassa, setShowEnvioMassa] = useState(false);
  const [showEnvioMassaWizard, setShowEnvioMassaWizard] = useState(false);
  const [agendaViewMode, setAgendaViewMode] = useState<'default' | 'fluxo' | 'massa'>('default');
  const [fluxoCurrentTask, setFluxoCurrentTask] = useState<any | null>(null);
  const [fluxoInitialIndex, setFluxoInitialIndex] = useState(0);

  // Customer vinculos (for task legends)
  const [customerVinculos, setCustomerVinculos] = useState<{
    linkedToUser: Set<string>;
    userSegments: Set<string>;
    customerSegments: Record<string, string[]>;
  }>({ linkedToUser: new Set(), userSegments: new Set(), customerSegments: {} });
  
  // Tab counters
  const [activeConversationsCount, setActiveConversationsCount] = useState(0);
  const [todayTasksCount, setTodayTasksCount] = useState(0);
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0);
  const [orcamentosEmAndamentoCount, setOrcamentosEmAndamentoCount] = useState(0);
  const [usuarioId, setUsuarioId] = useState<string>("");
  
  // Atendente data
  const [atendente, setAtendente] = useState<Atendente | null>(null);

  // Global client filter
  const [globalFilter, setGlobalFilter] = useState<GlobalFilter | null>(null);

  // Customer search/create dialogs
  const [showCustomerSearchForTask, setShowCustomerSearchForTask] = useState(false);
  const [showCustomerSearchForChat, setShowCustomerSearchForChat] = useState(false);
  const [showCustomerSearchForEmail, setShowCustomerSearchForEmail] = useState(false);
  const [showCustomerSearchForOrcamento, setShowCustomerSearchForOrcamento] = useState(false);

  // Estados para edição inline de contato/empresa
  const [editingContatoId, setEditingContatoId] = useState<string | null>(null);
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);
  const [editingCustomerEmpresaId, setEditingCustomerEmpresaId] = useState<string | null>(null);

  // Estados para criação inline de contato/empresa
  const [creatingContato, setCreatingContato] = useState(false);
  const [creatingContatoInitialData, setCreatingContatoInitialData] = useState<{ nome?: string; email?: string; telefone?: string } | null>(null);
  const [creatingEmpresa, setCreatingEmpresa] = useState(false);
  const [creatingEmpresaForCustomerId, setCreatingEmpresaForCustomerId] = useState<string | null>(null);

  // Ferramentas dinâmicas por aba
  const { getRadialMenuItems, getToolbarFerramentas, loading: loadingFerramentas } = useFerramentasAtendimento(estabelecimentoId || null);

  // Omnichannel routing
  const { setupMessageListener } = useOmnichannelRouting();
  
  // Compute last user message for agent assist
  const lastUserMessage = messages
    .filter(m => m.sender === 'customer')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.text || null;
  
  const loadAtendente = async (authUserId: string) => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        console.log("❌ Estabelecimento ID não encontrado");
        return;
      }
      
      console.log("🔍 Buscando usuário com auth_user_id:", authUserId);
      
      // Primeiro buscar o registro em usuarios para pegar o ID correto
      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", authUserId)
        .eq("estabelecimento_id", estabId)
        .maybeSingle();
        
      if (usuarioError) {
        console.error("❌ Erro ao buscar usuário:", usuarioError);
        return;
      }
      
      if (!usuarioData) {
        console.log("⚠️ Usuário não encontrado na tabela usuarios");
        return;
      }
      
      const usuarioId = usuarioData.id;
      console.log("✅ Usuário encontrado, ID:", usuarioId);
      
      // Agora buscar o atendente com o usuario_id correto
      const { data: atendenteData, error: atendenteError } = await supabase
        .from("atendentes")
        .select("*")
        .eq("usuario_id", usuarioId)
        .eq("estabelecimento_id", estabId)
        .maybeSingle();
        
      if (atendenteError) {
        console.error("❌ Erro ao carregar atendente:", atendenteError);
        return;
      }
      
      if (atendenteData) {
        console.log("✅ Atendente encontrado:", atendenteData);
        setAtendente(atendenteData as Atendente);
      } else {
        console.log("⚠️ Atendente não encontrado - criando registro...");
        // Criar registro de atendente se não existir
        const { data: newAtendente, error: createError } = await supabase
          .from("atendentes")
          .insert({
            usuario_id: usuarioId,
            estabelecimento_id: estabId,
            status: "offline",
            max_chats_simultaneos: 3,
            aceita_novos_chats: true
          })
          .select()
          .single();
          
        if (createError) {
          console.error("❌ Erro ao criar atendente:", createError);
          return;
        }
        
        if (newAtendente) {
          console.log("✅ Atendente criado:", newAtendente);
          setAtendente(newAtendente as Atendente);
        }
      }
    } catch (err) {
      console.error("❌ Erro ao buscar atendente:", err);
    }
  };

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuarioId(user.id);
        loadAtendente(user.id);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    const initEstabelecimento = async () => {
      const id = await getEstabelecimentoId();
      if (id) {
        setEstabelecimentoId(id);
        // Configurar listener de mensagens para roteamento automático
        const cleanup = setupMessageListener(id);
        return cleanup;
      }
    };
    initEstabelecimento();
    loadConversations();
    subscribeToConversations();
    loadAIWebhooks();
    loadAvailableBots();
    loadWebhooksForAutoResponse();
    loadAvailableUsers();
    loadTodayTasks();
    loadCustomerVinculos();
    loadUserEmails();
    loadOrcamentos();
    loadRadialImportReports();
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

  // Realtime: ouvir mudanças na tabela customers para sincronizar edições inline/tela central
  useEffect(() => {
    const channel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers'
        },
        async (payload) => {
          const updatedCustomerId = payload.new?.id;
          console.log('[Realtime] Customer atualizado:', updatedCustomerId);
          
          // Recarregar dados conforme a aba/item selecionado
          if (selectedConversation) {
            loadCustomerCompanies(selectedConversation);
            
            // Atualizar também o customer na conversa selecionada se for o mesmo
            const selectedConv = conversations.find(c => c.id === selectedConversation);
            if (selectedConv?.customer?.id === updatedCustomerId) {
              // Buscar dados atualizados do customer
              const { data: updatedCustomer } = await supabase
                .from('customers')
                .select('id, nome, email, telefone, tel')
                .eq('id', updatedCustomerId)
                .single();
              
              if (updatedCustomer) {
                // Atualizar a conversa na lista com os novos dados do customer
                setConversations(prev => prev.map(c => 
                  c.id === selectedConversation 
                    ? { ...c, customer: { ...c.customer, ...updatedCustomer } }
                    : c
                ));
              }
            }
          }
          if (selectedTaskId) {
            loadSelectedTask(selectedTaskId);
          }
          if (selectedEmailId) {
            loadSelectedEmail(selectedEmailId);
          }
          if (selectedOrcamentoId) {
            loadSelectedOrcamento(selectedOrcamentoId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, selectedTaskId, selectedEmailId, selectedOrcamentoId, conversations]);
  
  // Note: Counter updates moved after useMemos to avoid using variables before declaration

  // Fechar POSView e limpar conteúdo ao trocar de aba
  useEffect(() => {
    // Limpar conversa quando não estiver na aba chat
    if (activeTab !== 'chat') {
      setSelectedConversation(null);
      setMessages([]);
    }
    
    // Limpar agenda quando não estiver na aba agenda
    if (activeTab !== 'agenda') {
      setSelectedTaskId(null);
      setSelectedTaskData(null);
    }
    
    // Limpar email quando não estiver na aba email
    if (activeTab !== 'email') {
      setSelectedEmailId(null);
      setSelectedEmailData(null);
    }
    
    // Fechar orçamento quando não estiver na aba orçamento
    if (activeTab !== 'orcamento') {
      setOrcamentoSheetOpen(false);
      setSelectedOrcamentoId(null);
    }
  }, [activeTab]);


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

  // Load import reports for RadialMenu
  const loadRadialImportReports = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      const hoje = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .or(`data_validade.is.null,data_validade.gte.${hoje}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRadialImportReports(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios de importação:", error);
    }
  };

  const handleRadialReportSelect = async (reportId: string, fileType: 'pdf' | 'excel') => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa primeiro");
      return;
    }

    const report = radialImportReports.find(r => r.id === reportId);
    if (!report) {
      toast.error("Relatório não encontrado");
      return;
    }

    setIsRadialProcessingReport(true);
    setRadialReportProgress(0);

    try {
      setRadialReportProgress(10);

      // Buscar modelo de relatório
      const { data: modelo } = await supabase
        .from("relatorios")
        .select("id, layout_json")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("nome", "Modelo para Produtos Importados")
        .maybeSingle();

      setRadialReportProgress(20);

      // Buscar dados da API
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-produtos-importados?estabelecimento_id=${estabelecimentoId}&relatorio_id=${reportId}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }

      const data = await response.json();
      setRadialReportProgress(40);

      let records = [];
      if (Array.isArray(data)) {
        records = data;
      } else if (data.data && Array.isArray(data.data)) {
        records = data.data;
      } else if (typeof data === 'object') {
        records = [data];
      }

      if (records.length === 0) {
        toast.error("Nenhum dado encontrado");
        setIsRadialProcessingReport(false);
        return;
      }

      setRadialReportProgress(50);

      // Extrair colunas do modelo
      let columnNames: string[] = [];
      if (modelo) {
        const layoutJsonObj = typeof modelo.layout_json === 'string'
          ? JSON.parse(modelo.layout_json)
          : modelo.layout_json;
        const parameters = layoutJsonObj?.parameters || [];
        const apiParam = parameters.find((p: any) => p.name === 'api_data');
        if (apiParam && Array.isArray(apiParam.children)) {
          apiParam.children.forEach((child: any) => {
            if (child.name) columnNames.push(child.name);
          });
        }
      }

      if (columnNames.length === 0) {
        columnNames = Object.keys(records[0] || {});
      }

      // Filtrar registros
      const filteredRecords = records.map((record: any) => {
        const filtered: any = {};
        columnNames.forEach((col: string) => {
          if (col in record) {
            const value = record[col];
            filtered[col] = value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
          }
        });
        return filtered;
      });

      setRadialReportProgress(70);

      let fileBlob: Blob;
      let fileName: string;

      if (fileType === 'excel') {
        // Gerar Excel
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(filteredRecords);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dados");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        fileBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        fileName = `${report.nome}.xlsx`;
      } else {
        // Gerar PDF
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ orientation: columnNames.length > 5 ? 'l' : 'p' });

        doc.setFontSize(14);
        doc.text(report.nome, 10, 15);
        doc.setFontSize(8);

        // Headers
        const startY = 25;
        const cellWidth = (doc.internal.pageSize.getWidth() - 20) / columnNames.length;
        let yPos = startY;

        // Header row
        doc.setFillColor(240, 240, 240);
        doc.rect(10, yPos - 4, doc.internal.pageSize.getWidth() - 20, 8, 'F');
        columnNames.forEach((col, i) => {
          doc.text(String(col).substring(0, 15), 10 + i * cellWidth, yPos);
        });
        yPos += 10;

        // Data rows
        filteredRecords.slice(0, 50).forEach((record: any) => {
          if (yPos > doc.internal.pageSize.getHeight() - 15) {
            doc.addPage();
            yPos = 15;
          }
          columnNames.forEach((col, i) => {
            const value = record[col] ?? '';
            doc.text(String(value).substring(0, 20), 10 + i * cellWidth, yPos);
          });
          yPos += 6;
        });

        fileBlob = doc.output('blob');
        fileName = `${report.nome}.pdf`;
      }

      setRadialReportProgress(90);

      // Upload para storage
      const filePath = `reports/${Date.now()}_${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, fileBlob, {
          contentType: fileType === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      setRadialReportProgress(100);

      if (urlData?.publicUrl) {
        handleSendMessage(`Relatório: ${report.nome}`, "file", urlData.publicUrl, fileName);
        toast.success(`Relatório "${report.nome}" anexado!`);
      }

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsRadialProcessingReport(false);
      setShowRadialReportsDialog(false);
    }
  };

  // Load catalogs for radial menu
  const loadRadialCatalogs = async () => {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from("catalogos_salvos")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Filter expired catalogs
      const filtered = (data || []).filter((catalog: any) => {
        if (!catalog.data_indeterminada && catalog.data_validade) {
          return new Date(catalog.data_validade) > now;
        }
        return true;
      });

      setRadialCatalogs(filtered);
    } catch (error) {
      console.error("Erro ao carregar catálogos:", error);
    }
  };

  // Handle catalog selection from radial menu
  const handleRadialCatalogSelect = async (catalogId: string) => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa primeiro");
      return;
    }

    const catalog = radialCatalogs.find(c => c.id === catalogId);
    if (!catalog) {
      toast.error("Catálogo não encontrado");
      return;
    }

    // Parse pages
    const coverPage = catalog.cover_page && typeof catalog.cover_page === 'object' ? catalog.cover_page : null;
    const productsPage = catalog.products_page && typeof catalog.products_page === 'object' ? catalog.products_page : null;
    const backcoverPage = catalog.backcover_page && typeof catalog.backcover_page === 'object' ? catalog.backcover_page : null;

    if (!coverPage || !productsPage || !backcoverPage) {
      toast.error("Catálogo incompleto. Edite o catálogo para completar todas as páginas.");
      return;
    }

    setIsRadialProcessingCatalog(true);
    setRadialCatalogProgress(0);

    try {
      setRadialCatalogProgress(20);

      // Import PDF generation components dynamically
      const { pdf } = await import("@react-pdf/renderer");
      const { CatalogPDFDocument } = await import("@/components/marketing/catalogo/PDFDocument");
      const { LAYOUT_OPTIONS } = await import("@/components/marketing/catalogo/types");

      setRadialCatalogProgress(40);

      const config = catalog.config && typeof catalog.config === 'object' ? catalog.config : {};
      const products = (productsPage as any).products || [];
      const layout = (productsPage as any).layout || 'grid-3';
      const layoutConfig = LAYOUT_OPTIONS.find((l: any) => l.value === layout) || LAYOUT_OPTIONS[1];
      const productsPerPage = layout === 'list' ? 4 : layoutConfig.cols * 2;
      const groupByCategory = (productsPage as any).groupByCategory ?? true;

      // Build grouped products
      const groupedProducts: any[] = [];
      if (!groupByCategory) {
        groupedProducts.push({ id: 'all', nome: 'Todos os Produtos', products });
      } else {
        const groupMap = new Map();
        products.forEach((product: any) => {
          const groupName = product.grupo_nome || 'Outros';
          const groupId = product.grupo_id || `outros_${groupName.replace(/\s+/g, '_').toLowerCase()}`;
          if (!groupMap.has(groupId)) {
            groupMap.set(groupId, { id: groupId, nome: groupName, products: [], descritivo_catalogo: product.grupo_descritivo_catalogo });
          }
          groupMap.get(groupId).products.push(product);
        });
        groupedProducts.push(...Array.from(groupMap.values()).sort((a, b) => a.nome.localeCompare(b.nome)));
      }

      setRadialCatalogProgress(50);

      // Build pages array
      const pages: any[] = [{ type: 'cover', pageNumber: 1 }];
      let pageNum = 2;

      groupedProducts.forEach(group => {
        if (groupByCategory) {
          pages.push({ type: 'group-header', groupName: group.nome, pageNumber: pageNum++ });
        }
        const totalProductPages = Math.ceil(group.products.length / productsPerPage);
        for (let i = 0; i < totalProductPages; i++) {
          pages.push({
            type: 'products',
            groupName: group.nome,
            products: group.products.slice(i * productsPerPage, (i + 1) * productsPerPage),
            startIdx: i * productsPerPage,
            pageNumber: pageNum++,
          });
        }
      });

      if ((config as any).showPriceTable !== false) {
        const sortedGroupsForPriceTable = [...groupedProducts]
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .map(group => ({
            groupName: group.nome,
            products: [...group.products].sort((a: any, b: any) => a.nome.localeCompare(b.nome))
          }));

        const ROWS_PER_PRICE_PAGE = 28;
        let currentPricePageProducts: any[] = [];
        let currentRowCount = 0;

        sortedGroupsForPriceTable.forEach(group => {
          const groupRows = 1 + group.products.length;
          if (currentRowCount + groupRows > ROWS_PER_PRICE_PAGE && currentPricePageProducts.length > 0) {
            pages.push({ type: 'price-table', priceTableData: currentPricePageProducts, pageNumber: pageNum++ });
            currentPricePageProducts = [];
            currentRowCount = 0;
          }
          currentPricePageProducts.push(group);
          currentRowCount += groupRows;
        });

        if (currentPricePageProducts.length > 0) {
          pages.push({ type: 'price-table', priceTableData: currentPricePageProducts, pageNumber: pageNum++ });
        }
      }

      pages.push({ type: 'backcover', pageNumber: pageNum });

      setRadialCatalogProgress(70);

      // Generate PDF
      const pdfBlob = await pdf(
        <CatalogPDFDocument
          config={config as any}
          coverPage={coverPage as any}
          productsPage={productsPage as any}
          backcoverPage={backcoverPage as any}
          groupImages={(config as any).groupImages || {}}
          groupedProducts={groupedProducts}
          pages={pages}
        />
      ).toBlob();

      setRadialCatalogProgress(85);

      const fileName = `catalogo_${catalog.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      // Upload to storage
      const filePath = `catalogs/${Date.now()}_${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, pdfBlob, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      setRadialCatalogProgress(100);

      if (urlData?.publicUrl) {
        handleSendMessage(`Catálogo: ${catalog.nome}`, "file", urlData.publicUrl, fileName);
        toast.success(`Catálogo "${catalog.nome}" anexado!`);
      }

    } catch (error) {
      console.error("Erro ao gerar catálogo:", error);
      toast.error("Erro ao gerar catálogo");
    } finally {
      setIsRadialProcessingCatalog(false);
      setShowRadialCatalogDialog(false);
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
        // Se não encontrou customer, tentar buscar empresa direto pelo whatsapp_vinculados
        if (phone) {
          const normalizedPhone = normalizePhone(phone);
          const estabId = await getEstabelecimentoId();
          
          if (estabId) {
            const { data: empresas } = await supabase
              .from("empresas")
              .select("id, nome, nome_fantasia, cnpj, whatsapps_vinculados")
              .eq("estabelecimento_id", estabId)
              .not("whatsapps_vinculados", "is", null);

            const empresaEncontrada = empresas?.find((e: any) =>
              e.whatsapps_vinculados?.some((wp: string) =>
                normalizePhone(wp) === normalizedPhone
              )
            );

            if (empresaEncontrada) {
              setCustomerCompanies([{
                empresa_id: empresaEncontrada.id,
                is_primary: true,
                cargo: null,
                empresas: {
                  id: empresaEncontrada.id,
                  nome: empresaEncontrada.nome,
                  nome_fantasia: empresaEncontrada.nome_fantasia,
                  cnpj: empresaEncontrada.cnpj
                }
              }]);
              return;
            }
          }
        }

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

      if (companiesData && companiesData.length > 0) {
        setCustomerCompanies(companiesData);
      } else {
        // Tentar também pelo whatsapps_vinculados caso não tenha vinculo tradicional
        if (phone) {
          const normalizedPhone = normalizePhone(phone);
          const estabId = await getEstabelecimentoId();
          
          if (estabId) {
            const { data: empresas } = await supabase
              .from("empresas")
              .select("id, nome, nome_fantasia, cnpj, whatsapps_vinculados")
              .eq("estabelecimento_id", estabId)
              .not("whatsapps_vinculados", "is", null);

            const empresaEncontrada = empresas?.find((e: any) =>
              e.whatsapps_vinculados?.some((wp: string) =>
                normalizePhone(wp) === normalizedPhone
              )
            );

            if (empresaEncontrada) {
              setCustomerCompanies([{
                empresa_id: empresaEncontrada.id,
                is_primary: true,
                cargo: null,
                empresas: {
                  id: empresaEncontrada.id,
                  nome: empresaEncontrada.nome,
                  nome_fantasia: empresaEncontrada.nome_fantasia,
                  cnpj: empresaEncontrada.cnpj
                }
              }]);
              return;
            }
          }
        }
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

  // Load customer vinculos for legends
  const loadCustomerVinculos = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('estabelecimento_id', estabId)
        .maybeSingle();

      if (!usuarioData) return;

      const currentUsuarioId = usuarioData.id;

      const linkedToUser = new Set<string>();
      const userSegments = new Set<string>();
      const contactSegments: Record<string, string[]> = {};

      // Load user segments from usuario_segmentos table (many-to-many)
      const { data: userSegmentosData } = await supabase
        .from('usuario_segmentos')
        .select('segmento_id')
        .eq('usuario_id', currentUsuarioId);

      if (userSegmentosData) {
        userSegmentosData.forEach(us => {
          userSegments.add(us.segmento_id);
        });
      }

      // Load customer vinculos (customers linked to user)
      const { data: customerVinculosData } = await supabase
        .from('customer_vinculos')
        .select('customer_id, usuario_id')
        .eq('estabelecimento_id', estabId);

      if (customerVinculosData) {
        customerVinculosData.forEach(v => {
          if (v.usuario_id === currentUsuarioId) {
            linkedToUser.add(v.customer_id);
          }
        });
      }

      // Load empresa vinculos (empresas linked to user AND empresa segments)
      const { data: empresaVinculosData } = await supabase
        .from('empresa_vinculos')
        .select('empresa_id, usuario_id, segmento_id')
        .eq('estabelecimento_id', estabId);

      if (empresaVinculosData) {
        empresaVinculosData.forEach(v => {
          if (v.usuario_id === currentUsuarioId) {
            linkedToUser.add(v.empresa_id);
          }
          if (v.segmento_id) {
            if (!contactSegments[v.empresa_id]) {
              contactSegments[v.empresa_id] = [];
            }
            contactSegments[v.empresa_id].push(v.segmento_id);
          }
        });
      }

      // Load customer segments from customer_segmentos table
      const { data: customerSegmentosData } = await supabase
        .from('customer_segmentos')
        .select('customer_id, segmento_id');

      if (customerSegmentosData) {
        customerSegmentosData.forEach(cs => {
          if (!contactSegments[cs.customer_id]) {
            contactSegments[cs.customer_id] = [];
          }
          contactSegments[cs.customer_id].push(cs.segmento_id);
        });
      }

      setCustomerVinculos({ linkedToUser, userSegments, customerSegments: contactSegments });
    } catch (error) {
      console.error("Erro ao carregar vínculos:", error);
    }
  };

  // Load tasks for selected date
  const loadTodayTasks = async (date: Date = agendaDate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar o ID do usuário na tabela usuarios (a FK user_id referencia usuarios, não auth.users)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      if (!usuarioData) {
        console.error("Usuário não encontrado na tabela usuarios");
        return;
      }

      const dateStr = format(date, 'yyyy-MM-dd');

      // Fetch tasks first - usar o ID da tabela usuarios
      const { data: tasksData, error } = await supabase
        .from('calendario_tarefas')
        .select('*')
        .eq('user_id', usuarioData.id)
        .eq('date', dateStr);

      if (error) {
        console.error("Erro ao carregar tarefas:", error);
        return;
      }

      // Get unique contact_ids that are not null
      const contactIds = [...new Set(
        (tasksData || [])
          .map(t => t.contact_id)
          .filter(Boolean)
      )];

      // Fetch customers separately if there are any contact_ids
      let customersMap: Record<string, any> = {};
      if (contactIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select(`
            id, nome, telefone, tel, email,
            customer_empresas (
              empresa_id,
              is_primary,
              cargo,
              empresas:empresa_id (
                id,
                nome,
                nome_fantasia
              )
            )
          `)
          .in('id', contactIds);
        
        if (customersData) {
          customersMap = customersData.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Merge customers into tasks
      const tasksWithCustomers = (tasksData || []).map(task => ({
        ...task,
        customers: task.contact_id ? customersMap[task.contact_id] || null : null
      }));

      // Apply custom sorting
      const sortedTasks = sortTasks(tasksWithCustomers);
      setTodayTasks(sortedTasks);
      setTodayTasksCount(sortedTasks.length);
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
    }
  };

  // Sort tasks based on custom order
  const sortTasks = (tasks: any[]) => {
    return [...tasks].sort((a, b) => {
      for (const criterion of taskSortOrder) {
        let comparison = 0;
        
        if (criterion.type === 'field') {
          if (criterion.field === 'created_at') {
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          } else if (criterion.field === 'time') {
            comparison = (a.time || '').localeCompare(b.time || '');
          }
        } else if (criterion.type === 'origem_filter') {
          // Prioriza tarefas que correspondem à origem/subItem especificados
          const aMatches = a.origem === criterion.origem && 
                          (!criterion.subItem || a.origem_sub_item === criterion.subItem);
          const bMatches = b.origem === criterion.origem && 
                          (!criterion.subItem || b.origem_sub_item === criterion.subItem);
          
          if (aMatches && !bMatches) return -1;
          if (!aMatches && bMatches) return 1;
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
      loadAvailableOrigens();
    }
  }, [agendaDate, taskSortOrder, activeTab]);

  const loadAvailableOrigens = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('calendario_tarefas')
        .select('origem')
        .eq('estabelecimento_id', estabelecimentoId)
        .not('origem', 'is', null);

      if (!error && data) {
        const uniqueOrigens = Array.from(new Set(data.map(t => t.origem).filter(Boolean)));
        setAvailableOrigens(uniqueOrigens);
      }
    } catch (error) {
      console.error("Erro ao carregar origens:", error);
    }
  };

  const loadSubItemsForOrigem = async (origem: string) => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('calendario_tarefas')
        .select('origem_sub_item')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('origem', origem)
        .not('origem_sub_item', 'is', null);

      if (!error && data) {
        const uniqueSubItems = Array.from(new Set(data.map(t => t.origem_sub_item).filter(Boolean)));
        setAvailableSubItems(uniqueSubItems);
      }
    } catch (error) {
      console.error("Erro ao carregar sub-items:", error);
    }
  };

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

  const removeSortCriterion = (index: number) => {
    const newOrder = taskSortOrder.filter((_, i) => i !== index);
    setTaskSortOrder(newOrder);
  };

  const addSortField = () => {
    if (newSortField) {
      const criterion: SortCriterion = { type: 'field', field: newSortField };
      setTaskSortOrder([...taskSortOrder, criterion]);
      setNewSortField('');
    }
  };

  const addOrigemFilter = () => {
    if (newOrigemFilter.origem) {
      const criterion: SortCriterion = {
        type: 'origem_filter',
        origem: newOrigemFilter.origem,
        subItem: newOrigemFilter.subItem || undefined
      };
      setTaskSortOrder([...taskSortOrder, criterion]);
      setNewOrigemFilter({ origem: '', subItem: '' });
      setAvailableSubItems([]);
    }
  };

  const handleOrigemChange = (origem: string) => {
    setNewOrigemFilter({ origem, subItem: '' });
    setAvailableSubItems([]);
    if (origem) {
      loadSubItemsForOrigem(origem);
    }
  };

  const getAvailableSortFields = (): Array<'created_at' | 'time' | 'dias_atraso'> => {
    const allFields: Array<'created_at' | 'time' | 'dias_atraso'> = ['created_at', 'time', 'dias_atraso'];
    return allFields.filter(field => 
      !taskSortOrder.some(c => c.type === 'field' && c.field === field)
    );
  };

  const getSortLabel = (criterion: SortCriterion) => {
    if (criterion.type === 'field') {
      switch (criterion.field) {
        case 'created_at': return 'Data de Entrada';
        case 'time': return 'Horário';
        case 'dias_atraso': return 'Dias de Atraso';
        default: return criterion.field;
      }
    } else {
      if (criterion.subItem) {
        return `${criterion.origem} - ${criterion.subItem}`;
      }
      return `${criterion.origem} (todos)`;
    }
  };

  // Load user emails
  const loadUserEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      // Check email mode configuration
      const { data: emailConfigs } = await supabase
        .from('email_oauth_config')
        .select('provider, enabled')
        .eq('estabelecimento_id', estabId);

      const googleEnabled = emailConfigs?.find((c: any) => c.provider === 'google')?.enabled;
      const externalEnabled = emailConfigs?.find((c: any) => c.provider === 'external_server')?.enabled;

      let emails: any[] = [];

      // Use OAuth (Gmail) if enabled
      if (googleEnabled) {
        try {
          const { data: fetchedEmails, error: fetchError } = await supabase.functions.invoke('gmail-fetch-emails', {
            body: { folder: 'INBOX', maxResults: 50 }
          });

          if (!fetchError && fetchedEmails?.emails) {
            emails = fetchedEmails.emails.map((email: any, index: number) => ({
              id: email.id || `email-${Date.now()}-${index}`,
              from_email: email.from_email,
              to_email: email.to_email,
              subject: email.subject,
              body: email.body,
              date: email.date,
              read: email.read ?? false,
              starred: email.starred ?? false,
              folder: 'inbox',
            }));
          } else if (fetchError) {
            console.error("Erro ao buscar emails via Gmail OAuth:", fetchError);
          }
        } catch (gmailError) {
          console.error("Gmail OAuth fetch error:", gmailError);
        }
      }
      // Use external server (SMTP/IMAP) if enabled
      else if (externalEnabled) {
        try {
          const { data: fetchedEmails, error: fetchError } = await supabase.functions.invoke('fetch-emails-imap', {
            body: { folder: 'INBOX', maxResults: 50 }
          });

          if (!fetchError && fetchedEmails?.emails) {
            emails = fetchedEmails.emails.map((email: any, index: number) => ({
              id: email.id || `email-${Date.now()}-${index}`,
              from_email: email.from_email,
              to_email: email.to_email,
              subject: email.subject,
              body: email.body,
              date: email.date,
              read: email.read ?? false,
              starred: email.starred ?? false,
              folder: 'inbox',
            }));
          } else if (fetchError) {
            console.error("Erro ao buscar emails via IMAP:", fetchError);
          }
        } catch (imapError) {
          console.error("IMAP fetch error:", imapError);
        }
      }

      // Also load sent emails from local database (including tracking fields)
      const { data: sentEmailsData } = await supabase
        .from('emails')
        .select('id, from_email, to_email, subject, body, date, read, starred, folder, tracking_id, opened_at, opened_count')
        .eq('user_id', user.id)
        .eq('folder', 'sent')
        .order('date', { ascending: false })
        .limit(50);

      if (sentEmailsData && sentEmailsData.length > 0) {
        emails = [...emails, ...sentEmailsData];
      }

      // If no emails from remote, fallback to local database for inbox
      if (emails.filter(e => e.folder === 'inbox').length === 0) {
        const { data: emailsData, error } = await supabase
          .from('emails')
          .select('*')
          .eq('user_id', user.id)
          .eq('folder', 'inbox')
          .order('date', { ascending: false })
          .limit(50);

        if (!error && emailsData) {
          emails = [...emails.filter(e => e.folder === 'sent'), ...emailsData];
        }
      }

      setUserEmails(emails);
    } catch (error) {
      console.error("Erro ao carregar emails:", error);
    }
  };

  // Send email function
  const handleSendEmail = async (emailData: { to: string; subject: string; body: string; attachments?: any[] }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const estabId = await getEstabelecimentoId();
      if (!estabId) throw new Error('Estabelecimento não encontrado');

      // Check email mode configuration
      const { data: emailConfigs } = await supabase
        .from('email_oauth_config')
        .select('provider, enabled')
        .eq('estabelecimento_id', estabId);

      const googleEnabled = emailConfigs?.find((c: any) => c.provider === 'google')?.enabled;
      const externalEnabled = emailConfigs?.find((c: any) => c.provider === 'external_server')?.enabled;

      let functionName = 'send-email-smtp';
      if (googleEnabled) {
        functionName = 'gmail-send-email';
      }

      // Send email via edge function
      const { error: sendError } = await supabase.functions.invoke(functionName, {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          html: `<p>${emailData.body.replace(/\n/g, '<br>')}</p>`
        }
      });

      if (sendError) throw sendError;

      // Reload emails in background (don't wait)
      loadUserEmails();

    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  };
  
  // Load orçamentos
  const loadOrcamentos = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data: orcamentosData, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          customers:cliente_id (
            nome,
            telefone,
            email
          ),
          empresas:empresa_id (
            nome_fantasia,
            nome
          ),
          itens:orcamento_itens (
            id,
            quantidade,
            preco_unitario,
            subtotal
          )
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error("Erro ao carregar orçamentos:", error);
        return;
      }

      // Calcular valor_total real a partir dos itens
      const orcamentosComTotalReal = (orcamentosData || []).map(orc => {
        const totalCalculado = orc.itens?.reduce((sum: number, item: any) => {
          return sum + (item.quantidade * item.preco_unitario);
        }, 0) || 0;
        
        return {
          ...orc,
          valor_total: totalCalculado > 0 ? totalCalculado : orc.valor_total
        };
      });

      setOrcamentos(orcamentosComTotalReal);
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error);
    }
  };

  // Duplicar orçamento
  const duplicateOrcamento = async (orcamentoId: string) => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      // Buscar orçamento original com itens
      const { data: original, error: fetchError } = await supabase
        .from('orcamentos')
        .select('*, itens:orcamento_itens(*)')
        .eq('id', orcamentoId)
        .single();

      if (fetchError || !original) {
        toast.error("Erro ao buscar orçamento");
        return;
      }

      // Criar novo orçamento
      const { data: newOrcamento, error: insertError } = await supabase
        .from('orcamentos')
        .insert({
          estabelecimento_id: estabId,
          cliente_id: original.cliente_id,
          empresa_id: original.empresa_id,
          status: 'orcamento',
          etapa: 'orcamento',
          valor_total: original.valor_total,
          observacoes: original.observacoes,
          condicao_pagamento_id: original.condicao_pagamento_id,
        })
        .select()
        .single();

      if (insertError || !newOrcamento) {
        toast.error("Erro ao duplicar orçamento");
        return;
      }

      // Duplicar itens
      if (original.itens && original.itens.length > 0) {
        const itensParaDuplicar = original.itens.map((item: any) => ({
          orcamento_id: newOrcamento.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          preco_original: item.preco_original || item.preco_unitario,
          subtotal: item.subtotal,
          desconto: item.desconto || 0,
        }));

        await supabase.from('orcamento_itens').insert(itensParaDuplicar);
      }

      toast.success("Orçamento duplicado com sucesso!");
      loadOrcamentos();
    } catch (error) {
      console.error("Erro ao duplicar orçamento:", error);
      toast.error("Erro ao duplicar orçamento");
    }
  };

  // Excluir orçamento
  const deleteOrcamento = async (orcamentoId: string) => {
    try {
      // Primeiro excluir os itens
      await supabase.from('orcamento_itens').delete().eq('orcamento_id', orcamentoId);
      
      // Depois excluir o orçamento
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', orcamentoId);

      if (error) {
        toast.error("Erro ao excluir orçamento");
        return;
      }

      toast.success("Orçamento excluído com sucesso!");
      
      // Limpar seleção se necessário
      if (selectedOrcamentoId === orcamentoId) {
        setSelectedOrcamentoId(null);
        setOrcamentoSheetOpen(false);
      }
      
      loadOrcamentos();
    } catch (error) {
      console.error("Erro ao excluir orçamento:", error);
      toast.error("Erro ao excluir orçamento");
    }
  };

  // Criar tarefa a partir de um contato selecionado
  const handleCreateTaskFromContact = async (type: 'customer' | 'empresa', data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const contactName = type === 'customer' 
        ? data.nome 
        : (data.nome_fantasia || data.nome || 'Empresa');

      const { error } = await supabase
        .from('calendario_tarefas')
        .insert({
          user_id: user.id,
          estabelecimento_id: estabId,
          title: `Contato - ${contactName}`,
          contact_name: contactName,
          contact_id: data.id,
          date: today,
          origem: 'manual',
          status: 'pendente'
        });

      if (error) {
        toast.error("Erro ao criar tarefa: " + error.message);
        return;
      }

      toast.success("Tarefa criada com sucesso!");
      loadTodayTasks(agendaDate);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      toast.error("Erro ao criar tarefa");
    }
  };

  // Criar conversa a partir de um contato selecionado
  const handleCreateConversationFromContact = async (type: 'customer' | 'empresa', data: any) => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      // Se for empresa, verificar se tem pelo menos um contato vinculado
      if (type === 'empresa') {
        toast.error("Para iniciar conversa, selecione uma pessoa. Empresas não podem ter conversas diretas.");
        return;
      }

      // Verificar se o cliente tem telefone
      if (!data.telefone) {
        toast.error("O contato não possui telefone cadastrado para iniciar uma conversa");
        return;
      }

      // Verificar se já existe uma conversa ativa com esse cliente
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', data.id)
        .eq('estabelecimento_id', estabId)
        .neq('chat_status', 'encerrado')
        .maybeSingle();

      if (existingConv) {
        // Selecionar a conversa existente
        setSelectedConversation(existingConv.id);
        setActiveTab('chat');
        toast.info("Conversa existente selecionada");
        return;
      }

      // Criar nova conversa
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          customer_id: data.id,
          estabelecimento_id: estabId,
          canal: 'whatsapp',
          status: 'active',
          chat_status: 'novo',
          bot_active: false
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar conversa: " + error.message);
        return;
      }

      // Selecionar a nova conversa
      setSelectedConversation(newConv.id);
      setActiveTab('chat');
      loadConversations();
      toast.success("Conversa iniciada!");
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast.error("Erro ao criar conversa");
    }
  };

  // Criar email a partir de um contato selecionado
  const handleCreateEmailFromContact = async (type: 'customer' | 'empresa', data: any) => {
    const email = data.email || '';
    setComposeEmailDefaults({ to: email, subject: '', body: '' });
    setComposeEmailMode('compose');
    setShowComposeEmail(true);
    if (email) {
      toast.success(`E-mail pré-preenchido para ${data.nome || data.nome_fantasia || 'contato'}`);
    }
  };

  // Criar orçamento a partir de um contato selecionado
  const handleCreateOrcamentoFromContact = async (type: 'customer' | 'empresa', data: any) => {
    setOrcamentoSheetOpen(false);
    setSelectedOrcamentoId(null);
    if (type === 'empresa') {
      setInitialEmpresaForOrcamento(data.id);
    } else {
      setInitialEmpresaForOrcamento(data.empresa_id || null);
    }
    setTimeout(() => {
      setOrcamentoSheetOpen(true);
      setActiveTab('orcamento');
    }, 100);
    toast.success(`Orçamento iniciado para ${data.nome || data.nome_fantasia || 'contato'}`);
  };

  // Load dados do orçamento selecionado
  const loadSelectedOrcamento = async (orcamentoId: string) => {
    try {
      const { data: orcamentoData, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          customers:cliente_id (
            id,
            nome,
            telefone,
            email
          ),
          empresas:empresa_id (
            id,
            nome_fantasia,
            nome,
            cnpj,
            telefone,
            email
          )
        `)
        .eq('id', orcamentoId)
        .single();

      if (error) {
        console.error("Erro ao carregar orçamento:", error);
        return;
      }

      setSelectedOrcamentoData(orcamentoData);

      // Se o orçamento tem cliente_id, carregar empresas vinculadas
      if (orcamentoData?.customers?.id) {
        const { data: companiesData } = await supabase
          .from('customer_empresas')
          .select(`
            *,
            empresas:empresa_id (
              id,
              nome,
              nome_fantasia,
              cnpj
            )
          `)
          .eq('customer_id', orcamentoData.customers.id);

        if (companiesData) {
          setCustomerCompanies(companiesData);
        }
      } else {
        setCustomerCompanies([]);
      }
    } catch (error) {
      console.error("Erro ao carregar orçamento:", error);
    }
  };

  useEffect(() => {
    if (selectedOrcamentoId) {
      loadSelectedOrcamento(selectedOrcamentoId);
    }
  }, [selectedOrcamentoId]);

  // Carregar dados da tarefa selecionada
  const loadSelectedTask = async (taskId: string) => {
    try {
      // Primeiro buscar a tarefa
      const { data: taskData, error: taskError } = await supabase
        .from("calendario_tarefas")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();

      if (taskError) throw taskError;
      
      if (!taskData) {
        setSelectedTaskData(null);
        return;
      }

      // Se tiver contact_id, buscar dados do cliente separadamente
      let customerData = null;
      if (taskData.contact_id) {
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select(`
            id,
            nome,
            telefone,
            email,
            custom_fields,
            customer_empresas (
              id,
              empresa_id,
              cargo,
              is_primary,
              empresas (
                id,
                nome,
                nome_fantasia,
                cnpj,
                telefone,
                email
              )
            )
          `)
          .eq("id", taskData.contact_id)
          .maybeSingle();

        if (!customerError && customer) {
          customerData = customer;
        }
      }

      // Combinar os dados
      setSelectedTaskData({
        ...taskData,
        customers: customerData
      });
    } catch (error: any) {
      console.error("Erro ao carregar tarefa:", error);
    }
  };

  // Carregar dados do email selecionado e buscar contato/empresa
  const loadSelectedEmail = async (emailId: string, forceRefresh: boolean = false) => {
    try {
      console.log("[Atendimento] Buscando email com ID:", emailId, "forceRefresh:", forceRefresh);

      // Tentar reaproveitar o email já carregado na lista (caso venha de servidor externo)
      // Mas se forceRefresh for true, sempre buscar do banco para emails UUID
      let emailData: any =
        !forceRefresh && selectedEmailData && selectedEmailData.id === emailId ? selectedEmailData : null;

      // Alguns emails possuem ID UUID salvo na tabela, outros usam ID externo (IMAP)
      const isUuid =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          emailId,
        );

      // Só tenta buscar na tabela "emails" quando o ID é realmente um UUID
      if (!emailData && isUuid) {
        const { data, error } = await supabase
          .from("emails")
          .select("*")
          .eq("id", emailId)
          .single();

        if (error) throw error;
        emailData = data;
      }

      if (!emailData) {
        console.warn(
          "[Atendimento] Não foi possível carregar o registro do email (ID externo sem UUID).",
          emailId,
        );
        return;
      }

      console.log("[Atendimento] Email carregado:", {
        id: emailData.id,
        folder: emailData.folder,
        from_email: emailData.from_email,
        to_email: emailData.to_email,
      });

      // Definir o email de contato de acordo com a pasta
      // - Inbox (recebidos): usar sempre o remetente (cliente)
      // - Sent (enviados): usar sempre o destinatário (cliente)
      const contactEmail: string =
        emailData.folder === "sent"
          ? emailData.to_email || emailData.from_email || ""
          : emailData.from_email || emailData.to_email || "";

      console.log("[Atendimento] Email de contato detectado:", contactEmail);

      // Buscar contato pelo email (cliente vinculado)
      let customerData: any = null;
      if (contactEmail) {
        const { data } = await supabase
          .from("customers")
          .select(`
            *,
            customer_empresas!customer_empresas_customer_id_fkey (
              id,
              cargo,
              departamento,
              is_primary,
              empresas (
                id,
                nome,
                nome_fantasia,
                cnpj,
                telefone,
                email
              )
            )
          `)
          .ilike("email", contactEmail)
          .maybeSingle();

        customerData = data as any;
        console.log("[Atendimento] Customer encontrado para email:", contactEmail, customerData);
      }

      // Se não encontrou customer, buscar empresa diretamente pelo email ou emails_vinculados
      let empresaData: any = null;
      if (!customerData && contactEmail) {
        // Primeiro tenta pelo email principal
        const { data: empresa } = await supabase
          .from("empresas")
          .select(`
            id,
            nome,
            nome_fantasia,
            cnpj,
            telefone,
            email,
            emails_vinculados
          `)
          .ilike("email", contactEmail)
          .maybeSingle();

        if (empresa) {
          empresaData = empresa;
        } else {
          // Se não encontrou, buscar nas empresas que possuem esse email vinculado
          const { data: empresas } = await supabase
            .from("empresas")
            .select(`
              id,
              nome,
              nome_fantasia,
              cnpj,
              telefone,
              email,
              emails_vinculados
            `)
            .not("emails_vinculados", "is", null);

          // Filtrar empresas que contêm o email vinculado
          const emailLower = contactEmail.toLowerCase();
          const empresaEncontrada = empresas?.find((e: any) =>
            e.emails_vinculados?.some((emailVinc: string) =>
              emailVinc.toLowerCase() === emailLower
            )
          );

          empresaData = empresaEncontrada || null;
        }

        console.log("[Atendimento] Empresa encontrada para email:", contactEmail, empresaData);
      }

      setSelectedEmailData({
        ...emailData,
        customer: customerData || null,
        empresa: empresaData || null,
      });
    } catch (error: any) {
      console.error("Erro ao carregar email:", error);
    }
  };

  // UseEffects para carregar dados selecionados
  useEffect(() => {
    if (selectedTaskId) {
      loadSelectedTask(selectedTaskId);
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (selectedEmailId) {
      loadSelectedEmail(selectedEmailId);
    }
  }, [selectedEmailId]);

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

      const { data, error } = await query.order("updated_at", { ascending: false }).limit(200);

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
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          // Auto-translate all messages if real-time translation is active
          if (isRealTimeTranslationActive) {
            translateMessage(newMessage.id, newMessage.text);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Função para traduzir uma mensagem
  const translateMessage = async (messageId: string, text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('agent-assist-translate', {
        body: { text, targetLanguage: translationLanguage }
      });

      if (error) throw error;

      if (data?.translation) {
        setMessageTranslations(prev => ({
          ...prev,
          [messageId]: data.translation
        }));
      }
    } catch (error) {
      console.error('Erro ao traduzir mensagem:', error);
    }
  };

  // Traduzir mensagens existentes quando a tradução em tempo real é ativada
  useEffect(() => {
    if (isRealTimeTranslationActive && messages.length > 0) {
      messages
        .filter(msg => !messageTranslations[msg.id])
        .forEach(msg => {
          translateMessage(msg.id, msg.text);
        });
    }
  }, [isRealTimeTranslationActive, messages.length]);

  const handleToggleRealTimeTranslation = () => {
    setIsRealTimeTranslationActive(!isRealTimeTranslationActive);
    if (!isRealTimeTranslationActive) {
      toast.success("Tradução em tempo real ativada");
    } else {
      toast.success("Tradução em tempo real desativada");
      setMessageTranslations({}); // Limpar traduções ao desativar
    }
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
      
      // Traduzir a mensagem do agente se a tradução em tempo real estiver ativa
      if (isRealTimeTranslationActive) {
        translateMessage(newMessage.id, content);
      }

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

  // Deduplica conversas por cliente, mantendo apenas a mais recente (já ordenado por updated_at desc)
  const filteredConversations = useMemo(() => {
    const seenCustomers = new Set<string>();
    return conversations.filter((conv) => {
      if (!conv.customer?.nome.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Apply global filter
      if (globalFilter) {
        if (globalFilter.type === 'customer' && conv.customer_id !== globalFilter.id) {
          return false;
        }
        if (globalFilter.type === 'empresa') {
          // Check if conversation's customer is linked to the filtered empresa
          const hasEmpresa = conv.customerCompanies?.some(
            (ce: any) => ce.empresa_id === globalFilter.id || ce.empresas?.id === globalFilter.id
          );
          if (!hasEmpresa) return false;
        }
      }
      if (seenCustomers.has(conv.customer_id)) {
        return false;
      }
      seenCustomers.add(conv.customer_id);
      return true;
    });
  }, [conversations, searchTerm, globalFilter]);

  // Filtered tasks based on global filter and contact filters
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate delay days for each task based on data_original
    let tasks = todayTasks.map(task => {
      let diasAtraso = 0;
      if (task.data_original) {
        const dataOriginal = new Date(task.data_original);
        dataOriginal.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - dataOriginal.getTime();
        diasAtraso = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diasAtraso < 0) diasAtraso = 0;
      }
      return { ...task, diasAtraso };
    });
    
    // Apply global filter
    if (globalFilter) {
      tasks = tasks.filter((task) => {
        if (globalFilter.type === 'customer') {
          return task.contact_id === globalFilter.id;
        }
        // For empresa, we'd need to check if customer is linked to empresa
        // This would require additional data - for now, filter by contact_name matching
        return task.contact_name?.toLowerCase().includes(globalFilter.nome.toLowerCase());
      });
    }
    
    // Apply contact filters (OR logic - show tasks that match ANY active filter)
    const hasAnyContactFilter = agendaFilterPossuiTel || agendaFilterPossuiWhatsapp || agendaFilterPossuiEmail;
    
    if (hasAnyContactFilter) {
      tasks = tasks.filter((task) => {
        // If task has no linked customer, don't filter it out
        if (!task.customers) return true;
        
        const tel = task.customers?.tel;
        const telefone = task.customers?.telefone;
        const email = task.customers?.email;
        
        // Check each active filter (OR logic)
        if (agendaFilterPossuiTel && tel && tel.trim() !== '') return true;
        if (agendaFilterPossuiWhatsapp && telefone && telefone.trim() !== '') return true;
        if (agendaFilterPossuiEmail && email && email.trim() !== '') return true;
        
        return false;
      });
    }
    
    // Apply sorting based on taskSortOrder including dias_atraso
    tasks.sort((a, b) => {
      for (const criterion of taskSortOrder) {
        if (criterion.type === 'field') {
          if (criterion.field === 'dias_atraso') {
            const diff = (b.diasAtraso || 0) - (a.diasAtraso || 0); // Descending - more delayed first
            if (diff !== 0) return diff;
          } else if (criterion.field === 'time') {
            const timeA = a.time || '99:99';
            const timeB = b.time || '99:99';
            const diff = timeA.localeCompare(timeB);
            if (diff !== 0) return diff;
          } else if (criterion.field === 'created_at') {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            const diff = dateA - dateB;
            if (diff !== 0) return diff;
          }
        } else if (criterion.type === 'origem_filter') {
          const matchesA = a.origem === criterion.origem && (!criterion.subItem || a.origem_sub_item === criterion.subItem);
          const matchesB = b.origem === criterion.origem && (!criterion.subItem || b.origem_sub_item === criterion.subItem);
          if (matchesA && !matchesB) return -1;
          if (!matchesA && matchesB) return 1;
        }
      }
      return 0;
    });
    
    return tasks;
  }, [todayTasks, globalFilter, agendaFilterPossuiTel, agendaFilterPossuiWhatsapp, agendaFilterPossuiEmail, taskSortOrder]);

  // Filtered emails based on global filter and folder
  const filteredEmails = useMemo(() => {
    let emails = userEmails;
    
    // Filter by folder
    if (emailFolder === "inbox") {
      emails = emails.filter(e => e.folder === "inbox" || !e.folder);
    } else if (emailFolder === "sent") {
      emails = emails.filter(e => e.folder === "sent");
    } else if (emailFolder === "drafts") {
      emails = emails.filter(e => e.folder === "drafts");
    } else if (emailFolder === "archive") {
      emails = emails.filter(e => e.folder === "archive");
    } else if (emailFolder === "trash") {
      emails = emails.filter(e => e.folder === "trash");
    } else if (emailFolder === "starred") {
      emails = emails.filter(e => e.starred);
    }
    
    // Apply global filter
    if (!globalFilter) return emails;
    
    return emails.filter((email) => {
      // If filter has email, match by email address
      if (globalFilter.email) {
        const filterEmail = globalFilter.email.toLowerCase();
        return email.from_email?.toLowerCase().includes(filterEmail) ||
               email.to_email?.toLowerCase().includes(filterEmail);
      }
      // Fallback: filter by matching name
      return email.from_email?.toLowerCase().includes(globalFilter.nome.toLowerCase()) ||
             email.to_email?.toLowerCase().includes(globalFilter.nome.toLowerCase());
    });
  }, [userEmails, globalFilter, emailFolder]);

  // Filtered orcamentos based on global filter
  const filteredOrcamentos = useMemo(() => {
    if (!globalFilter) return orcamentos;
    
    return orcamentos.filter((orc) => {
      if (globalFilter.type === 'customer') {
        return orc.cliente_id === globalFilter.id;
      }
      if (globalFilter.type === 'empresa') {
        return orc.empresa_id === globalFilter.id;
      }
      return true;
    });
  }, [orcamentos, globalFilter]);

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  // Update counters based on filtered data
  useEffect(() => {
    const inQueueCount = filteredConversations.filter(c => c.chat_status === 'em_fila').length;
    setActiveConversationsCount(inQueueCount);
  }, [filteredConversations]);
  
  useEffect(() => {
    const unreadCount = filteredEmails.filter(e => !e.read).length;
    setUnreadEmailsCount(unreadCount);
  }, [filteredEmails]);
  
  useEffect(() => {
    const emAndamentoCount = filteredOrcamentos.filter(o => 
      o.status !== 'cancelado' && o.status !== 'ganho'
    ).length;
    setOrcamentosEmAndamentoCount(emAndamentoCount);
  }, [filteredOrcamentos]);

  useEffect(() => {
    setTodayTasksCount(filteredTasks.length);
  }, [filteredTasks]);

  // Count open budgets per customer and per empresa for agenda display
  const { orcamentosAbertosPerCustomer, orcamentosAbertosPerEmpresa } = useMemo(() => {
    const customerMap: Record<string, number> = {};
    const empresaMap: Record<string, number> = {};
    orcamentos
      .filter(o => o.status !== 'cancelado' && o.status !== 'ganho')
      .forEach(o => {
        if (o.cliente_id) {
          customerMap[o.cliente_id] = (customerMap[o.cliente_id] || 0) + 1;
        }
        if (o.empresa_id) {
          empresaMap[o.empresa_id] = (empresaMap[o.empresa_id] || 0) + 1;
        }
      });
    return { orcamentosAbertosPerCustomer: customerMap, orcamentosAbertosPerEmpresa: empresaMap };
  }, [orcamentos]);

  // Count unread emails per contact email
  const emailsNaoLidosPerEmail = useMemo(() => {
    const emailMap: Record<string, number> = {};
    userEmails
      .filter(e => !e.read && (e.folder === 'inbox' || !e.folder))
      .forEach(e => {
        const fromEmail = e.from_email?.toLowerCase();
        if (fromEmail) {
          emailMap[fromEmail] = (emailMap[fromEmail] || 0) + 1;
        }
      });
    return emailMap;
  }, [userEmails]);

  // Count unread chats per customer phone
  const chatsNaoLidosPerPhone = useMemo(() => {
    const phoneMap: Record<string, number> = {};
    conversations
      .filter(c => c.chat_status === 'em_fila' || c.chat_status === 'novo')
      .forEach(c => {
        const customerPhone = normalizePhone(c.customer?.telefone);
        if (customerPhone) {
          phoneMap[customerPhone] = (phoneMap[customerPhone] || 0) + 1;
        }
      });
    return phoneMap;
  }, [conversations]);

  // Ferramentas dinâmicas baseadas na aba ativa - MUST be before any conditional returns
  const currentTabType = activeTab as TabType;
  const dynamicRadialTools = useMemo(() => {
    const tools = getRadialMenuItems(currentTabType);
    return tools.length > 0 ? tools : [];
  }, [currentTabType, getRadialMenuItems]);

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

  const RADIAL_MENU_ITEMS: RadialMenuItem[] = [
    { id: "chat", icon: MessageSquare, label: "Conversas", badge: activeConversationsCount },
    { id: "agenda", icon: CalendarIcon, label: "Agenda", badge: todayTasksCount },
    { id: "email", icon: Mail, label: "E-mails", badge: unreadEmailsCount },
    { id: "orcamento", icon: Receipt, label: "Orçamentos", badge: orcamentosEmAndamentoCount },
    { id: "dialer", icon: PhoneCall, label: "Discador" },
    ...(dynamicRadialTools.length > 0 ? [{ 
      id: "tools", 
      icon: Plus, 
      label: "Ferramentas",
      subItems: dynamicRadialTools
    }] : []),
  ];

  const handleRadialMenuSelect = (item: RadialMenuItem) => {
    switch (item.id) {
      case "chat":
        setActiveTab("chat");
        setShowConversationsList(true);
        break;
      case "agenda":
        setActiveTab("agenda");
        setShowConversationsList(true);
        break;
      case "email":
        setActiveTab("email");
        setShowConversationsList(true);
        break;
      case "orcamento":
        setActiveTab("orcamento");
        setShowConversationsList(true);
        break;
      case "dialer":
        setShowPredictiveDialer(true);
        break;
      // Tools submenu items - ações diretas
      case "tool-image":
        setTriggerTool('image');
        break;
      case "tool-file":
        setTriggerTool('file');
        break;
      case "tool-variables":
        setTriggerTool('variables');
        break;
      case "tool-quick-replies":
        setTriggerTool('quick-replies');
        break;
      case "tool-attachments":
        setTriggerTool('quick-attachments');
        break;
      // Tools submenu items - dialogs próprios
      case "tool-translate":
        setShowRadialTranslateDialog(true);
        break;
      case "tool-reports":
        setShowRadialReportsDialog(true);
        break;
      case "tool-bot":
        setShowRadialBotDialog(true);
        break;
      case "tool-webhook":
        setShowRadialWebhookDialog(true);
        break;
      case "tool-transfer":
        setShowRadialTransferDialog(true);
        break;
      case "tool-catalog":
        setShowRadialCatalogDialog(true);
        loadRadialCatalogs();
        break;
      case "tool-agenda-email":
        setTriggerTool('agenda-tracking');
        break;
      // AI submenu items
      case "ai-chat":
        setShowAIChat(!showAIChat);
        break;
      case "ai-suggestion":
        setTriggerTool('context');
        break;
      case "ai-summary":
        setTriggerTool('summary');
        break;
      case "ai-kb":
        setTriggerTool('kb');
        break;
      case "ai-translate":
        setShowRadialRealTimeTranslateDialog(true);
        break;
    }
  };

  // Handler para seleção de ferramenta (usado pelo ToolsDropdown e RadialMenu)
  const handleToolSelect = (toolId: string) => {
    switch (toolId) {
      case "tool-image":
        setTriggerTool('image');
        break;
      case "tool-file":
        setTriggerTool('file');
        break;
      case "tool-variables":
        setTriggerTool('variables');
        break;
      case "tool-quick-replies":
        setTriggerTool('quick-replies');
        break;
      case "tool-attachments":
        setTriggerTool('quick-attachments');
        break;
      case "tool-translate":
        setShowRadialTranslateDialog(true);
        break;
      case "tool-reports":
        setShowRadialReportsDialog(true);
        break;
      case "tool-bot":
        setShowRadialBotDialog(true);
        break;
      case "tool-webhook":
        setShowRadialWebhookDialog(true);
        break;
      case "tool-transfer":
        setShowRadialTransferDialog(true);
        break;
      case "tool-catalog":
        setShowRadialCatalogDialog(true);
        loadRadialCatalogs();
        break;
      case "tool-agenda-email":
        setTriggerTool('agenda-tracking');
        break;
      case "ai-chat":
        setShowAIChat(!showAIChat);
        break;
      case "ai-suggestion":
        setTriggerTool('context');
        break;
      case "ai-summary":
        setTriggerTool('summary');
        break;
      case "ai-kb":
        setTriggerTool('kb');
        break;
      case "ai-translate":
        setShowRadialRealTimeTranslateDialog(true);
        break;
    }
  };

  // Handlers para os dialogs do RadialMenu
  const handleRadialTranslate = async () => {
    if (!radialTranslateText.trim()) {
      toast.error("Digite um texto para traduzir");
      return;
    }
    try {
      const response = await supabase.functions.invoke("agent-assist-translate", {
        body: { text: radialTranslateText, targetLanguage: radialTargetLanguage }
      });
      if (response.error) throw response.error;
      const translation = response.data?.translation;
      if (translation) {
        setRadialTranslateText(translation);
        toast.success("Traduzido!");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao traduzir");
    }
  };

  const handleRadialBotRedirect = () => {
    if (!selectedBotRedirect || !selectedConversation) {
      toast.error("Selecione um bot e uma conversa");
      return;
    }
    // Implementar lógica de redirecionamento para bot
    toast.success("Redirecionado para o bot!");
    setShowRadialBotDialog(false);
  };

  const handleRadialTransfer = () => {
    if (!selectedTransferUser || !selectedConversation) {
      toast.error("Selecione um usuário e uma conversa");
      return;
    }
    // Implementar lógica de transferência
    toast.success("Conversa transferida!");
    setShowRadialTransferDialog(false);
  };

  return (
    <>
    {/* Dialogs do RadialMenu */}
    <Dialog open={showRadialTranslateDialog} onOpenChange={setShowRadialTranslateDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Traduzir Texto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Texto</Label>
            <Textarea 
              value={radialTranslateText} 
              onChange={(e) => setRadialTranslateText(e.target.value)}
              placeholder="Digite o texto para traduzir..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Traduzir para</Label>
            <Select value={radialTargetLanguage} onValueChange={setRadialTargetLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">Inglês</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="fr">Francês</SelectItem>
                <SelectItem value="de">Alemão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleRadialTranslate} className="w-full">
            <Languages className="h-4 w-4 mr-2" /> Traduzir
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showRadialBotDialog} onOpenChange={setShowRadialBotDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Redirecionar para Bot
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecione um Bot</Label>
            <Select value={selectedBotRedirect || ""} onValueChange={setSelectedBotRedirect}>
              <SelectTrigger><SelectValue placeholder="Selecione um bot" /></SelectTrigger>
              <SelectContent>
                {availableBots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleRadialBotRedirect} disabled={!selectedBotRedirect} className="w-full">
            <Zap className="h-4 w-4 mr-2" /> Redirecionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showRadialWebhookDialog} onOpenChange={setShowRadialWebhookDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Resposta Automática
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar Resposta Automática</Label>
            <Switch 
              checked={webhookAutoResponseActive} 
              onCheckedChange={setWebhookAutoResponseActive} 
            />
          </div>
          <div className="space-y-2">
            <Label>Selecione um Webhook</Label>
            <Select value={selectedWebhookAutoResponse || ""} onValueChange={setSelectedWebhookAutoResponse}>
              <SelectTrigger><SelectValue placeholder="Selecione webhook" /></SelectTrigger>
              <SelectContent>
                {webhooksForAutoResponse.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showRadialTransferDialog} onOpenChange={setShowRadialTransferDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Transferir para Usuário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecione um Usuário</Label>
            <Select value={selectedTransferUser || ""} onValueChange={setSelectedTransferUser}>
              <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>{user.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleRadialTransfer} disabled={!selectedTransferUser} className="w-full">
            <UserPlus className="h-4 w-4 mr-2" /> Transferir
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showRadialReportsDialog} onOpenChange={setShowRadialReportsDialog} modal={false}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Relatórios Importados
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isRadialProcessingReport && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-200" 
                  style={{ width: `${radialReportProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Processando relatório... {radialReportProgress}%
              </p>
            </div>
          )}
          {radialImportReports.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selecione o relatório</Label>
                <Select 
                  value={selectedRadialReport || ""} 
                  onValueChange={(value) => {
                    console.log('Selected report:', value);
                    setSelectedRadialReport(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha um relatório..." />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                  >
                    {radialImportReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedRadialReport && (
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    variant="outline"
                    onClick={() => handleRadialReportSelect(selectedRadialReport, 'pdf')} 
                    disabled={isRadialProcessingReport}
                  >
                    <FileText className="h-4 w-4 mr-2 text-red-500" />
                    Gerar PDF
                  </Button>
                  <Button 
                    className="flex-1"
                    variant="outline"
                    onClick={() => handleRadialReportSelect(selectedRadialReport, 'excel')} 
                    disabled={isRadialProcessingReport}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Gerar Excel
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum relatório disponível no momento.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Catalog Dialog for Radial Menu */}
    <Dialog open={showRadialCatalogDialog} onOpenChange={setShowRadialCatalogDialog} modal={false}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Catálogos Disponíveis
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isRadialProcessingCatalog && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-200" 
                  style={{ width: `${radialCatalogProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Gerando catálogo PDF... {radialCatalogProgress}%
              </p>
            </div>
          )}
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar catálogo..."
              value={radialCatalogSearch}
              onChange={(e) => setRadialCatalogSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {radialCatalogs.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-2">
                {radialCatalogs
                  .filter(c => c.nome.toLowerCase().includes(radialCatalogSearch.toLowerCase()))
                  .map((catalog) => {
                    const productCount = catalog.products_page?.products?.length || 0;
                    return (
                      <div 
                        key={catalog.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedRadialCatalog === catalog.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedRadialCatalog(catalog.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            {catalog.thumbnail ? (
                              <img src={catalog.thumbnail} alt="" className="w-full h-full object-cover rounded" />
                            ) : (
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{catalog.nome}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {productCount} produtos
                              </span>
                              {!catalog.data_indeterminada && catalog.data_validade && (
                                <span className="text-amber-600">
                                  Até {new Date(catalog.data_validade).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum catálogo ativo disponível.
            </p>
          )}
          
          {selectedRadialCatalog && (
            <Button 
              className="w-full"
              onClick={() => handleRadialCatalogSelect(selectedRadialCatalog)} 
              disabled={isRadialProcessingCatalog}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Gerar e Anexar PDF
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showRadialRealTimeTranslateDialog} onOpenChange={setShowRadialRealTimeTranslateDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Tradução em Tempo Real
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar Tradução em Tempo Real</Label>
            <Switch 
              checked={isRealTimeTranslationActive} 
              onCheckedChange={setIsRealTimeTranslationActive} 
            />
          </div>
          <div className="space-y-2">
            <Label>Idioma de destino</Label>
            <Select value={translationLanguage} onValueChange={setTranslationLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">Inglês</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
                <SelectItem value="fr">Francês</SelectItem>
                <SelectItem value="de">Alemão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {isRealTimeTranslationActive 
              ? "As mensagens do cliente serão traduzidas automaticamente" 
              : "Ative para traduzir mensagens do cliente"}
          </p>
        </div>
      </DialogContent>
    </Dialog>

    <RadialMenu
      menuItems={RADIAL_MENU_ITEMS}
      onSelect={handleRadialMenuSelect}
      size={260}
      className="h-screen min-h-0"
    >
      {/* ========== MOBILE/TABLET LAYOUT ========== */}
      {(isMobile || isTablet) ? (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
          {/* Mobile Header - Mostra quando não está na lista e NÃO está no orçamento aberto */}
          {mobileView !== "list" && !(activeTab === "orcamento" && orcamentoSheetOpen) && (
            <div className="flex-shrink-0 px-3 py-2.5 bg-card border-b border-border/50 flex items-center justify-between safe-area-top">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (mobileView === "details") {
                      setMobileView("main");
                    } else {
                      setMobileView("list");
                      if (activeTab === "chat") setSelectedConversation(null);
                      if (activeTab === "agenda") { setSelectedTaskId(null); setSelectedTaskData(null); }
                      if (activeTab === "email") { setSelectedEmailId(null); setSelectedEmailData(null); }
                      if (activeTab === "orcamento") { setOrcamentoSheetOpen(false); setSelectedOrcamentoId(null); }
                    }
                  }}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                {activeTab === "chat" && selectedConv && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm truncate max-w-[150px]">
                      {selectedConv.customer?.nome || "Cliente"}
                    </span>
                  </div>
                )}
                {activeTab === "agenda" && selectedTaskData && (
                  <span className="font-medium text-sm truncate max-w-[180px]">
                    {selectedTaskData.contact_name}
                  </span>
                )}
                {activeTab === "email" && selectedEmailData && (
                  <span className="font-medium text-sm truncate max-w-[180px]">
                    {selectedEmailData.subject}
                  </span>
                )}
                {activeTab === "orcamento" && selectedOrcamentoData && (
                  <span className="font-medium text-sm truncate max-w-[180px]">
                    {selectedOrcamentoData.customers?.nome || "Orçamento"}
                  </span>
                )}
              </div>
              {mobileView === "main" && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setMobileView("details")}
                  className="h-8 w-8 rounded-full"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {/* Mobile Content Area */}
          <div className="flex-1 overflow-hidden relative">
            {/* Fluxo de Atendimento Panel - Mobile Fullscreen */}
            {activeTab === "agenda" && agendaViewMode === 'fluxo' && (
              <div className="absolute inset-0 z-20 bg-background overflow-hidden">
                {/* Fluxo Panel */}
                <div 
                  className={`absolute inset-0 transition-transform duration-300 ease-out ${
                    showClientDetailsFluxo ? '-translate-x-full' : 'translate-x-0'
                  }`}
                >
                  <FluxoAtendimentoPanel
                    tasks={filteredTasks}
                    estabelecimentoId={estabelecimentoId}
                    usuarioId={usuarioId}
                    onTaskCompleted={loadTodayTasks}
                    onClose={() => {
                      setAgendaViewMode('default');
                      setFluxoCurrentTask(null);
                      setFluxoInitialIndex(0);
                    }}
                    onCurrentTaskChange={setFluxoCurrentTask}
                    showDetails={showClientDetailsFluxo}
                    onToggleDetails={() => setShowClientDetailsFluxo(!showClientDetailsFluxo)}
                    initialTaskIndex={fluxoInitialIndex}
                    onNavigateToItem={(type, id) => {
                      setAgendaViewMode('default');
                      if (type === 'chat') {
                        setActiveTab('chat');
                        setSelectedConversation(id);
                        setMobileView('main');
                      } else if (type === 'orcamento') {
                        setActiveTab('orcamento');
                        setSelectedOrcamentoId(id);
                        const orc = orcamentos.find(o => o.id === id);
                        if (orc) setSelectedOrcamentoData(orc);
                        setOrcamentoSheetOpen(true);
                        setMobileView('main');
                      } else if (type === 'email') {
                        setActiveTab('email');
                        setSelectedEmailId(id);
                        setMobileView('main');
                      }
                    }}
                  />
                </div>
                
                {/* Details Panel - Mobile Fluxo */}
                <div 
                  className={`absolute inset-0 transition-transform duration-300 ease-out bg-card flex flex-col ${
                    showClientDetailsFluxo ? 'translate-x-0' : 'translate-x-full'
                  }`}
                >
                  <div className="flex-shrink-0 px-3 py-2.5 border-b border-border/50 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowClientDetailsFluxo(false)}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-medium text-sm">Detalhes do Cliente</span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {fluxoCurrentTask && (
                      <UnifiedDetailsPanel
                        type="agenda"
                        nome={fluxoCurrentTask.contact_name}
                        telefone={fluxoCurrentTask.customers?.tel}
                        whatsapp={fluxoCurrentTask.customers?.telefone}
                        email={fluxoCurrentTask.customers?.email}
                        customerId={fluxoCurrentTask.customers?.id}
                        protocolo={fluxoCurrentTask.id?.slice(0, 8).toUpperCase()}
                        status={fluxoCurrentTask.status === "concluido" ? "Concluído" : "Pendente"}
                        titulo={fluxoCurrentTask.title}
                        dataHora={format(new Date(fluxoCurrentTask.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) + (fluxoCurrentTask.time ? ` às ${fluxoCurrentTask.time}` : "")}
                        companies={fluxoCurrentTask.customers?.customer_empresas || []}
                        onSetGlobalFilter={setGlobalFilter}
                        onEditContato={(id) => setEditingContatoId(id)}
                        onEditEmpresa={(empresaId, customerEmpresaId) => {
                          setEditingEmpresaId(empresaId);
                          setEditingCustomerEmpresaId(customerEmpresaId || null);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Envio em Massa Panel - Mobile Fullscreen */}
            {activeTab === "agenda" && agendaViewMode === 'massa' && (
              <div className="absolute inset-0 z-20 bg-background">
                <EnvioMassaPanel
                  tasks={filteredTasks}
                  estabelecimentoId={estabelecimentoId}
                  usuarioId={usuarioId}
                  onComplete={loadTodayTasks}
                  onClose={() => setAgendaViewMode('default')}
                />
              </div>
            )}
            
            {/* Listas Panel - Mobile Fullscreen - Puxar ou criar cadastro */}
            {(showCustomerSearchForTask || showCustomerSearchForChat || showCustomerSearchForEmail || showCustomerSearchForOrcamento) && (
              <div className="absolute inset-0 z-30 bg-background">
                <ListasPanel
                  onClose={() => {
                    setShowCustomerSearchForTask(false);
                    setShowCustomerSearchForChat(false);
                    setShowCustomerSearchForEmail(false);
                    setShowCustomerSearchForOrcamento(false);
                  }}
                  title="Puxar ou criar cadastro"
                  description={
                    showCustomerSearchForTask ? "Selecione ou crie um contato para a nova tarefa" :
                    showCustomerSearchForChat ? "Selecione ou crie um contato para iniciar a conversa" :
                    showCustomerSearchForEmail ? "Selecione ou crie um contato para enviar o e-mail" :
                    "Selecione ou crie um contato para o orçamento"
                  }
                  defaultTab="contatos"
                />
              </div>
            )}
            
            {/* Lista */}
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-out ${
                mobileView === "list" ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <MobileListContent
                activeTab={activeTab}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                filteredConversations={filteredConversations}
                selectedConversation={selectedConversation}
                setSelectedConversation={(id) => {
                  setSelectedConversation(id);
                  if (id) setMobileView("main");
                }}
                filteredTasks={filteredTasks}
                selectedTaskId={selectedTaskId}
                setSelectedTaskId={(id) => {
                  setSelectedTaskId(id);
                  if (id) {
                    const task = todayTasks.find(t => t.id === id);
                    setSelectedTaskData(task);
                    setMobileView("main");
                  }
                }}
                agendaDate={agendaDate}
                handlePreviousDay={handlePreviousDay}
                handleNextDay={handleNextDay}
                handleToday={handleToday}
                filteredEmails={filteredEmails}
                selectedEmailId={selectedEmailId}
                setSelectedEmailId={(id) => {
                  setSelectedEmailId(id);
                  if (id) {
                    const email = userEmails.find(e => e.id === id);
                    setSelectedEmailData(email);
                    setMobileView("main");
                  }
                }}
                filteredOrcamentos={filteredOrcamentos}
                orcamentosStatusFilter={orcamentosStatusFilter}
                setOrcamentosStatusFilter={setOrcamentosStatusFilter}
                selectedOrcamentoId={selectedOrcamentoId}
                setSelectedOrcamentoId={(id) => {
                  setSelectedOrcamentoId(id);
                  if (id) {
                    const orc = orcamentos.find(o => o.id === id);
                    setSelectedOrcamentoData(orc);
                    setOrcamentoSheetOpen(true);
                    setMobileView("main");
                  }
                }}
                setOrcamentoSheetOpen={(open) => {
                  setOrcamentoSheetOpen(open);
                  if (open) setMobileView("main");
                }}
                onNovoOrcamentoClick={() => {
                  if (orcamentoSheetOpen) {
                    setShowNovoOrcamentoConfirm(true);
                  } else {
                    setSelectedOrcamentoId(null);
                    setInitialEmpresaForOrcamento(globalFilter?.type === 'empresa' ? globalFilter.id : null);
                    setOrcamentoSheetOpen(true);
                    setMobileView("main");
                  }
                }}
                showPredictiveDialer={() => setShowPredictiveDialer(true)}
                atendente={atendente}
                usuarioId={usuarioId}
                loadAtendente={loadAtendente}
                getTimeAgo={getTimeAgo}
                emailFolder={emailFolder}
                setEmailFolder={setEmailFolder}
                setShowComposeEmail={setShowComposeEmail}
                customerVinculos={customerVinculos}
                orcamentosAbertosPerCustomer={orcamentosAbertosPerCustomer}
                orcamentosAbertosPerEmpresa={orcamentosAbertosPerEmpresa}
                orcamentos={orcamentos}
                setActiveTab={setActiveTab}
                emailsNaoLidosPerEmail={emailsNaoLidosPerEmail}
                chatsNaoLidosPerPhone={chatsNaoLidosPerPhone}
                agendaViewMode={agendaViewMode}
                setAgendaViewMode={setAgendaViewMode}
                setFluxoInitialIndex={setFluxoInitialIndex}
                setShowConfigDatas={setShowConfigDatas}
                setShowEnvioMassaWizard={setShowEnvioMassaWizard}
                onRefreshEmails={() => loadUserEmails()}
                onShowCustomerSearch={() => {
                  if (activeTab === "agenda") setShowCustomerSearchForTask(true);
                  else if (activeTab === "chat") setShowCustomerSearchForChat(true);
                  else if (activeTab === "email") setShowCustomerSearchForEmail(true);
                  else if (activeTab === "orcamento") setShowCustomerSearchForOrcamento(true);
                }}
              />
            </div>

            {/* Conteúdo Principal */}
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-out ${
                mobileView === "main" ? "translate-x-0" : mobileView === "list" ? "translate-x-full" : "-translate-x-full"
              }`}
            >
              <MobileMainContent
                activeTab={activeTab}
                selectedConversation={selectedConversation}
                selectedConv={selectedConv}
                messages={messages}
                isRealTimeTranslationActive={isRealTimeTranslationActive}
                messageTranslations={messageTranslations}
                handleSendMessage={handleSendMessage}
                lastUserMessage={lastUserMessage}
                availableBots={availableBots}
                selectedBotRedirect={selectedBotRedirect}
                setSelectedBotRedirect={setSelectedBotRedirect}
                handleRedirectToBot={handleRedirectToBot}
                webhooksForAutoResponse={webhooksForAutoResponse}
                selectedWebhookAutoResponse={selectedWebhookAutoResponse}
                setSelectedWebhookAutoResponse={setSelectedWebhookAutoResponse}
                webhookAutoResponseActive={webhookAutoResponseActive}
                handleToggleWebhookAutoResponse={handleToggleWebhookAutoResponse}
                conversations={conversations}
                availableUsers={availableUsers}
                selectedTransferUser={selectedTransferUser}
                setSelectedTransferUser={setSelectedTransferUser}
                handleTransferToUser={handleTransferToUser}
                showAIChat={showAIChat}
                setShowAIChat={setShowAIChat}
                aiWebhooks={aiWebhooks}
                handleToggleRealTimeTranslation={handleToggleRealTimeTranslation}
                translationLanguage={translationLanguage}
                setTranslationLanguage={setTranslationLanguage}
                triggerTool={triggerTool}
                setTriggerTool={setTriggerTool}
                showSummaryPanel={showSummaryPanel}
                conversationSummary={conversationSummary}
                isSummaryLoading={isSummaryLoading}
                setShowSummaryPanel={setShowSummaryPanel}
                setConversationSummary={setConversationSummary}
                setSummaryGeneratedAt={setSummaryGeneratedAt}
                summaryGeneratedAt={summaryGeneratedAt}
                setIsSummaryLoading={setIsSummaryLoading}
                copyMessageToAI={copyMessageToAI}
                handleReactivateBot={handleReactivateBot}
                messagesEndRef={messagesEndRef}
                selectedTaskData={selectedTaskData}
                selectedEmailData={selectedEmailData}
                orcamentoSheetOpen={orcamentoSheetOpen}
                selectedOrcamentoId={selectedOrcamentoId}
                estabelecimentoId={estabelecimentoId}
                setOrcamentoSheetOpen={setOrcamentoSheetOpen}
                initialEmpresaForOrcamento={initialEmpresaForOrcamento}
                onOrcamentoClose={() => {
                  setOrcamentoSheetOpen(false);
                  setSelectedOrcamentoId(null);
                  setMobileView("list");
                }}
                onReply={(email) => {
                  const replySubject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`;
                  const replyBody = `\n\n---\nEm ${format(new Date(email.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}, ${email.from_email} escreveu:\n${email.body || ''}`;
                  setComposeEmailMode('reply');
                  setComposeEmailDefaults({ to: email.from_email, subject: replySubject, body: replyBody });
                  setShowComposeEmail(true);
                }}
                onForward={(email) => {
                  const fwdSubject = email.subject?.startsWith('Fwd:') || email.subject?.startsWith('Enc:') ? email.subject : `Enc: ${email.subject || ''}`;
                  const fwdBody = `\n\n---\nMensagem encaminhada:\nDe: ${email.from_email}\nData: ${format(new Date(email.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}\nAssunto: ${email.subject || ''}\n\n${email.body || ''}`;
                  setComposeEmailMode('forward');
                  setComposeEmailDefaults({ to: '', subject: fwdSubject, body: fwdBody });
                  setShowComposeEmail(true);
                }}
              />
            </div>

            {/* Detalhes */}
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-out bg-card overflow-y-auto ${
                mobileView === "details" ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {activeTab === "chat" && selectedConv && (
                <UnifiedDetailsPanel
                  type="chat"
                  nome={selectedConv.customer?.nome || "Cliente"}
                  telefone={selectedConv.customer?.tel}
                  whatsapp={selectedConv.customer?.telefone}
                  email={selectedConv.customer?.email}
                  customerId={selectedConv.customer?.id}
                  protocolo={selectedConv.id.slice(0, 8).toUpperCase()}
                  status={selectedConv.chat_status || selectedConv.status}
                  canal={selectedConv.canal}
                  dataHora={format(new Date(selectedConv.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  companies={customerCompanies}
                  onCompaniesUpdated={() => loadCustomerCompanies(selectedConversation || '')}
                  onSetGlobalFilter={setGlobalFilter}
                  onEditContato={(id) => setEditingContatoId(id)}
                  onEditEmpresa={(empresaId, customerEmpresaId) => {
                    setEditingEmpresaId(empresaId);
                    setEditingCustomerEmpresaId(customerEmpresaId || null);
                  }}
                  onCreateContato={() => setCreatingContato(true)}
                  onCreateEmpresa={(customerId) => {
                    setCreatingEmpresa(true);
                    setCreatingEmpresaForCustomerId(customerId || null);
                  }}
                />
              )}
              {activeTab === "agenda" && selectedTaskData && (
                <UnifiedDetailsPanel
                  type="agenda"
                  nome={selectedTaskData.customers?.nome || selectedTaskData.contact_name}
                  telefone={selectedTaskData.customers?.tel}
                  whatsapp={selectedTaskData.customers?.telefone}
                  email={selectedTaskData.customers?.email}
                  customerId={selectedTaskData.customers?.id}
                  protocolo={selectedTaskData.id?.slice(0, 8).toUpperCase()}
                  status={selectedTaskData.status}
                  titulo={selectedTaskData.title}
                  dataHora={`${format(new Date(selectedTaskData.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}${selectedTaskData.time ? ` às ${selectedTaskData.time}` : ""}`}
                  companies={selectedTaskData.customers?.customer_empresas || []}
                  onCompaniesUpdated={() => loadSelectedTask(selectedTaskId || '')}
                  onSetGlobalFilter={setGlobalFilter}
                  onEditContato={(id) => setEditingContatoId(id)}
                  onEditEmpresa={(empresaId, customerEmpresaId) => {
                    setEditingEmpresaId(empresaId);
                    setEditingCustomerEmpresaId(customerEmpresaId || null);
                  }}
                  onCreateContato={() => setCreatingContato(true)}
                  onCreateEmpresa={(customerId) => {
                    setCreatingEmpresa(true);
                    setCreatingEmpresaForCustomerId(customerId || null);
                  }}
                />
              )}
              {activeTab === "email" && selectedEmailData && (
                <UnifiedDetailsPanel
                  type="email"
                  nome={selectedEmailData.customer?.nome || selectedEmailData.empresa?.nome_fantasia || selectedEmailData.empresa?.nome || "Contato Desconhecido"}
                  telefone={selectedEmailData.customer?.tel || selectedEmailData.empresa?.telefone}
                  whatsapp={selectedEmailData.customer?.telefone || selectedEmailData.empresa?.telefone}
                  email={selectedEmailData.from_email}
                  customerId={selectedEmailData.customer?.id}
                  protocolo={selectedEmailData.id?.slice(0, 8).toUpperCase()}
                  status={selectedEmailData.read ? "Lido" : "Não lido"}
                  titulo={selectedEmailData.subject}
                  dataHora={format(new Date(selectedEmailData.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  companies={[
                    ...(selectedEmailData.customer?.customer_empresas?.map((ce: any) => ({
                      ...ce,
                      empresas: ce.empresas
                    })) || []),
                    ...(selectedEmailData.empresa ? [{ empresas: selectedEmailData.empresa }] : [])
                  ]}
                  onCompaniesUpdated={() => loadSelectedEmail(selectedEmailId || '')}
                  onSetGlobalFilter={setGlobalFilter}
                  onEditContato={(id) => setEditingContatoId(id)}
                  onEditEmpresa={(empresaId, customerEmpresaId) => {
                    setEditingEmpresaId(empresaId);
                    setEditingCustomerEmpresaId(customerEmpresaId || null);
                  }}
                  onCreateContato={() => {
                    setCreatingContatoInitialData({ email: selectedEmailData.from_email });
                    setCreatingContato(true);
                  }}
                  onCreateEmpresa={(customerId) => {
                    setCreatingEmpresa(true);
                    setCreatingEmpresaForCustomerId(customerId || null);
                  }}
                />
              )}
              {activeTab === "orcamento" && selectedOrcamentoData && (
                <UnifiedDetailsPanel
                  type="orcamento"
                  nome={selectedOrcamentoData.customers?.nome || selectedOrcamentoData.empresas?.nome_fantasia || "Cliente"}
                  telefone={selectedOrcamentoData.customers?.tel || selectedOrcamentoData.empresas?.telefone}
                  whatsapp={selectedOrcamentoData.customers?.telefone || selectedOrcamentoData.empresas?.telefone}
                  email={selectedOrcamentoData.customers?.email || selectedOrcamentoData.empresas?.email}
                  customerId={selectedOrcamentoData.customers?.id}
                  protocolo={selectedOrcamentoData.id?.slice(0, 8).toUpperCase()}
                  status={selectedOrcamentoData.etapa || selectedOrcamentoData.status}
                  valorTotal={selectedOrcamentoData.valor_total || 0}
                  companies={
                    selectedOrcamentoData.empresas 
                      ? [{ empresas: selectedOrcamentoData.empresas, is_primary: true }]
                      : []
                  }
                  onSetGlobalFilter={setGlobalFilter}
                  onEditContato={(id) => setEditingContatoId(id)}
                  onEditEmpresa={(empresaId, customerEmpresaId) => {
                    setEditingEmpresaId(empresaId);
                    setEditingCustomerEmpresaId(customerEmpresaId || null);
                  }}
                  onCreateContato={() => setCreatingContato(true)}
                  onCreateEmpresa={(customerId) => {
                    setCreatingEmpresa(true);
                    setCreatingEmpresaForCustomerId(customerId || null);
                  }}
                />
              )}
            </div>
          </div>

          {/* Bottom Navigation - Apenas na lista e não em modos especiais da agenda */}
          {mobileView === "list" && !(activeTab === "agenda" && (agendaViewMode === 'fluxo' || agendaViewMode === 'massa' || selectedTaskId)) && (
            <div className="flex-shrink-0 bg-card/95 backdrop-blur-sm border-t border-border/50 px-1 py-1 pb-safe">
              <div className="flex justify-around">
                {[
                  { id: "agenda", label: "Agenda", icon: CalendarIcon, badge: todayTasksCount },
                  { id: "chat", label: "Chats", icon: MessageSquare, badge: activeConversationsCount },
                  { id: "email", label: "E-mails", icon: Mail, badge: unreadEmailsCount },
                  { id: "orcamento", label: "Orçamentos", icon: FileText, badge: orcamentosEmAndamentoCount },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center justify-center py-1.5 px-4 transition-all relative ${
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                        )}
                        <div className={`relative p-2 rounded-xl transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                          <Icon className="h-5 w-5" />
                          {tab.badge > 0 && (
                            <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-bold px-1 rounded-full ${
                              isActive 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-destructive text-destructive-foreground"
                            }`}>
                              {tab.badge > 99 ? "99+" : tab.badge}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium mt-0.5 ${isActive ? "text-primary" : ""}`}>
                          {tab.label}
                        </span>
                      </button>
                    );
                })}
              </div>
            </div>
          )}

          {/* Dialogs */}
          <SoftphoneDialog 
            open={showSoftphone}
            onOpenChange={setShowSoftphone}
            initialNumber={softphoneNumber}
          />
          <PredictiveDialerDialog 
            open={showPredictiveDialer}
            onOpenChange={setShowPredictiveDialer}
          />
          <FluxoAtendimentoDialog
            open={showFluxoAtendimento}
            onOpenChange={setShowFluxoAtendimento}
            tasks={filteredTasks}
            estabelecimentoId={estabelecimentoId}
            usuarioId={usuarioId}
            onTaskCompleted={loadTodayTasks}
          />
          <ConfigDatasProximoContatoDialog
            open={showConfigDatas}
            onOpenChange={setShowConfigDatas}
            estabelecimentoId={estabelecimentoId}
          />
          <EnvioMassaDialog
            open={showEnvioMassa}
            onOpenChange={setShowEnvioMassa}
            tasks={filteredTasks}
            estabelecimentoId={estabelecimentoId}
            usuarioId={usuarioId}
            onComplete={loadTodayTasks}
          />
          <NovoContatoDialog 
            open={showNovoContatoDialog}
            onOpenChange={setShowNovoContatoDialog}
          />
          <ComposeEmailDialog
            open={showComposeEmail}
            onOpenChange={setShowComposeEmail}
            onSend={handleSendEmail}
            mode={composeEmailMode}
            defaultTo={composeEmailDefaults.to}
            defaultSubject={composeEmailDefaults.subject}
            defaultBody={composeEmailDefaults.body}
            estabelecimentoId={estabelecimentoId}
          />
        </div>
      ) : (
        /* ========== DESKTOP/TABLET LAYOUT ========== */
        <div className="h-full flex bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden relative">
        {/* Botão para reabrir painel quando colapsado - não mostra quando orçamento está aberto (botão fica no POSView) */}
        {!showConversationsList && !orcamentoSheetOpen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowConversationsList(true)}
            className="absolute top-3 left-3 z-20 h-9 w-9 p-0 rounded-full bg-white/90 shadow-md hover:bg-white border border-border/50"
            title="Abrir painel"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
        {/* Conversation List */}
      <div className={`border-r border-border/50 flex flex-col h-full min-h-0 transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-lg ${
        isMobile 
          ? 'hidden' 
          : showConversationsList 
            ? isSmallTablet 
              ? 'w-40' 
              : isTablet 
                ? 'w-48'
                : 'w-72 lg:w-80' 
            : 'w-0 border-r-0'
      }`}>
        {showConversationsList && (
          <>
            {/* Modern Header with Gradient */}
            <div className="flex-shrink-0">
              {/* Header Title Section */}
              <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground">Atendimento</h2>
                      <p className="text-[10px] text-muted-foreground">Gerencie suas conversas</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowConversationsList(false)}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10"
                    title="Ocultar painel"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Search Input + Global Filter + New Button */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={
                        activeTab === "agenda" ? "Buscar tarefas..." :
                        activeTab === "chat" ? "Buscar conversas..." :
                        activeTab === "email" ? "Buscar e-mails..." :
                        "Buscar orçamentos..."
                      }
                      className="pl-10 h-10 rounded-xl text-sm bg-white/80 border-border/40 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (activeTab === "agenda") setShowCustomerSearchForTask(true);
                          else if (activeTab === "chat") setShowCustomerSearchForChat(true);
                          else if (activeTab === "email") setShowCustomerSearchForEmail(true);
                          else if (activeTab === "orcamento") setShowCustomerSearchForOrcamento(true);
                        }}
                        className="h-10 w-10 rounded-xl border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Puxar ou criar cadastro</TooltipContent>
                  </Tooltip>
                  <GlobalClientFilter 
                    activeFilter={globalFilter} 
                    onFilterChange={setGlobalFilter}
                    compact
                  />
                </div>
              </div>
            </div>

        {/* Tabs - Modern Design with ExpandableTabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Tab Navigation - Expandable Icons */}
          <div className="px-3 py-2.5 bg-gradient-to-b from-slate-50/80 to-white border-b border-border/20">
            <ExpandableTabs
              tabs={[
                { title: "Agenda", icon: CalendarDays, badge: todayTasksCount },
                { 
                  title: "Chats", 
                  icon: MessageSquare, 
                  badge: activeConversationsCount
                },
                { title: "E-mails", icon: Inbox, badge: unreadEmailsCount },
                { title: "Orçamentos", icon: FileText, badge: orcamentosEmAndamentoCount },
              ]}
              activeIndex={activeTab === "agenda" ? 0 : activeTab === "chat" ? 1 : activeTab === "email" ? 2 : activeTab === "orcamento" ? 3 : null}
              onChange={(index) => {
                if (index === 0) setActiveTab("agenda");
                else if (index === 1) setActiveTab("chat");
                else if (index === 2) setActiveTab("email");
                else if (index === 3) setActiveTab("orcamento");
              }}
              activeColor="text-primary"
              className="w-full justify-center"
            />
          </div>
          
          {/* Email Folders - Vertical list below tabs when email is active */}
          {activeTab === "email" && (
            <div className="flex-1 overflow-hidden">
              <EmailFolderSidebar
                emails={userEmails}
                activeFolder={emailFolder}
                onFolderChange={(folder) => {
                  setEmailFolder(folder);
                  setSelectedEmailId(null);
                  setSelectedEmailData(null);
                }}
                onComposeClick={() => setShowComposeEmail(true)}
                onRefresh={() => loadUserEmails()}
              />
            </div>
          )}

            {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 overflow-y-auto min-h-0 overscroll-contain m-0 px-2 py-2 bg-gradient-to-b from-slate-50/30 to-white">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary/40" />
                </div>
                <p className="text-sm font-medium">Nenhuma conversa</p>
                <p className="text-xs text-muted-foreground mt-1">Use o botão + para iniciar</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedConversation === conv.id 
                        ? "bg-primary/10 border border-primary/30 shadow-sm" 
                        : "bg-white/60 hover:bg-white hover:shadow-sm border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedConversation === conv.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-gradient-to-br from-slate-100 to-slate-200"
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-sm truncate">
                            {conv.customer?.nome || "Cliente"}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-2 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            {conv.lastMessage?.created_at
                              ? getTimeAgo(conv.lastMessage.created_at)
                              : getTimeAgo(conv.updated_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1.5">
                          {conv.lastMessage?.text || "Sem mensagens"}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {conv.bot_active !== false && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                              <Bot className="w-2.5 h-2.5 mr-0.5" />
                              BOT
                            </Badge>
                          )}
                          {conv.customerCompanies && conv.customerCompanies.length > 0 && (
                            <>
                              {conv.customerCompanies.slice(0, 1).map((rel: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1 bg-white/50">
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
                ))}
              </div>
            )}
          </TabsContent>

          {/* Agenda Tab */}
          <TabsContent value="agenda" className="flex-1 flex flex-col min-h-0 m-0">
            {/* Main Content */}
            <div className="flex flex-col flex-1 overflow-hidden">
            {/* Agenda Controls - Modern Card Design */}
            <div className="flex-shrink-0 p-4 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent border-b border-orange-100/50 dark:border-orange-900/30">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Navigation Card */}
                <div className="flex items-center gap-1 bg-white dark:bg-card rounded-xl shadow-sm border border-orange-100 dark:border-orange-900/30 px-1.5 py-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handlePreviousDay}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  >
                    <ChevronLeft className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </Button>
                  
                  <div className="flex flex-col items-center min-w-[120px] py-0.5">
                    <p className="text-xs font-bold text-foreground">
                      {format(agendaDate, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-[9px] text-muted-foreground capitalize">
                      {format(agendaDate, "EEEE, yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleNextDay}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  >
                    <ChevronRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </Button>

                  <div className="w-px h-6 bg-orange-200 dark:bg-orange-800 mx-1" />

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleToday}
                    className="h-7 px-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-xs font-medium"
                  >
                    <CalendarDays className="w-3.5 h-3.5 mr-1" />
                    Hoje
                  </Button>
                </div>

                {/* Action Buttons Group - Fluxo/Massa */}
                <div className="flex items-center gap-0.5 bg-white dark:bg-card rounded-lg border border-orange-100 dark:border-orange-900/30 p-0.5">
                  <Button 
                    variant={agendaViewMode === 'fluxo' ? "default" : "ghost"}
                    size="sm" 
                    onClick={() => setAgendaViewMode('fluxo')}
                    disabled={filteredTasks.length === 0}
                    className={cn(
                      "h-7 px-2 rounded text-xs font-medium transition-all",
                      agendaViewMode === 'fluxo'
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                        : "hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    )}
                  >
                    <Play className="w-3 h-3 mr-1" fill={agendaViewMode === 'fluxo' ? 'currentColor' : 'none'} />
                    Fluxo
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm" 
                    onClick={() => {
                      setAgendaViewMode('default');
                      setShowEnvioMassaWizard(true);
                    }}
                    className={cn(
                      "h-7 px-2 rounded text-xs font-medium transition-all",
                      "hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    )}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Massa
                  </Button>
                </div>

                {/* Contact Type Filters */}
                <div className="flex items-center gap-0.5 bg-white dark:bg-card rounded-lg border border-orange-100 dark:border-orange-900/30 p-0.5">
                  <Button
                    variant={agendaFilterPossuiTel ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setAgendaFilterPossuiTel(!agendaFilterPossuiTel)}
                    className={cn(
                      "h-7 px-2 rounded text-xs font-medium transition-all",
                      agendaFilterPossuiTel 
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm" 
                        : "hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    )}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Tel
                  </Button>
                  <Button
                    variant={agendaFilterPossuiWhatsapp ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setAgendaFilterPossuiWhatsapp(!agendaFilterPossuiWhatsapp)}
                    className={cn(
                      "h-7 px-2 rounded text-xs font-medium transition-all",
                      agendaFilterPossuiWhatsapp 
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm" 
                        : "hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    )}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Whats
                  </Button>
                  <Button
                    variant={agendaFilterPossuiEmail ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setAgendaFilterPossuiEmail(!agendaFilterPossuiEmail)}
                    className={cn(
                      "h-7 px-2 rounded text-xs font-medium transition-all",
                      agendaFilterPossuiEmail 
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm" 
                        : "hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    )}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Email
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowPredictiveDialer(true)}
                    className="h-7 px-2 rounded-lg border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-xs"
                  >
                    <PhoneCall className="w-3 h-3 mr-1" />
                    Discador
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowConfigDatas(true)}
                    className="h-7 w-7 p-0 rounded-lg border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                    title="Configurar Datas Padrão"
                  >
                    <Settings2 className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                  </Button>
                </div>
                {/* Sort Button */}
                <Dialog open={showSortDialog} onOpenChange={setShowSortDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 w-7 p-0 rounded-lg border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30" 
                      title="Ordenação"
                    >
                      <ArrowUpDown className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Configurar Ordenação</DialogTitle>
                      <DialogDescription>
                        Defina a ordem de prioridade dos critérios de ordenação
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {taskSortOrder.map((criterion, index) => (
                        <Card key={index} className="p-3">
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSortCriterion(index)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <span className="text-lg">×</span>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {/* Add new field section */}
                      <div className="border-t pt-4 mt-4 space-y-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Adicionar Campo Simples
                          </Label>
                          <div className="flex gap-2">
                            <Select value={newSortField} onValueChange={(value: any) => setNewSortField(value)}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Selecione um campo" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableSortFields().map((field) => (
                                  <SelectItem key={field} value={field}>
                                    {getSortLabel({ type: 'field', field })}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={addSortField}
                              disabled={!newSortField}
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar
                            </Button>
                          </div>
                        </div>

                        {/* Add origem filter section */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Adicionar Filtro por Origem
                          </Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Prioriza tarefas da origem selecionada. Você pode adicionar a mesma origem várias vezes com sub-itens diferentes.
                          </p>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs mb-1 block">Origem</Label>
                              <Select 
                                value={newOrigemFilter.origem} 
                                onValueChange={handleOrigemChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a Origem" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableOrigens.map((origem) => (
                                    <SelectItem key={origem} value={origem}>
                                      {origem}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {newOrigemFilter.origem && availableSubItems.length > 0 && (
                              <div>
                                <Label className="text-xs mb-1 block">Sub-item (opcional)</Label>
                                <Select
                                  value={newOrigemFilter.subItem}
                                  onValueChange={(value) => setNewOrigemFilter({ ...newOrigemFilter, subItem: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Todos os sub-itens" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Todos os sub-itens</SelectItem>
                                    {availableSubItems.map((subItem) => (
                                      <SelectItem key={subItem} value={subItem}>
                                        {subItem}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            <Button
                              onClick={addOrigemFilter}
                              disabled={!newOrigemFilter.origem}
                              size="sm"
                              className="w-full"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar à Ordenação
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Toggle Details Button */}
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newState = !showClientDetailsAgenda;
                      setShowClientDetailsAgenda(newState);
                      if (isTablet && newState && showConversationsList) {
                        setShowConversationsList(false);
                      }
                    }}
                    className="h-9 w-9 p-0 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30"
                    title={showClientDetailsAgenda ? "Ocultar detalhes" : "Mostrar detalhes"}
                  >
                    {showClientDetailsAgenda ? <ChevronRight className="h-4 w-4 text-orange-600" /> : <ChevronLeft className="h-4 w-4 text-orange-600" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                    <CalendarIcon className="w-8 h-8 text-orange-300" />
                  </div>
                  <p className="text-sm font-medium">Nenhuma tarefa</p>
                  <p className="text-xs text-muted-foreground mt-1">{globalFilter ? 'para este filtro' : 'para esta data'}</p>
                </div>
              ) : (
                 filteredTasks.map((task) => {
                   const isLinkedToUser = task.contact_id && customerVinculos.linkedToUser.has(task.contact_id);
                   const isSameSegment = task.contact_id && !isLinkedToUser && 
                     customerVinculos.customerSegments[task.contact_id]?.some(seg => customerVinculos.userSegments.has(seg));
                   
                   return (
                   <div 
                     key={task.id} 
                     className={`relative rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
                       selectedTaskId === task.id 
                         ? "bg-orange-100 border border-orange-200 shadow-sm" 
                         : "bg-white/60 hover:bg-white hover:shadow-sm border border-transparent"
                     }`}
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setSelectedTaskData(task);
                        setShowClientDetailsAgenda(true);
                      }}
                   >
                      {/* Tarja lateral indicando vínculo */}
                      {(isLinkedToUser || isSameSegment) && (
                        <div 
                          className={`absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center rounded-l-xl ${
                            isLinkedToUser ? 'bg-primary' : 'bg-blue-500'
                          }`}
                        >
                          <span className="text-[8px] font-semibold text-white whitespace-nowrap transform -rotate-90">
                            {isLinkedToUser ? 'Meu Cliente' : 'Mesmo Seg.'}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex items-start gap-3 p-3 ${(isLinkedToUser || isSameSegment) ? 'pl-7' : 'pl-4'}`}>
                       <div className="flex-1 min-w-0">
                         <p className="font-semibold text-sm truncate">{task.title}</p>
                         <p className="text-xs text-muted-foreground truncate">{task.contact_name}</p>
                         <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                           {task.time && (
                             <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full flex items-center font-medium">
                               <Clock className="w-3 h-3 mr-1" />
                               {task.time}
                             </span>
                           )}
                           {task.origem && (
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/50">
                               {task.origem}
                             </Badge>
                           )}
                            {/* Stacked indicators in top-right corner */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-center">
                              {task.diasAtraso > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm cursor-default">
                                        {task.diasAtraso}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{task.diasAtraso} {task.diasAtraso === 1 ? 'dia' : 'dias'} atrasado</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {(() => {
                                const customerEmail = task.customers?.email?.toLowerCase();
                                const unreadEmailCount = customerEmail ? (emailsNaoLidosPerEmail[customerEmail] || 0) : 0;
                                if (unreadEmailCount > 0) {
                                  const firstUnreadEmail = userEmails.find(e => !e.read && e.from_email?.toLowerCase() === customerEmail);
                                  return (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveTab('email');
                                              if (firstUnreadEmail) setSelectedEmailId(firstUnreadEmail.id);
                                            }}
                                            className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors"
                                          >
                                            {unreadEmailCount}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{unreadEmailCount} email{unreadEmailCount > 1 ? 's' : ''} não lido{unreadEmailCount > 1 ? 's' : ''}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                }
                                return null;
                              })()}
                              {(() => {
                                const customerPhone = normalizePhone(task.customers?.telefone);
                                const unreadChatsCount = customerPhone ? (chatsNaoLidosPerPhone[customerPhone] || 0) : 0;
                                if (unreadChatsCount > 0) {
                                  const firstUnreadChat = conversations.find(c => 
                                    (c.chat_status === 'em_fila' || c.chat_status === 'novo') && 
                                    normalizePhone(c.customer?.telefone) === customerPhone
                                  );
                                  return (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveTab('chat');
                                              if (firstUnreadChat) setSelectedConversation(firstUnreadChat.id);
                                            }}
                                            className="bg-purple-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm hover:bg-purple-600 transition-colors"
                                          >
                                            {unreadChatsCount}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{unreadChatsCount} chat{unreadChatsCount > 1 ? 's' : ''} pendente{unreadChatsCount > 1 ? 's' : ''}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                           {(() => {
                              // Check for open budgets: by cliente_id, by empresa_id directly, OR by empresa_id through customer_empresas
                              const customerBudgetCount = task.contact_id ? (orcamentosAbertosPerCustomer[task.contact_id] || 0) : 0;
                              // Also check if contact_id IS an empresa_id directly
                              const directEmpresaBudgetCount = task.contact_id ? (orcamentosAbertosPerEmpresa[task.contact_id] || 0) : 0;
                              const empresaIds = task.customers?.customer_empresas?.map((ce: any) => ce.empresa_id || ce.empresas?.id).filter(Boolean) || [];
                              const empresaBudgetCount = empresaIds.reduce((acc: number, empId: string) => acc + (orcamentosAbertosPerEmpresa[empId] || 0), 0);
                              const totalBudgetCount = customerBudgetCount + directEmpresaBudgetCount + empresaBudgetCount;
                              
                              if (totalBudgetCount > 0) {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Find first open budget for this customer, empresa directly, or linked empresas
                                      const firstOrcamento = orcamentos.find(o => 
                                        o.status !== 'cancelado' && 
                                        o.status !== 'ganho' &&
                                        (o.cliente_id === task.contact_id || o.empresa_id === task.contact_id || empresaIds.includes(o.empresa_id))
                                      );
                                     if (firstOrcamento) {
                                       setActiveTab('orcamento');
                                       setSelectedOrcamentoId(firstOrcamento.id);
                                       setOrcamentoSheetOpen(true);
                                     }
                                   }}
                                   className="relative text-[10px] text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full flex items-center font-medium transition-colors"
                                   title="Ver orçamentos em aberto"
                                 >
                                   <FileText className="w-3 h-3 mr-1" />
                                   Orçamento
                                   {totalBudgetCount > 1 && (
                                     <span className="ml-1 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                                       {totalBudgetCount}
                                     </span>
                                   )}
                                 </button>
                               );
                              }
                              return null;
                            })()}
                          </div>
                       </div>
                     </div>
                   </div>
                 );})
              )}
            </div>
            </div>
          </TabsContent>

          {/* Email Tab - Empty, content shown in main area */}
          <TabsContent value="email" className="hidden" />
          
          {/* Orçamento Tab */}
          <TabsContent value="orcamento" className="flex-1 overflow-y-auto min-h-0 overscroll-contain m-0">
            {/* Header with Filter */}
            <div className="px-3 py-2 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20 border-b border-orange-100/50 dark:border-orange-900/30">
              <div className="flex items-center gap-2">
                {/* Filtros agrupados */}
                <div className="flex items-center gap-1.5 bg-white/50 dark:bg-background/50 rounded-xl px-2 py-1 border border-orange-100 dark:border-orange-900/50 min-w-0 overflow-hidden">
                  <Select value={orcamentosStatusFilter || "all"} onValueChange={(value) => setOrcamentosStatusFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="h-7 w-[85px] bg-transparent border-0 shadow-none text-xs px-2 focus:ring-0">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="orcamento">Orçamento</SelectItem>
                      <SelectItem value="negociacao">Negociação</SelectItem>
                      <SelectItem value="aprovacao_gerencia">Aprovação</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="w-px h-5 bg-orange-200 dark:bg-orange-800 shrink-0" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 text-xs gap-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 whitespace-nowrap ${orcamentosDateRange.from ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}
                      >
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                        {orcamentosDateRange.from ? (
                          orcamentosDateRange.to ? (
                            <span>{format(orcamentosDateRange.from, "dd/MM", { locale: ptBR })} - {format(orcamentosDateRange.to, "dd/MM", { locale: ptBR })}</span>
                          ) : (
                            <span>{format(orcamentosDateRange.from, "dd/MM", { locale: ptBR })}</span>
                          )
                        ) : (
                          <span>Período</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border shadow-lg" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={orcamentosDateRange.from}
                        selected={orcamentosDateRange.from ? { from: orcamentosDateRange.from, to: orcamentosDateRange.to } : undefined}
                        onSelect={(range: any) => setOrcamentosDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={1}
                        locale={ptBR}
                        className="pointer-events-auto p-3"
                      />
                      <div className="p-2 border-t flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-7"
                          onClick={() => setOrcamentosDateRange({ from: undefined, to: undefined })}
                        >
                          Limpar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1" />
                {/* Botão Novo */}
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (orcamentoSheetOpen) {
                      setShowNovoOrcamentoConfirm(true);
                    } else {
                      setSelectedOrcamentoId(null);
                      setInitialEmpresaForOrcamento(globalFilter?.type === 'empresa' ? globalFilter.id : null);
                      setOrcamentoSheetOpen(true);
                    }
                  }}
                  className="h-8 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo
                </Button>
              </div>
            </div>

            {/* Alert Dialog para confirmar novo orçamento */}
            <AlertDialog open={showNovoOrcamentoConfirm} onOpenChange={setShowNovoOrcamentoConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Criar novo orçamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você tem um orçamento aberto. Deseja fechar o atual e criar um novo?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setOrcamentoSheetOpen(false);
                      setSelectedOrcamentoId(null);
                      setInitialEmpresaForOrcamento(globalFilter?.type === 'empresa' ? globalFilter.id : null);
                      setTimeout(() => {
                        setOrcamentoSheetOpen(true);
                      }, 100);
                    }}
                  >
                    Criar Novo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="px-2 py-2 space-y-1.5">
            {filteredOrcamentos
              .filter(o => o.status !== 'cancelado' && o.status !== 'ganho')
              .filter(o => !orcamentosStatusFilter || o.etapa === orcamentosStatusFilter)
              .filter(o => {
                if (!orcamentosDateRange.from) return true;
                const orcDate = new Date(o.created_at);
                const fromDate = startOfDay(orcamentosDateRange.from);
                const toDate = orcamentosDateRange.to ? endOfDay(orcamentosDateRange.to) : endOfDay(orcamentosDateRange.from);
                return orcDate >= fromDate && orcDate <= toDate;
              })
              .length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Receipt className="w-8 h-8 text-orange-300" />
                </div>
                <p className="text-sm font-medium">Sem orçamentos</p>
                <p className="text-xs text-muted-foreground mt-1">{globalFilter ? 'Nenhum orçamento para este filtro' : 'Nenhum orçamento em andamento'}</p>
              </div>
            ) : (
              filteredOrcamentos
                .filter(o => o.status !== 'cancelado' && o.status !== 'ganho')
                .filter(o => !orcamentosStatusFilter || o.etapa === orcamentosStatusFilter)
                .filter(o => {
                  if (!orcamentosDateRange.from) return true;
                  const orcDate = new Date(o.created_at);
                  const fromDate = startOfDay(orcamentosDateRange.from);
                  const toDate = orcamentosDateRange.to ? endOfDay(orcamentosDateRange.to) : endOfDay(orcamentosDateRange.from);
                  return orcDate >= fromDate && orcDate <= toDate;
                })
                .map((orc) => (
                  <div 
                    key={orc.id} 
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                      selectedOrcamentoId === orc.id
                        ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 shadow-sm"
                        : "bg-white/60 dark:bg-background/60 hover:bg-white dark:hover:bg-background hover:shadow-sm border border-transparent"
                    }`}
                    onClick={() => {
                      setSelectedOrcamentoId(orc.id);
                      setOrcamentoSheetOpen(true);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedOrcamentoId === orc.id
                          ? "bg-orange-500 text-white"
                          : "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 text-orange-600 dark:text-orange-400"
                      }`}>
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-semibold text-sm truncate">
                            {orc.customers?.nome || orc.empresas?.nome_fantasia || orc.empresas?.nome || 'Cliente'}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                              {format(new Date(orc.created_at), 'dd/MM', { locale: ptBR })}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDuplicateOrcamento(orc.id);
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteOrcamento(orc.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(orc.valor_total || 0)}
                          </p>
                          <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-0">
                            {orc.etapa || orc.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Status do Atendente - Footer - Apenas no Chat */}
        {atendente && activeTab === "chat" && (
          <div className="border-t bg-gradient-to-r from-slate-50 to-white p-3 flex-shrink-0">
            <AtendenteStatusSelector
              atendenteId={atendente.id}
              currentStatus={atendente.status}
              onStatusChange={() => loadAtendente(usuarioId)}
            />
          </div>
        )}
          </>
        )}
      </div>

      {/* Main Content Area - Esconde quando orçamento está aberto */}
      {!orcamentoSheetOpen && (
      <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 border-r border-border">
        {/* Listas Panel - Tem prioridade sobre outros conteúdos */}
        {(showCustomerSearchForTask || showCustomerSearchForChat || showCustomerSearchForEmail || showCustomerSearchForOrcamento) ? (
          <ListasPanel
            onClose={() => {
              setShowCustomerSearchForTask(false);
              setShowCustomerSearchForChat(false);
              setShowCustomerSearchForEmail(false);
              setShowCustomerSearchForOrcamento(false);
            }}
            title="Puxar ou criar cadastro"
            description={
              showCustomerSearchForTask ? "Selecione ou crie um contato para a nova tarefa" :
              showCustomerSearchForChat ? "Selecione ou crie um contato para iniciar a conversa" :
              showCustomerSearchForEmail ? "Selecione ou crie um contato para enviar o e-mail" :
              "Selecione ou crie um contato para o orçamento"
            }
            defaultTab="contatos"
          />
        ) : activeTab === "chat" && selectedConversation && selectedConv ? (
          <>
            <div className="px-3 md:px-4 py-2.5 md:py-3 border-b bg-card shadow-sm flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isMobile && !showConversationsList && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowConversationsList(true)}
                      className="h-6 w-6 md:h-7 md:w-7 p-0"
                      title="Mostrar painel"
                    >
                      <PanelLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </Button>
                  )}
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs md:text-sm">
                      {selectedConv.customer?.nome || "Cliente"}
                    </h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      {selectedConv.customer?.telefone || "Sem telefone"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  {selectedConv.bot_active === false && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReactivateBot}
                      className="text-[10px] md:text-xs h-6 md:h-7 rounded-full px-2 md:px-3"
                    >
                      Reativar Bot
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newState = !showClientDetailsChat;
                      setShowClientDetailsChat(newState);
                      // Em tablets, coordenar com o painel de conversas
                      if (isTablet && newState && showConversationsList) {
                        setShowConversationsList(false);
                      }
                    }}
                    className="h-6 w-6 md:h-7 md:w-7 p-0"
                    title={showClientDetailsChat ? "Ocultar detalhes" : "Mostrar detalhes"}
                  >
                    {showClientDetailsChat ? <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-2 md:p-4 space-y-2 bg-gray-200">
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
                          <p className="text-[13px] whitespace-pre-wrap break-words leading-snug">
                            {isRealTimeTranslationActive && messageTranslations[msg.id] ? (
                              <div className="space-y-2">
                                <div className={`pb-2 border-b ${msg.sender === "agent" ? "border-white/20" : "border-border/50"}`}>
                                  <p className={`text-[11px] font-semibold mb-1 ${msg.sender === "agent" ? "opacity-70" : "text-muted-foreground"}`}>Original:</p>
                                  <p className="text-[13px]">{msg.text}</p>
                                </div>
                                <div>
                                  <p className={`text-[11px] font-semibold mb-1 ${msg.sender === "agent" ? "opacity-70" : "text-muted-foreground"}`}>Tradução:</p>
                                  <p className="text-[13px]">{messageTranslations[msg.id]}</p>
                                </div>
                              </div>
                            ) : (
                              msg.text
                            )}
                          </p>
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
                                  <button
                                    key={idx}
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(attachment);
                                        const blob = await response.blob();
                                        const blobUrl = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = blobUrl;
                                        link.download = msg.payload?.fileName || 'arquivo';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(blobUrl);
                                      } catch (error) {
                                        console.error('Erro ao baixar arquivo:', error);
                                        window.open(attachment, '_blank');
                                      }
                                    }}
                                    className="block w-full text-left"
                                  >
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border border-border/60 hover:bg-background transition-colors text-xs cursor-pointer">
                                      <Download className="h-4 w-4 text-primary" />
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">
                                          {msg.payload?.fileName || "Arquivo"}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          Clique para baixar
                                        </span>
                                      </div>
                                    </div>
                                  </button>
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

              {/* Summary Panel */}
              {showSummaryPanel && (
                <Card className="bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/20 rounded-2xl overflow-hidden">
                  <ConversationSummaryPanel
                    summary={conversationSummary}
                    isLoading={isSummaryLoading}
                    onClose={() => {
                      setShowSummaryPanel(false);
                      setConversationSummary(null);
                      setSummaryGeneratedAt(null);
                    }}
                    generatedAt={summaryGeneratedAt || undefined}
                  />
                </Card>
              )}

              <div className="flex flex-col gap-3">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={false}
                  lastUserMessage={lastUserMessage}
                  onSuggestionGenerated={(suggestion) => console.log("Suggestion:", suggestion)}
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
                  conversationId={selectedConversation || undefined}
                  conversationMessages={messages}
                  onSummaryGenerated={(summary) => {
                    if (summary === "") {
                      // Empty string means loading started
                      setShowSummaryPanel(true);
                      setIsSummaryLoading(true);
                      setConversationSummary(null);
                    } else {
                      // Actual summary received
                      setConversationSummary(summary);
                      setSummaryGeneratedAt(new Date());
                      setIsSummaryLoading(false);
                      setShowSummaryPanel(true);
                    }
                  }}
                  isRealTimeTranslationActive={isRealTimeTranslationActive}
                  onToggleRealTimeTranslation={handleToggleRealTimeTranslation}
                  translationLanguage={translationLanguage}
                  onTranslationLanguageChange={setTranslationLanguage}
                  triggerTool={triggerTool}
                  onToolTriggered={() => setTriggerTool(null)}
                  customerPhone={selectedConv?.customer?.telefone}
                  customerName={selectedConv?.customer?.nome}
                  customerId={selectedConv?.customer?.id}
                />
              </div>
            </div>
          </>
        ) : activeTab === "agenda" && agendaViewMode === 'fluxo' ? (
          /* Fluxo de Atendimento Panel */
          <FluxoAtendimentoPanel
            tasks={filteredTasks}
            estabelecimentoId={estabelecimentoId}
            usuarioId={usuarioId}
            onTaskCompleted={loadTodayTasks}
            onClose={() => {
              setAgendaViewMode('default');
              setFluxoCurrentTask(null);
              setFluxoInitialIndex(0);
            }}
            onCurrentTaskChange={setFluxoCurrentTask}
            showDetails={showClientDetailsFluxo}
            onToggleDetails={() => setShowClientDetailsFluxo(!showClientDetailsFluxo)}
            initialTaskIndex={fluxoInitialIndex}
            onNavigateToItem={(type, id) => {
              setAgendaViewMode('default');
              if (type === 'chat') {
                setActiveTab('chat');
                setSelectedConversation(id);
              } else if (type === 'orcamento') {
                setActiveTab('orcamento');
                setSelectedOrcamentoId(id);
                const orc = orcamentos.find(o => o.id === id);
                if (orc) setSelectedOrcamentoData(orc);
                setOrcamentoSheetOpen(true);
              } else if (type === 'email') {
                setActiveTab('email');
                setSelectedEmailId(id);
              }
            }}
          />
        ) : activeTab === "agenda" && agendaViewMode === 'massa' ? (
          /* Envio em Massa Panel */
          <EnvioMassaPanel
            tasks={filteredTasks}
            estabelecimentoId={estabelecimentoId}
            usuarioId={usuarioId}
            onComplete={loadTodayTasks}
            onClose={() => setAgendaViewMode('default')}
          />
        ) : activeTab === "agenda" && showEnvioMassaWizard ? (
          /* Envio em Massa Wizard */
          <div className="flex-1 flex flex-col h-full min-h-0 bg-card">
            <EnvioMassaWizardContent
              onClose={() => setShowEnvioMassaWizard(false)}
              onComplete={loadTodayTasks}
            />
          </div>
        ) : editingContatoId ? (
          /* Edição de Contato Inline */
          <EditContatoEmbedded
            customerId={editingContatoId}
            onClose={() => setEditingContatoId(null)}
            onSuccess={() => {
              // Recarregar dados conforme a aba ativa
              if (activeTab === "chat" && selectedConversation) {
                loadCustomerCompanies(selectedConversation);
              } else if (activeTab === "agenda" && selectedTaskId) {
                loadSelectedTask(selectedTaskId);
                loadTodayTasks();
              } else if (activeTab === "email" && selectedEmailId) {
                loadSelectedEmail(selectedEmailId);
              }
            }}
            onEditEmpresa={(empresaId, customerEmpresaId) => {
              setEditingContatoId(null);
              setEditingEmpresaId(empresaId);
              setEditingCustomerEmpresaId(customerEmpresaId || null);
            }}
          />
        ) : editingEmpresaId ? (
          /* Edição de Empresa Inline */
          <EditEmpresaEmbedded
            empresaId={editingEmpresaId}
            customerEmpresaId={editingCustomerEmpresaId || undefined}
            onClose={() => {
              setEditingEmpresaId(null);
              setEditingCustomerEmpresaId(null);
            }}
            onSuccess={() => {
              // Recarregar dados conforme a aba ativa
              if (activeTab === "chat" && selectedConversation) {
                loadCustomerCompanies(selectedConversation);
              } else if (activeTab === "agenda" && selectedTaskId) {
                loadSelectedTask(selectedTaskId);
                loadTodayTasks();
              } else if (activeTab === "email" && selectedEmailId) {
                loadSelectedEmail(selectedEmailId);
              }
              setEditingEmpresaId(null);
              setEditingCustomerEmpresaId(null);
            }}
            onEditContato={(customerId) => {
              setEditingEmpresaId(null);
              setEditingCustomerEmpresaId(null);
              setEditingContatoId(customerId);
            }}
          />
        ) : creatingContato ? (
          /* Criação de Contato Inline */
          <CreateContatoEmbedded
            onClose={() => {
              setCreatingContato(false);
              setCreatingContatoInitialData(null);
            }}
            onSuccess={() => {
              setCreatingContato(false);
              setCreatingContatoInitialData(null);
              // Recarregar dados conforme a aba ativa
              if (activeTab === "agenda") {
                loadTodayTasks();
              } else if (activeTab === "email" && selectedEmailId) {
                loadSelectedEmail(selectedEmailId);
              } else if (activeTab === "chat" && selectedConversation) {
                loadCustomerCompanies(selectedConversation);
              }
            }}
            initialData={creatingContatoInitialData || undefined}
          />
        ) : creatingEmpresa ? (
          /* Criação de Empresa Inline */
          <CreateEmpresaEmbedded
            customerId={creatingEmpresaForCustomerId || undefined}
            onClose={() => {
              setCreatingEmpresa(false);
              setCreatingEmpresaForCustomerId(null);
            }}
            onSuccess={() => {
              setCreatingEmpresa(false);
              setCreatingEmpresaForCustomerId(null);
              // Recarregar dados conforme a aba ativa
              if (activeTab === "chat" && selectedConversation) {
                loadCustomerCompanies(selectedConversation);
              } else if (activeTab === "agenda" && selectedTaskId) {
                loadSelectedTask(selectedTaskId);
                loadTodayTasks();
              } else if (activeTab === "email" && selectedEmailId) {
                loadSelectedEmail(selectedEmailId);
              }
            }}
          />
        ) : activeTab === "agenda" && selectedTaskId && selectedTaskData ? (
          /* Agenda Task Content */
          <div className="flex-1 flex flex-col h-full min-h-0 bg-card">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{selectedTaskData.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedTaskData.contact_name} • {selectedTaskData.time || "Dia todo"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ToolsDropdown 
                    ferramentas={getToolbarFerramentas('agenda')} 
                    onSelectTool={handleToolSelect} 
                    tabType="agenda" 
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowClientDetailsAgenda(!showClientDetailsAgenda);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    {showClientDetailsAgenda ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <Card className="p-4">
                <h4 className="font-medium text-sm mb-2">Detalhes da Tarefa</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data:</span>
                    <span>{format(new Date(selectedTaskData.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horário:</span>
                    <span>{selectedTaskData.time || "Dia todo"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selectedTaskData.status === "concluido" ? "default" : "secondary"}>
                      {selectedTaskData.status === "concluido" ? "Concluído" : "Pendente"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Origem:</span>
                    <span>{selectedTaskData.origem}</span>
                  </div>
                </div>
              </Card>
              {selectedTaskData.description && (
                <Card className="p-4">
                  <h4 className="font-medium text-sm mb-2">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTaskData.description}</p>
                </Card>
              )}
            </div>
          </div>
        ) : activeTab === "email" ? (
          /* Email Layout - Modern Panel */
          <EmailPanel
            emails={filteredEmails}
            selectedEmailId={selectedEmailId}
            selectedEmailData={selectedEmailData}
            emailFolder={emailFolder}
            onFolderChange={(folder) => {
              setEmailFolder(folder);
              setSelectedEmailId(null);
              setSelectedEmailData(null);
            }}
            onEmailSelect={(id, data) => {
              setSelectedEmailId(id);
              setSelectedEmailData(data);
            }}
            onEmailClose={() => {
              setSelectedEmailId(null);
              setSelectedEmailData(null);
            }}
            onComposeClick={() => {
              setComposeEmailMode('compose');
              setComposeEmailDefaults({ to: '', subject: '', body: '' });
              setShowComposeEmail(true);
            }}
            onRefresh={async () => {
              await loadUserEmails();
              // Também recarregar o email selecionado para atualizar dados de tracking
              if (selectedEmailId) {
                loadSelectedEmail(selectedEmailId, true);
              }
            }}
            onToggleDetails={() => setShowClientDetailsEmail(!showClientDetailsEmail)}
            showDetailsToggle={!!selectedEmailId}
            onReply={(email) => {
              const replySubject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`;
              const replyBody = `\n\n---\nEm ${format(new Date(email.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}, ${email.from_email} escreveu:\n${email.body || ''}`;
              setComposeEmailMode('reply');
              setComposeEmailDefaults({ to: email.from_email, subject: replySubject, body: replyBody });
              setShowComposeEmail(true);
            }}
            onForward={(email) => {
              const fwdSubject = email.subject?.startsWith('Fwd:') || email.subject?.startsWith('Enc:') ? email.subject : `Enc: ${email.subject || ''}`;
              const fwdBody = `\n\n---\nMensagem encaminhada:\nDe: ${email.from_email}\nData: ${format(new Date(email.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}\nAssunto: ${email.subject || ''}\n\n${email.body || ''}`;
              setComposeEmailMode('forward');
              setComposeEmailDefaults({ to: '', subject: fwdSubject, body: fwdBody });
              setShowComposeEmail(true);
            }}
            toolsSlot={
              <ToolsDropdown 
                ferramentas={getToolbarFerramentas('email')} 
                onSelectTool={handleToolSelect} 
                tabType="email" 
              />
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20 relative">
            <div className="text-center">
              {activeTab === "chat" && (
                <>
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-lg font-medium mb-2">Selecione uma conversa</p>
                  <p className="text-sm">Escolha uma conversa da lista para começar o atendimento</p>
                </>
              )}
              {activeTab === "agenda" && !showEnvioMassaWizard && (
                <>
                  <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-lg font-medium mb-2">Selecione uma tarefa</p>
                  <p className="text-sm">Escolha uma tarefa da agenda para ver os detalhes</p>
                  <div className="flex gap-2 mt-4 justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAgendaViewMode('fluxo')}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Iniciar Fluxo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowEnvioMassaWizard(true)}
                      className="gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Envio em Massa
                    </Button>
                  </div>
                </>
              )}
              {/* Desktop: inline wizard */}
              {activeTab === "agenda" && showEnvioMassaWizard && (
                <div className="hidden lg:block w-full h-full absolute inset-0">
                  <EnvioMassaWizardContent
                    onClose={() => setShowEnvioMassaWizard(false)}
                    onComplete={loadTodayTasks}
                  />
                </div>
              )}
              {activeTab === "orcamento" && (
                <>
                  <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-lg font-medium mb-2">Selecione um orçamento</p>
                  <p className="text-sm">Escolha um orçamento da lista para gerenciar</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Right Sidebar - Company Details Panel - Esconde quando orçamento está aberto */}
      {!orcamentoSheetOpen && activeTab === "chat" && selectedConversation && selectedConv && showClientDetailsChat && (
        <div className={`${isSmallTablet ? 'w-56' : 'w-80 md:w-64 lg:w-80'} bg-card flex flex-col h-full min-h-0 overflow-hidden border-l border-border`}>
          <UnifiedDetailsPanel
            type="chat"
            nome={selectedConv.customer?.nome || "Cliente"}
            telefone={selectedConv.customer?.tel}
            whatsapp={selectedConv.customer?.telefone}
            email={selectedConv.customer?.email}
            customerId={selectedConv.customer?.id}
            protocolo={selectedConv.id.slice(0, 8).toUpperCase()}
            status={selectedConv.chat_status || selectedConv.status}
            canal={selectedConv.canal}
            dataHora={format(new Date(selectedConv.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            companies={customerCompanies}
            onCompaniesUpdated={() => loadCustomerCompanies(selectedConversation || '')}
            onSetGlobalFilter={setGlobalFilter}
            onEditContato={(id) => setEditingContatoId(id)}
            onEditEmpresa={(empresaId, customerEmpresaId) => {
              setEditingEmpresaId(empresaId);
              setEditingCustomerEmpresaId(customerEmpresaId || null);
            }}
            onCreateContato={() => setCreatingContato(true)}
            onCreateEmpresa={(customerId) => {
              setCreatingEmpresa(true);
              setCreatingEmpresaForCustomerId(customerId || null);
            }}
          />
        </div>
      )}

      {/* Right Sidebar - Agenda Details Panel */}
      {!orcamentoSheetOpen && activeTab === "agenda" && selectedTaskId && selectedTaskData && showClientDetailsAgenda && agendaViewMode === 'default' && (
        <div className={`${isSmallTablet ? 'w-56' : 'w-80 md:w-64 lg:w-80'} bg-card flex flex-col h-full min-h-0 overflow-hidden border-l border-border`}>
          <UnifiedDetailsPanel
            type="agenda"
            nome={selectedTaskData.customers?.nome || selectedTaskData.contact_name}
            telefone={selectedTaskData.customers?.tel}
            whatsapp={selectedTaskData.customers?.telefone}
            email={selectedTaskData.customers?.email}
            customerId={selectedTaskData.customers?.id}
            protocolo={selectedTaskData.id?.slice(0, 8).toUpperCase()}
            status={selectedTaskData.status === "concluido" ? "Concluído" : "Pendente"}
            titulo={selectedTaskData.title}
            dataHora={format(new Date(selectedTaskData.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) + (selectedTaskData.time ? ` às ${selectedTaskData.time}` : "")}
            companies={selectedTaskData.customers?.customer_empresas || []}
            onCompaniesUpdated={() => loadSelectedTask(selectedTaskId || '')}
            onSetGlobalFilter={setGlobalFilter}
            onEditContato={(id) => setEditingContatoId(id)}
            onEditEmpresa={(empresaId, customerEmpresaId) => {
              setEditingEmpresaId(empresaId);
              setEditingCustomerEmpresaId(customerEmpresaId || null);
            }}
            onCreateContato={() => setCreatingContato(true)}
            onCreateEmpresa={(customerId) => {
              setCreatingEmpresa(true);
              setCreatingEmpresaForCustomerId(customerId || null);
            }}
          />
        </div>
      )}

      {/* Right Sidebar - Fluxo Details Panel */}
      {!orcamentoSheetOpen && activeTab === "agenda" && agendaViewMode === 'fluxo' && fluxoCurrentTask && showClientDetailsFluxo && (
        <div className={`${isSmallTablet ? 'w-56' : 'w-80 md:w-64 lg:w-80'} bg-card flex flex-col h-full min-h-0 overflow-hidden border-l border-border`}>
          <UnifiedDetailsPanel
            type="agenda"
            nome={fluxoCurrentTask.contact_name}
            telefone={fluxoCurrentTask.customers?.tel}
            whatsapp={fluxoCurrentTask.customers?.telefone}
            email={fluxoCurrentTask.customers?.email}
            customerId={fluxoCurrentTask.customers?.id}
            protocolo={fluxoCurrentTask.id?.slice(0, 8).toUpperCase()}
            status={fluxoCurrentTask.status === "concluido" ? "Concluído" : "Pendente"}
            titulo={fluxoCurrentTask.title}
            dataHora={format(new Date(fluxoCurrentTask.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) + (fluxoCurrentTask.time ? ` às ${fluxoCurrentTask.time}` : "")}
            companies={fluxoCurrentTask.customers?.customer_empresas || []}
            onSetGlobalFilter={setGlobalFilter}
            onEditContato={(id) => setEditingContatoId(id)}
            onEditEmpresa={(empresaId, customerEmpresaId) => {
              setEditingEmpresaId(empresaId);
              setEditingCustomerEmpresaId(customerEmpresaId || null);
            }}
            onCreateContato={() => setCreatingContato(true)}
            onCreateEmpresa={(customerId) => {
              setCreatingEmpresa(true);
              setCreatingEmpresaForCustomerId(customerId || null);
            }}
          />
        </div>
      )}

      {/* Right Sidebar - Email Details Panel */}
      {!orcamentoSheetOpen && activeTab === "email" && selectedEmailId && selectedEmailData && showClientDetailsEmail && (
        <div className={`${isSmallTablet ? 'w-56' : 'w-80 md:w-64 lg:w-80'} bg-card flex flex-col h-full min-h-0 overflow-hidden border-l border-border`}>
          <UnifiedDetailsPanel
            type="email"
            nome={selectedEmailData.customer?.nome || selectedEmailData.empresa?.nome_fantasia || selectedEmailData.empresa?.nome || "Contato Desconhecido"}
            telefone={selectedEmailData.customer?.tel || selectedEmailData.empresa?.telefone}
            whatsapp={selectedEmailData.customer?.telefone || selectedEmailData.empresa?.telefone}
            email={selectedEmailData.from_email}
            customerId={selectedEmailData.customer?.id}
            protocolo={selectedEmailData.id?.slice(0, 8).toUpperCase()}
            status={selectedEmailData.read ? "Lido" : "Não lido"}
            titulo={selectedEmailData.subject}
            dataHora={format(new Date(selectedEmailData.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            companies={[
              ...(selectedEmailData.customer?.customer_empresas?.map((ce: any) => ({
                ...ce,
                empresas: ce.empresas
              })) || []),
              ...(selectedEmailData.empresa ? [{ empresas: selectedEmailData.empresa }] : [])
            ]}
            onCompaniesUpdated={() => loadSelectedEmail(selectedEmailId || '')}
            onSetGlobalFilter={setGlobalFilter}
            onEditContato={(id) => setEditingContatoId(id)}
            onEditEmpresa={(empresaId, customerEmpresaId) => {
              setEditingEmpresaId(empresaId);
              setEditingCustomerEmpresaId(customerEmpresaId || null);
            }}
            onCreateContato={() => {
              setCreatingContatoInitialData({ email: selectedEmailData.from_email });
              setCreatingContato(true);
            }}
            onCreateEmpresa={(customerId) => {
              setCreatingEmpresa(true);
              setCreatingEmpresaForCustomerId(customerId || null);
            }}
          />
        </div>
      )}
      
      {/* Novo Contato Dialog */}
      <NovoContatoDialog 
        open={showNovoContatoDialog}
        onOpenChange={setShowNovoContatoDialog}
      />

      {/* Orçamento Panel Lateral - Ao lado do painel */}
      {orcamentoSheetOpen && estabelecimentoId ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full bg-background">
          <POSView
            estabelecimentoId={estabelecimentoId} 
            orcamentoId={selectedOrcamentoId || undefined}
            onClose={() => {
              setOrcamentoSheetOpen(false);
              setSelectedOrcamentoId(null);
              setInitialEmpresaForOrcamento(null);
            }}
            showClientDetails={showClientDetailsOrcamento}
            onToggleClientDetails={() => {
              const newState = !showClientDetailsOrcamento;
              setShowClientDetailsOrcamento(newState);
              // Em tablets, coordenar com o painel de conversas
              if (isTablet && newState && showConversationsList) {
                setShowConversationsList(false);
              }
            }}
            showPanelToggle={!showConversationsList}
            onTogglePanel={() => setShowConversationsList(true)}
            initialEmpresaId={!selectedOrcamentoId ? initialEmpresaForOrcamento : null}
          />
        </div>
      ) : null}

      {/* Client Details Panel - Orçamento */}
      {orcamentoSheetOpen && showClientDetailsOrcamento && selectedOrcamentoData && (
        <div className={`${isSmallTablet ? 'w-36' : isTablet ? 'w-44' : 'w-72 lg:w-80'} bg-card flex flex-col h-full min-h-0 overflow-hidden border-l border-border`}>
          <UnifiedDetailsPanel
            type="orcamento"
            nome={selectedOrcamentoData.customers?.nome || selectedOrcamentoData.empresas?.nome_fantasia || selectedOrcamentoData.empresas?.nome || "Cliente"}
            telefone={selectedOrcamentoData.customers?.tel || selectedOrcamentoData.empresas?.telefone}
            whatsapp={selectedOrcamentoData.customers?.telefone || selectedOrcamentoData.empresas?.telefone}
            email={selectedOrcamentoData.customers?.email || selectedOrcamentoData.empresas?.email}
            customerId={selectedOrcamentoData.customers?.id}
            protocolo={selectedOrcamentoData.id?.slice(0, 8).toUpperCase()}
            status={selectedOrcamentoData.etapa || selectedOrcamentoData.status}
            valorTotal={selectedOrcamentoData.valor_total || 0}
            companies={
              selectedOrcamentoData.empresas 
                ? [{ empresas: selectedOrcamentoData.empresas, is_primary: true }]
                : customerCompanies
            }
            onSetGlobalFilter={setGlobalFilter}
            onEditContato={(id) => setEditingContatoId(id)}
            onEditEmpresa={(empresaId, customerEmpresaId) => {
              setEditingEmpresaId(empresaId);
              setEditingCustomerEmpresaId(customerEmpresaId || null);
            }}
            onCreateContato={() => setCreatingContato(true)}
            onCreateEmpresa={(customerId) => {
              setCreatingEmpresa(true);
              setCreatingEmpresaForCustomerId(customerId || null);
            }}
          />
        </div>
      )}

      <SoftphoneDialog 
        open={showSoftphone}
        onOpenChange={setShowSoftphone}
        initialNumber={softphoneNumber}
      />

      <PredictiveDialerDialog 
        open={showPredictiveDialer}
        onOpenChange={setShowPredictiveDialer}
      />


      <AlertDialog open={!!confirmDeleteOrcamento} onOpenChange={(open) => !open && setConfirmDeleteOrcamento(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteOrcamento) {
                  deleteOrcamento(confirmDeleteOrcamento);
                  setConfirmDeleteOrcamento(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDuplicateOrcamento} onOpenChange={(open) => !open && setConfirmDuplicateOrcamento(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar duplicação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja duplicar este orçamento? Será criada uma cópia com todos os itens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDuplicateOrcamento) {
                  duplicateOrcamento(confirmDuplicateOrcamento);
                  setConfirmDuplicateOrcamento(null);
                }
              }}
            >
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ComposeEmailDialog
        open={showComposeEmail}
        onOpenChange={setShowComposeEmail}
        onSend={handleSendEmail}
        mode={composeEmailMode}
        defaultTo={composeEmailDefaults.to}
        defaultSubject={composeEmailDefaults.subject}
        defaultBody={composeEmailDefaults.body}
        estabelecimentoId={estabelecimentoId}
      />
      </div>
      )}
    </RadialMenu>
    
    {/* Global Dialogs - render regardless of mobile/desktop */}
    <FluxoAtendimentoDialog
      open={showFluxoAtendimento}
      onOpenChange={setShowFluxoAtendimento}
      tasks={filteredTasks}
      estabelecimentoId={estabelecimentoId}
      usuarioId={usuarioId}
      onTaskCompleted={loadTodayTasks}
    />
    <ConfigDatasProximoContatoDialog
      open={showConfigDatas}
      onOpenChange={setShowConfigDatas}
      estabelecimentoId={estabelecimentoId}
    />
    <EnvioMassaDialog
      open={showEnvioMassa}
      onOpenChange={setShowEnvioMassa}
      tasks={filteredTasks}
      estabelecimentoId={estabelecimentoId}
      usuarioId={usuarioId}
      onComplete={loadTodayTasks}
    />
    {/* Mobile/Tablet: Full screen wizard */}
    {showEnvioMassaWizard && (
      <div className="lg:hidden">
        <EnvioMassaWizardPanel
          onClose={() => setShowEnvioMassaWizard(false)}
          onComplete={loadTodayTasks}
        />
      </div>
    )}
    </>
  );
}

// ============ Mobile Components ============

interface MobileListContentProps {
  activeTab: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  globalFilter: any;
  setGlobalFilter: (filter: any) => void;
  filteredConversations: any[];
  selectedConversation: string | null;
  setSelectedConversation: (id: string | null) => void;
  filteredTasks: any[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  agendaDate: Date;
  handlePreviousDay: () => void;
  handleNextDay: () => void;
  handleToday: () => void;
  filteredEmails: any[];
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
  filteredOrcamentos: any[];
  orcamentosStatusFilter: string;
  setOrcamentosStatusFilter: (filter: string) => void;
  selectedOrcamentoId: string | null;
  setSelectedOrcamentoId: (id: string | null) => void;
  setOrcamentoSheetOpen: (open: boolean) => void;
  onNovoOrcamentoClick?: () => void;
  showPredictiveDialer: () => void;
  atendente: any;
  usuarioId: string;
  loadAtendente: (id: string) => void;
  getTimeAgo: (date: string) => string;
  emailFolder: string;
  setEmailFolder: (folder: string) => void;
  setShowComposeEmail: (show: boolean) => void;
  customerVinculos: {
    linkedToUser: Set<string>;
    userSegments: Set<string>;
    customerSegments: Record<string, string[]>;
  };
  orcamentosAbertosPerCustomer: Record<string, number>;
  orcamentosAbertosPerEmpresa: Record<string, number>;
  orcamentos: any[];
  setActiveTab: (tab: string) => void;
  emailsNaoLidosPerEmail: Record<string, number>;
  chatsNaoLidosPerPhone: Record<string, number>;
  agendaViewMode: 'default' | 'fluxo' | 'massa';
  setAgendaViewMode: (mode: 'default' | 'fluxo' | 'massa') => void;
  setFluxoInitialIndex: (index: number) => void;
  setShowConfigDatas: (show: boolean) => void;
  setShowEnvioMassaWizard: (show: boolean) => void;
  onRefreshEmails: () => void;
  onShowCustomerSearch: () => void;
}

function MobileListContent({
  activeTab,
  searchTerm,
  setSearchTerm,
  globalFilter,
  setGlobalFilter,
  filteredConversations,
  selectedConversation,
  setSelectedConversation,
  filteredTasks,
  selectedTaskId,
  setSelectedTaskId,
  agendaDate,
  handlePreviousDay,
  handleNextDay,
  handleToday,
  filteredEmails,
  selectedEmailId,
  setSelectedEmailId,
  filteredOrcamentos,
  orcamentosStatusFilter,
  setOrcamentosStatusFilter,
  selectedOrcamentoId,
  setSelectedOrcamentoId,
  setOrcamentoSheetOpen,
  onNovoOrcamentoClick,
  showPredictiveDialer,
  atendente,
  usuarioId,
  loadAtendente,
  getTimeAgo,
  emailFolder,
  setEmailFolder,
  setShowComposeEmail,
  customerVinculos,
  orcamentosAbertosPerCustomer,
  orcamentosAbertosPerEmpresa,
  orcamentos,
  setActiveTab,
  emailsNaoLidosPerEmail,
  chatsNaoLidosPerPhone,
  agendaViewMode,
  setAgendaViewMode,
  setFluxoInitialIndex,
  setShowConfigDatas,
  setShowEnvioMassaWizard,
  onRefreshEmails,
  onShowCustomerSearch,
}: MobileListContentProps) {
  return (
    <div className="h-full flex flex-col bg-white/80">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent safe-area-top">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              {activeTab === "chat" && <MessageSquare className="h-5 w-5 text-white" />}
              {activeTab === "agenda" && <CalendarIcon className="h-5 w-5 text-white" />}
              {activeTab === "email" && <Mail className="h-5 w-5 text-white" />}
              {activeTab === "orcamento" && <Receipt className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {activeTab === "chat" && "Conversas"}
                {activeTab === "agenda" && "Agenda"}
                {activeTab === "email" && "E-mails"}
                {activeTab === "orcamento" && "Orçamentos"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {activeTab === "chat" && `${filteredConversations.length} conversas`}
                {activeTab === "agenda" && format(agendaDate, "dd 'de' MMMM", { locale: ptBR })}
                {activeTab === "email" && `${filteredEmails.length} emails`}
                {activeTab === "orcamento" && `${filteredOrcamentos.length} orçamentos`}
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={onShowCustomerSearch}
            className="h-10 w-10 rounded-xl border-primary/30 hover:bg-primary/10 hover:border-primary/50"
            title="Puxar ou criar cadastro"
          >
            <Plus className="h-4 w-4 text-primary" />
          </Button>
        </div>

        {/* Search/Filter */}
        {activeTab === "chat" && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-10 h-10 rounded-xl text-sm bg-white/80 border-border/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <GlobalClientFilter activeFilter={globalFilter} onFilterChange={setGlobalFilter} compact />
          </div>
        )}

        {activeTab === "agenda" && (
          <div className="space-y-3">
            {/* Card Principal - Data e Ações */}
            <div className="bg-white dark:bg-muted/30 rounded-2xl shadow-sm border border-border/40 overflow-hidden">
              {/* Header com Data */}
              <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={handlePreviousDay} 
                    className="w-8 h-8 rounded-full bg-white dark:bg-background shadow-sm border border-border/40 flex items-center justify-center hover:bg-primary/5 hover:border-primary/30 transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4 text-foreground/70" />
                  </button>
                  
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">
                      {format(agendaDate, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {format(agendaDate, "EEEE, yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <button 
                    onClick={handleNextDay} 
                    className="w-8 h-8 rounded-full bg-white dark:bg-background shadow-sm border border-border/40 flex items-center justify-center hover:bg-primary/5 hover:border-primary/30 transition-all active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4 text-foreground/70" />
                  </button>
                </div>
              </div>
              
              {/* Corpo com Ações */}
              <div className="p-3 space-y-3">
                {/* Toggle Fluxo/Massa */}
                <div className="flex items-center justify-center">
                  <div className="inline-flex items-center bg-muted/50 rounded-xl p-1 gap-1">
                    <button 
                      onClick={() => setAgendaViewMode('fluxo')}
                      disabled={filteredTasks.length === 0}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50",
                        agendaViewMode === 'fluxo' 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-background"
                      )}
                    >
                      <Play className="w-3.5 h-3.5" fill={agendaViewMode === 'fluxo' ? 'currentColor' : 'none'} />
                      Fluxo
                    </button>
                    <button 
                      onClick={() => {
                        setAgendaViewMode('default');
                        setShowEnvioMassaWizard(true);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                        "text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-background"
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Massa
                    </button>
                  </div>
                </div>
                
                {/* Ações Rápidas */}
                <div className="flex items-center justify-center gap-2">
                  <button 
                    onClick={handleToday} 
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                    title="Ir para hoje"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Hoje
                  </button>
                  
                  <button 
                    onClick={() => showPredictiveDialer()} 
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 text-xs font-medium text-green-700 dark:text-green-400 transition-all"
                    title="Discador preditivo"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Discador
                  </button>
                  
                  <button 
                    onClick={() => setShowConfigDatas(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                    title="Configurações de datas"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Config
                  </button>
                </div>
              </div>
            </div>
            
            {/* Card de Filtros */}
            <div className="bg-white dark:bg-muted/30 rounded-2xl shadow-sm border border-border/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground pl-1">Filtrar por:</span>
                <div className="flex items-center gap-1.5">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 hover:bg-green-50 dark:hover:bg-green-950/30 text-muted-foreground hover:text-green-700 dark:hover:text-green-400 border border-transparent hover:border-green-200 dark:hover:border-green-800 transition-all">
                    <Phone className="w-3 h-3" />
                    Tel
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
                    <MessageSquare className="w-3 h-3" />
                    Whats
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-muted-foreground hover:text-blue-700 dark:hover:text-blue-400 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                    <Mail className="w-3 h-3" />
                    Email
                  </button>
                </div>
                <GlobalClientFilter activeFilter={globalFilter} onFilterChange={setGlobalFilter} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === "email" && (
          <div className="space-y-2">
            {/* Botão Novo Email */}
            <Button 
              onClick={() => setShowComposeEmail(true)}
              className="w-full h-10 gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo E-mail
            </Button>
            
            {/* Pastas Unificadas */}
            <div className="bg-white dark:bg-muted/30 rounded-xl border border-border/40 p-1.5">
              <div className="flex flex-wrap gap-1">
                {[
                  { value: 'inbox', label: 'Entrada', icon: Inbox },
                  { value: 'starred', label: 'Favoritos', icon: Star },
                  { value: 'sent', label: 'Enviados', icon: Send },
                  { value: 'drafts', label: 'Rascunhos', icon: FileText },
                  { value: 'archive', label: 'Arquivo', icon: Archive },
                  { value: 'trash', label: 'Lixeira', icon: Trash2 },
                ].map((folder) => (
                  <button
                    key={folder.value}
                    onClick={() => setEmailFolder(folder.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 min-w-[calc(33%-4px)] justify-center",
                      emailFolder === folder.value
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600"
                    )}
                  >
                    <folder.icon className="w-3.5 h-3.5" />
                    <span className="truncate">{folder.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Busca e Filtro */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar e-mails..."
                  className="pl-10 h-9 rounded-lg text-sm bg-white dark:bg-muted/30 border-border/40"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefreshEmails}
                className="h-9 w-9 p-0 rounded-lg border-orange-200 hover:bg-orange-50"
              >
                <RefreshCw className="w-4 h-4 text-orange-600" />
              </Button>
            </div>
          </div>
        )}

        {activeTab === "orcamento" && (
          <div className="flex gap-2">
            <Select value={orcamentosStatusFilter || "all"} onValueChange={(value) => setOrcamentosStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="flex-1 h-10 bg-white/70 rounded-xl">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="orcamento">Orçamento</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
                <SelectItem value="aprovacao_gerencia">Aprovação Gerência</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              onClick={() => onNovoOrcamentoClick?.()}
              className="h-10 px-3 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
            <GlobalClientFilter activeFilter={globalFilter} onFilterChange={setGlobalFilter} compact />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {activeTab === "chat" && filteredConversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setSelectedConversation(conv.id)}
            className={`px-3 py-3 rounded-xl cursor-pointer transition-all ${
              selectedConversation === conv.id 
                ? "bg-primary/10 border border-primary/30" 
                : "bg-white/60 hover:bg-white border border-transparent"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                selectedConversation === conv.id ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-slate-100 to-slate-200"
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-sm truncate">{conv.customer?.nome || "Cliente"}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {conv.lastMessage?.created_at ? getTimeAgo(conv.lastMessage.created_at) : getTimeAgo(conv.updated_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage?.text || "Sem mensagens"}</p>
              </div>
            </div>
          </div>
        ))}

        {activeTab === "agenda" && filteredTasks.map((task) => {
          const isLinkedToUser = task.contact_id && customerVinculos.linkedToUser.has(task.contact_id);
          const isSameSegment = task.contact_id && !isLinkedToUser && 
            customerVinculos.customerSegments[task.contact_id]?.some(seg => customerVinculos.userSegments.has(seg));
          
          return (
          <div
            key={task.id}
            onClick={() => {
              const taskIndex = filteredTasks.findIndex(t => t.id === task.id);
              setFluxoInitialIndex(taskIndex >= 0 ? taskIndex : 0);
              setAgendaViewMode('fluxo');
            }}
            className={`relative rounded-xl cursor-pointer transition-all overflow-hidden ${
              selectedTaskId === task.id
                ? "bg-orange-100 border border-orange-200"
                : "bg-white/60 hover:bg-white border border-transparent"
            }`}
          >
            {/* Tarja lateral indicando vínculo */}
            {(isLinkedToUser || isSameSegment) && (
              <div 
                className={`absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center rounded-l-xl ${
                  isLinkedToUser ? 'bg-primary' : 'bg-blue-500'
                }`}
              >
                <span className="text-[8px] font-semibold text-white whitespace-nowrap transform -rotate-90">
                  {isLinkedToUser ? 'Meu Cliente' : 'Mesmo Seg.'}
                </span>
              </div>
            )}
            
            <div className={`flex items-start gap-3 p-3 ${(isLinkedToUser || isSameSegment) ? 'pl-7' : 'pl-4'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{task.contact_name}</p>
                <p className="text-xs text-muted-foreground truncate">{task.title}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {task.time && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-0">
                      <Clock className="w-2.5 h-2.5 mr-0.5" />
                      {task.time}
                    </Badge>
                  )}
                  {/* Stacked indicators in top-right corner */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-center">
                    {task.diasAtraso > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm cursor-default">
                              {task.diasAtraso}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{task.diasAtraso} {task.diasAtraso === 1 ? 'dia' : 'dias'} atrasado</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {(() => {
                      const customerEmail = task.customers?.email?.toLowerCase();
                      const unreadEmailCount = customerEmail ? (emailsNaoLidosPerEmail[customerEmail] || 0) : 0;
                      if (unreadEmailCount > 0) {
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('email');
                                  }}
                                  className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors"
                                >
                                  {unreadEmailCount}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{unreadEmailCount} email{unreadEmailCount > 1 ? 's' : ''} não lido{unreadEmailCount > 1 ? 's' : ''}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      }
                      return null;
                    })()}
                    {(() => {
                      const customerPhone = normalizePhone(task.customers?.telefone);
                      const unreadChatsCount = customerPhone ? (chatsNaoLidosPerPhone[customerPhone] || 0) : 0;
                      if (unreadChatsCount > 0) {
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('chat');
                                  }}
                                  className="bg-purple-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm hover:bg-purple-600 transition-colors"
                                >
                                  {unreadChatsCount}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{unreadChatsCount} chat{unreadChatsCount > 1 ? 's' : ''} pendente{unreadChatsCount > 1 ? 's' : ''}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {(() => {
                    // Check for open budgets: by cliente_id, by empresa_id directly, OR by empresa_id through customer_empresas
                    const customerBudgetCount = task.contact_id ? (orcamentosAbertosPerCustomer[task.contact_id] || 0) : 0;
                    // Also check if contact_id IS an empresa_id directly
                    const directEmpresaBudgetCount = task.contact_id ? (orcamentosAbertosPerEmpresa[task.contact_id] || 0) : 0;
                    const empresaIds = task.customers?.customer_empresas?.map((ce: any) => ce.empresa_id || ce.empresas?.id).filter(Boolean) || [];
                    const empresaBudgetCount = empresaIds.reduce((acc: number, empId: string) => acc + (orcamentosAbertosPerEmpresa[empId] || 0), 0);
                    const totalBudgetCount = customerBudgetCount + directEmpresaBudgetCount + empresaBudgetCount;
                    
                    if (totalBudgetCount > 0) {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const firstOrcamento = orcamentos.find(o => 
                              o.status !== 'cancelado' && 
                              o.status !== 'ganho' &&
                              (o.cliente_id === task.contact_id || o.empresa_id === task.contact_id || empresaIds.includes(o.empresa_id))
                            );
                            if (firstOrcamento) {
                              setActiveTab('orcamento');
                              setSelectedOrcamentoId(firstOrcamento.id);
                              setOrcamentoSheetOpen(true);
                            }
                          }}
                          className="relative text-[10px] text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center font-medium transition-colors"
                        >
                          <FileText className="w-2.5 h-2.5 mr-0.5" />
                          Orç.
                          {totalBudgetCount > 1 && (
                            <span className="ml-0.5 bg-emerald-500 text-white text-[8px] px-1 py-0.5 rounded-full min-w-[14px] text-center">
                              {totalBudgetCount}
                            </span>
                          )}
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        );})}

        {activeTab === "email" && filteredEmails.map((email) => (
          <div
            key={email.id}
            onClick={() => setSelectedEmailId(email.id)}
            className={`p-3 rounded-xl cursor-pointer transition-all ${
            selectedEmailId === email.id
              ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800"
              : "bg-white/60 dark:bg-card/60 hover:bg-white dark:hover:bg-card border border-transparent"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              !email.read ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 text-primary"
            }`}>
                {email.read ? <MailOpen className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${!email.read ? 'font-bold' : 'font-medium text-muted-foreground'}`}>
                  {email.from_email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
              </div>
            </div>
          </div>
        ))}

        {activeTab === "orcamento" && filteredOrcamentos
          .filter(o => o.status !== 'cancelado' && o.status !== 'ganho')
          .filter(o => !orcamentosStatusFilter || o.etapa === orcamentosStatusFilter)
          .map((orc) => (
            <div
              key={orc.id}
              onClick={() => setSelectedOrcamentoId(orc.id)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                selectedOrcamentoId === orc.id
                  ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800"
                  : "bg-white/60 dark:bg-background/60 hover:bg-white dark:hover:bg-background border border-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedOrcamentoId === orc.id ? "bg-orange-500 text-white" : "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 text-orange-600 dark:text-orange-400"
                }`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {orc.customers?.nome || orc.empresas?.nome_fantasia || 'Cliente'}
                  </p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orc.valor_total || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Footer - Status do Atendente - Apenas no Chat */}
      {atendente && activeTab === "chat" && (
        <div className="border-t bg-gradient-to-r from-slate-50 to-white p-3 flex-shrink-0">
          <AtendenteStatusSelector
            atendenteId={atendente.id}
            currentStatus={atendente.status}
            onStatusChange={() => loadAtendente(usuarioId)}
          />
        </div>
      )}
    </div>
  );
}

interface MobileMainContentProps {
  activeTab: string;
  selectedConversation: string | null;
  selectedConv: any;
  messages: any[];
  isRealTimeTranslationActive: boolean;
  messageTranslations: Record<string, string>;
  handleSendMessage: (content: string, contentType: "text" | "image" | "file" | "audio" | "variable", fileUrl?: string, fileName?: string, variables?: Record<string, string>) => void;
  lastUserMessage: string | null;
  availableBots: any[];
  selectedBotRedirect: string | null;
  setSelectedBotRedirect: (id: string | null) => void;
  handleRedirectToBot: () => void;
  webhooksForAutoResponse: any[];
  selectedWebhookAutoResponse: string | null;
  setSelectedWebhookAutoResponse: (id: string | null) => void;
  webhookAutoResponseActive: boolean;
  handleToggleWebhookAutoResponse: () => void;
  conversations: any[];
  availableUsers: any[];
  selectedTransferUser: string | null;
  setSelectedTransferUser: (id: string | null) => void;
  handleTransferToUser: () => void;
  showAIChat: boolean;
  setShowAIChat: (show: boolean) => void;
  aiWebhooks: any[];
  handleToggleRealTimeTranslation: () => void;
  translationLanguage: string;
  setTranslationLanguage: (lang: string) => void;
  triggerTool: any;
  setTriggerTool: (tool: any) => void;
  showSummaryPanel: boolean;
  conversationSummary: string | null;
  isSummaryLoading: boolean;
  setShowSummaryPanel: (show: boolean) => void;
  setConversationSummary: (summary: string | null) => void;
  setSummaryGeneratedAt: (date: Date | null) => void;
  summaryGeneratedAt: Date | null;
  setIsSummaryLoading: (loading: boolean) => void;
  copyMessageToAI: (text: string) => void;
  handleReactivateBot: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  selectedTaskData: any;
  selectedEmailData: any;
  orcamentoSheetOpen: boolean;
  selectedOrcamentoId: string | null;
  estabelecimentoId: string;
  setOrcamentoSheetOpen: (open: boolean) => void;
  initialEmpresaForOrcamento?: string | null;
  onOrcamentoClose?: () => void;
  onReply?: (email: any) => void;
  onForward?: (email: any) => void;
}

function MobileMainContent({
  activeTab,
  selectedConversation,
  selectedConv,
  messages,
  isRealTimeTranslationActive,
  messageTranslations,
  handleSendMessage,
  lastUserMessage,
  availableBots,
  selectedBotRedirect,
  setSelectedBotRedirect,
  handleRedirectToBot,
  webhooksForAutoResponse,
  selectedWebhookAutoResponse,
  setSelectedWebhookAutoResponse,
  webhookAutoResponseActive,
  handleToggleWebhookAutoResponse,
  conversations,
  availableUsers,
  selectedTransferUser,
  setSelectedTransferUser,
  handleTransferToUser,
  showAIChat,
  setShowAIChat,
  aiWebhooks,
  handleToggleRealTimeTranslation,
  translationLanguage,
  setTranslationLanguage,
  triggerTool,
  setTriggerTool,
  showSummaryPanel,
  conversationSummary,
  isSummaryLoading,
  setShowSummaryPanel,
  setConversationSummary,
  setSummaryGeneratedAt,
  summaryGeneratedAt,
  setIsSummaryLoading,
  copyMessageToAI,
  handleReactivateBot,
  messagesEndRef,
  selectedTaskData,
  selectedEmailData,
  orcamentoSheetOpen,
  selectedOrcamentoId,
  estabelecimentoId,
  setOrcamentoSheetOpen,
  initialEmpresaForOrcamento,
  onOrcamentoClose,
  onReply,
  onForward,
}: MobileMainContentProps) {
  // Chat content
  if (activeTab === "chat" && selectedConversation && selectedConv) {
    return (
      <div className="h-full flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-200">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender !== "agent" && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                  msg.sender === "agent"
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
                    : "bg-card border border-border"
                }`}>
                  <p className="text-[13px] whitespace-pre-wrap break-words">{msg.text}</p>
                  <span className={`text-[10px] mt-1 block ${msg.sender === "agent" ? "text-white/70" : "text-muted-foreground"}`}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {msg.sender === "agent" && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t bg-card p-3 pb-safe">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={false}
            lastUserMessage={lastUserMessage}
            onSuggestionGenerated={(suggestion) => console.log("Suggestion:", suggestion)}
            availableBots={availableBots}
            selectedBotRedirect={selectedBotRedirect}
            onBotRedirectChange={setSelectedBotRedirect}
            onBotRedirect={handleRedirectToBot}
            webhooksForAutoResponse={webhooksForAutoResponse}
            selectedWebhookAutoResponse={selectedWebhookAutoResponse}
            onWebhookChange={setSelectedWebhookAutoResponse}
            webhookAutoResponseActive={webhookAutoResponseActive}
            onWebhookToggle={handleToggleWebhookAutoResponse}
            botVariables={selectedConversation ? conversations.find(c => c.id === selectedConversation)?.metadata?.vars || {} : {}}
            availableUsers={availableUsers}
            selectedTransferUser={selectedTransferUser}
            onTransferUserChange={setSelectedTransferUser}
            onTransferUser={handleTransferToUser}
            showAIChat={showAIChat}
            onToggleAIChat={() => setShowAIChat(!showAIChat)}
            aiWebhooks={aiWebhooks}
            conversationId={selectedConversation || undefined}
            conversationMessages={messages}
            onSummaryGenerated={(summary) => {
              if (summary === "") {
                setShowSummaryPanel(true);
                setIsSummaryLoading(true);
                setConversationSummary(null);
              } else {
                setConversationSummary(summary);
                setSummaryGeneratedAt(new Date());
                setIsSummaryLoading(false);
                setShowSummaryPanel(true);
              }
            }}
            isRealTimeTranslationActive={isRealTimeTranslationActive}
            onToggleRealTimeTranslation={handleToggleRealTimeTranslation}
            translationLanguage={translationLanguage}
            onTranslationLanguageChange={setTranslationLanguage}
            triggerTool={triggerTool}
            onToolTriggered={() => setTriggerTool(null)}
            customerPhone={selectedConv?.customer?.telefone}
            customerName={selectedConv?.customer?.nome}
            customerId={selectedConv?.customer?.id}
          />
        </div>
      </div>
    );
  }

  // Agenda content
  if (activeTab === "agenda" && selectedTaskData) {
    return (
      <div className="h-full flex flex-col bg-card p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold">{selectedTaskData.title}</h3>
              <p className="text-sm text-muted-foreground">{selectedTaskData.contact_name}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>Data:</strong> {format(new Date(selectedTaskData.date), "dd/MM/yyyy", { locale: ptBR })}</p>
            {selectedTaskData.time && <p><strong>Horário:</strong> {selectedTaskData.time}</p>}
            {selectedTaskData.description && <p><strong>Descrição:</strong> {selectedTaskData.description}</p>}
            <p><strong>Status:</strong> <Badge>{selectedTaskData.status}</Badge></p>
          </div>
        </div>
      </div>
    );
  }

  // Email content
  if (activeTab === "email" && selectedEmailData) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
        {/* Header do Email */}
        <div className="p-4 bg-white/80 dark:bg-card/80 backdrop-blur-sm border-b border-orange-100 dark:border-orange-900/30">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              !selectedEmailData.read 
                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" 
                : "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 text-primary"
            }`}>
              {selectedEmailData.read ? <MailOpen className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight line-clamp-2">{selectedEmailData.subject}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground truncate">De: {selectedEmailData.from_email}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 dark:bg-orange-900/30 text-primary border-orange-200 dark:border-orange-800">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  {format(new Date(selectedEmailData.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Badge>
                {selectedEmailData.starred && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Corpo do Email */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-orange-100/50 dark:border-orange-900/30 p-4">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-foreground
                  prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary
                  prose-strong:text-foreground prose-li:text-muted-foreground" 
                dangerouslySetInnerHTML={{ __html: selectedEmailData.body }} 
              />
            </div>
          </div>
        </div>

        {/* Ações do Email */}
        <div className="p-3 bg-white/80 dark:bg-card/80 backdrop-blur-sm border-t border-blue-100 dark:border-blue-900/30 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-9 rounded-lg text-xs gap-1.5 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            onClick={() => onReply?.(selectedEmailData)}
          >
            <Reply className="w-3.5 h-3.5" />
            Responder
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-9 rounded-lg text-xs gap-1.5 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            onClick={() => onForward?.(selectedEmailData)}
          >
            <Forward className="w-3.5 h-3.5" />
            Encaminhar
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30">
            <Archive className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Orçamento content
  if (activeTab === "orcamento" && orcamentoSheetOpen && estabelecimentoId) {
    return (
      <div className="h-full bg-gray-100">
        <POSView 
          estabelecimentoId={estabelecimentoId} 
          orcamentoId={selectedOrcamentoId || undefined}
          onClose={onOrcamentoClose}
          showClientDetails={false}
          onToggleClientDetails={() => {}}
          showPanelToggle={false}
          onTogglePanel={() => {}}
          initialEmpresaId={!selectedOrcamentoId ? initialEmpresaForOrcamento : null}
        />
      </div>
    );
  }

  // Empty state
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/20">
      <div className="text-center">
        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
        <p className="text-lg font-medium mb-2">Selecione um item</p>
        <p className="text-sm">Escolha um item da lista</p>
      </div>
    </div>
  );
}
