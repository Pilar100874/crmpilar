import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Image, Paperclip, Variable, Zap, Bot, Webhook, UserPlus, Sparkles, FileText, FileSpreadsheet, MessageSquareText, BookOpen, Languages, FileCheck, Plus, Target } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import AudioRecorder from "./AudioRecorder";
import FileUploader from "./FileUploader";
import VariableSequence from "./VariableSequence";
import EmojiPicker from "./EmojiPicker";
import QuickRepliesSelector from "./QuickRepliesSelector";
import QuickAttachmentsSelector from "./QuickAttachmentsSelector";
import OrcamentoAttachmentSelector from "./OrcamentoAttachmentSelector";
import CatalogAttachmentSelector from "./CatalogAttachmentSelector";
import AgendaTrackingTool from "./AgendaTrackingTool";
import { Message } from "@/pages/ChatWebhook";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

// Elegant toolbar button styles
const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

export type ChatToolTrigger = 
  | 'image' | 'file' | 'variables' | 'quick-replies' | 'quick-attachments' 
  | 'translate' | 'bot' | 'webhook' | 'transfer' | 'reports' | 'catalog'
  | 'context' | 'summary' | 'kb' | 'realtime-translate' | 'agenda-tracking' | null;

interface ChatInputProps {
  onSendMessage: (
    content: string,
    contentType: Message["contentType"],
    fileUrl?: string,
    fileName?: string,
    variables?: Record<string, string>
  ) => void;
  disabled?: boolean;
  lastUserMessage?: string | null;
  onSuggestionGenerated?: (suggestion: string) => void;
  // Bot redirect props
  availableBots?: any[];
  selectedBotRedirect?: string | null;
  onBotRedirectChange?: (botId: string) => void;
  onBotRedirect?: () => void;
  // Webhook props
  webhooksForAutoResponse?: any[];
  selectedWebhookAutoResponse?: string | null;
  onWebhookChange?: (webhookId: string) => void;
  webhookAutoResponseActive?: boolean;
  onWebhookToggle?: () => void;
  // Bot variables
  botVariables?: Record<string, any>;
  // Transfer to user props
  availableUsers?: any[];
  selectedTransferUser?: string | null;
  onTransferUserChange?: (userId: string) => void;
  onTransferUser?: () => void;
  // AI Chat props
  showAIChat?: boolean;
  onToggleAIChat?: () => void;
  aiWebhooks?: any[];
  // Agent Assist props
  conversationId?: string;
  conversationMessages?: any[];
  onSummaryGenerated?: (summary: string) => void;
  // Real-time translation props
  isRealTimeTranslationActive?: boolean;
  onToggleRealTimeTranslation?: () => void;
  translationLanguage?: string;
  onTranslationLanguageChange?: (language: string) => void;
  // External tool trigger
  triggerTool?: ChatToolTrigger;
  onToolTriggered?: () => void;
}

export default function ChatInput({ 
  onSendMessage, 
  disabled, 
  lastUserMessage, 
  onSuggestionGenerated,
  availableBots = [],
  selectedBotRedirect,
  onBotRedirectChange,
  onBotRedirect,
  webhooksForAutoResponse = [],
  selectedWebhookAutoResponse,
  onWebhookChange,
  webhookAutoResponseActive = false,
  onWebhookToggle,
  botVariables = {},
  availableUsers = [],
  selectedTransferUser,
  onTransferUserChange,
  onTransferUser,
  showAIChat = false,
  onToggleAIChat,
  aiWebhooks = [],
  onSummaryGenerated,
  conversationId,
  conversationMessages = [],
  isRealTimeTranslationActive = false,
  onToggleRealTimeTranslation,
  translationLanguage = "pt",
  onTranslationLanguageChange,
  triggerTool,
  onToolTriggered
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [quickReplies, setQuickReplies] = useState<Array<{content: string, shortcut: string}>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBotPopover, setShowBotPopover] = useState(false);
  const [showWebhookPopover, setShowWebhookPopover] = useState(false);
  const [showTransferPopover, setShowTransferPopover] = useState(false);
  const [showImportReportsPopover, setShowImportReportsPopover] = useState(false);
  const [importReports, setImportReports] = useState<any[]>([]);
  const [selectedImportReport, setSelectedImportReport] = useState<string | null>(null);
  const [reportFileType, setReportFileType] = useState<'pdf' | 'excel' | null>(null);
  const [reportProgress, setReportProgress] = useState<number>(0);
  const [isProcessingReport, setIsProcessingReport] = useState(false);
  
  // Catalog trigger state
  const [showCatalogPopover, setShowCatalogPopover] = useState(false);
  
  // Agenda tracking state
  const [showAgendaTrackingPopover, setShowAgendaTrackingPopover] = useState(false);
  
  // Agent Assist states
  const [isGeneratingContextResponse, setIsGeneratingContextResponse] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSuggestingKBArticles, setIsSuggestingKBArticles] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslatePopover, setShowTranslatePopover] = useState(false);
  const [showRealTimeTranslatePopover, setShowRealTimeTranslatePopover] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("en");
  
  // Auto-resize textarea to avoid inner scrollbars
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);

  // Close menus when clicking outside (but not on popover content)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking inside a popover content (rendered in portal)
      if (target.closest('[data-radix-popper-content-wrapper]') || 
          target.closest('[role="dialog"]') ||
          target.closest('[data-state="open"]')) {
        return;
      }
      
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowToolsMenu(false);
      }
    };
    if (showToolsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showToolsMenu]);

  // Handle external tool triggers
  useEffect(() => {
    if (!triggerTool) return;
    
    switch (triggerTool) {
      case 'image':
        imageInputRef.current?.click();
        break;
      case 'file':
        fileInputRef.current?.click();
        break;
      case 'variables':
        setShowVariables(true);
        break;
      case 'quick-replies':
        // The QuickRepliesSelector handles its own popover
        setShowToolsMenu(true);
        break;
      case 'quick-attachments':
        // The QuickAttachmentsSelector handles its own popover
        setShowToolsMenu(true);
        break;
      case 'translate':
        setShowTranslatePopover(true);
        break;
      case 'bot':
        setShowBotPopover(true);
        break;
      case 'webhook':
        setShowWebhookPopover(true);
        break;
      case 'transfer':
        setShowTransferPopover(true);
        break;
      case 'reports':
        setShowImportReportsPopover(true);
        break;
      case 'catalog':
        // Trigger the CatalogAttachmentSelector popover via state
        setShowCatalogPopover(true);
        break;
      case 'context':
        handleGenerateContextResponse();
        break;
      case 'summary':
        handleGenerateSummary();
        break;
      case 'kb':
        handleSuggestKBArticles();
        break;
      case 'realtime-translate':
        setShowRealTimeTranslatePopover(true);
        break;
      case 'agenda-tracking':
        setShowAgendaTrackingPopover(true);
        break;
    }
    
    onToolTriggered?.();
  }, [triggerTool]);
  
  // Auto-suggestion states
  const [autoSuggestionEnabled, setAutoSuggestionEnabled] = useState(false);
  const [autoResponseWebhooks, setAutoResponseWebhooks] = useState<any[]>([]);
  const [selectedAutoWebhook, setSelectedAutoWebhook] = useState<string | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const lastProcessedMessageRef = useRef<string | null>(null);

  useEffect(() => {
    loadQuickReplies();
    loadAutoResponseWebhooks();
    loadImportReports();
  }, []);

  const loadImportReports = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const hoje = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .or(`data_validade.is.null,data_validade.gte.${hoje}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setImportReports(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios de importação:", error);
    }
  };

  const loadQuickReplies = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const { data } = await supabase
      .from("quick_replies")
      .select("content, shortcut")
      .eq("estabelecimento_id", estabId)
      .not("shortcut", "is", null);
    
    if (data) {
      setQuickReplies(data);
    }
  };

  const loadAutoResponseWebhooks = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) {
      console.log("❌ Estabelecimento ID não encontrado");
      return;
    }

    console.log("🔍 Buscando webhooks de resposta automática para estabelecimento:", estabId);

    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("estabelecimento_id", estabId)
      .eq("active", true);

    if (error) {
      console.error("❌ Erro ao carregar webhooks de resposta automática:", error);
      return;
    }

    console.log("📋 Webhooks encontrados:", data);

    // Filtrar webhooks que contêm "resposta-automatica-chat" no array usage_locations
    const filtered = data?.filter(webhook => 
      Array.isArray(webhook.usage_locations) && 
      webhook.usage_locations.includes("resposta-automatica-chat")
    ) || [];

    console.log("✅ Webhooks filtrados para resposta automática:", filtered);

    if (filtered.length > 0) {
      setAutoResponseWebhooks(filtered);
      setSelectedAutoWebhook(filtered[0].id);
      console.log("✅ Webhook selecionado:", filtered[0].name);
    } else {
      console.log("⚠️ Nenhum webhook de resposta automática encontrado");
    }
  };

  // Auto-generate suggestion when user message arrives
  useEffect(() => {
    if (
      autoSuggestionEnabled &&
      selectedAutoWebhook &&
      lastUserMessage &&
      lastUserMessage !== lastProcessedMessageRef.current &&
      !isGeneratingSuggestion
    ) {
      lastProcessedMessageRef.current = lastUserMessage;
      generateAutoSuggestion(lastUserMessage);
    }
  }, [lastUserMessage, autoSuggestionEnabled, selectedAutoWebhook]);

  const generateAutoSuggestion = async (userMessage: string) => {
    if (!selectedAutoWebhook) return;

    setIsGeneratingSuggestion(true);
    
    try {
      const webhook = autoResponseWebhooks.find((w) => w.id === selectedAutoWebhook);
      if (!webhook) {
        toast.error("Webhook não encontrado");
        return;
      }

      // Call webhook to generate suggestion
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao chamar webhook: ${response.statusText}`);
      }

      const result = await response.json();
      const suggestion = result.suggestion || result.response || result.text || JSON.stringify(result);
      
      setMessage(suggestion);
      onSuggestionGenerated?.(suggestion);
      toast.success("Sugestão gerada automaticamente!");
      
    } catch (error) {
      console.error("Erro ao gerar sugestão:", error);
      toast.error("Erro ao gerar sugestão automática");
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message, "text");
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAudioRecorded = (audioBlob: Blob, audioUrl: string) => {
    onSendMessage("Áudio gravado", "audio", audioUrl, "audio.webm");
  };

  const handleImageSelected = (file: File, fileUrl: string) => {
    onSendMessage(`Imagem: ${file.name}`, "image", fileUrl, file.name);
  };

  const handleFileSelected = async (file: File, fileUrl: string) => {
    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error("Erro ao fazer upload:", uploadError);
        toast.error("Erro ao anexar arquivo");
        return;
      }

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        onSendMessage(`Arquivo: ${file.name}`, "file", urlData.publicUrl, file.name);
      } else {
        toast.error("Erro ao obter URL do arquivo");
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao anexar arquivo");
    }
  };

  const handleVariablesSubmit = (variables: Record<string, string>) => {
    const content = Object.entries(variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    onSendMessage(content, "variable", undefined, undefined, variables);
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.substring(0, start) + emoji + message.substring(end);
    
    setMessage(newMessage);
    
    // Restore cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleQuickReplySelect = (content: string) => {
    setMessage(content);
    textareaRef.current?.focus();
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // Check if any shortcut matches the end of the message
    for (const reply of quickReplies) {
      if (reply.shortcut && newMessage.endsWith(reply.shortcut)) {
        const beforeShortcut = newMessage.slice(0, -reply.shortcut.length);
        setMessage(beforeShortcut + reply.content);
        break;
      }
    }
  };

  const handleQuickAttachmentSelect = (attachment: any) => {
    console.log("📎 Anexo rápido selecionado:", attachment);
    
    // Determinar o contentType baseado no tipo do anexo
    let contentType: Message["contentType"] = "text";
    
    if (attachment.type === "file") {
      // Mapear file_type para contentType apropriado
      if (attachment.file_type === "image") {
        contentType = "image";
      } else if (attachment.file_type === "pdf" || attachment.file_type === "excel" || attachment.file_type === "word") {
        contentType = "file";
      } else {
        contentType = "file";
      }
    }
    
    console.log("📎 Content type determinado:", contentType);
    console.log("📎 URL do arquivo:", attachment.url);
    
    // Construir mensagem descritiva
    const messageText = attachment.type === "link" 
      ? attachment.title
      : `${attachment.title}`;
    
    console.log("📎 Enviando mensagem:", { messageText, contentType, url: attachment.url, title: attachment.title });
    
    onSendMessage(
      messageText,
      contentType,
      attachment.url,
      attachment.title
    );
  };

  // Simple Toolbar Button Component with animated tooltip
  const ToolbarBtn = ({ 
    icon: Icon, 
    title, 
    onClick, 
    disabled = false, 
    isActive = false, 
    isLoading = false 
  }: { 
    icon: React.ElementType;
    title: string;
    onClick?: () => void;
    disabled?: boolean;
    isActive?: boolean;
    isLoading?: boolean;
  }) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disabled}
            className={isActive ? toolbarBtnActiveClass : toolbarBtnClass}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon size={20} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Simple Popover Trigger Button with animated tooltip
  const PopoverBtn = ({ 
    icon: Icon, 
    title, 
    isOpen,
    disabled = false,
  }: { 
    icon: React.ElementType;
    title: string;
    isOpen: boolean;
    disabled?: boolean;
  }) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={disabled}
            className={isOpen ? toolbarBtnActiveClass : toolbarBtnClass}
          >
            <Icon size={20} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // File input handlers
  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      handleImageSelected(file, fileUrl);
      setShowToolsMenu(false);
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      handleFileSelected(file, fileUrl);
      setShowToolsMenu(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Agent Assist - Generate context-based response
  const handleGenerateContextResponse = async () => {
    if (!conversationId || conversationMessages.length === 0) {
      toast.error("Nenhuma mensagem para analisar");
      return;
    }
    setIsGeneratingContextResponse(true);
    try {
      const response = await supabase.functions.invoke("agent-assist-suggest-response", {
        body: { conversationId, messages: conversationMessages.slice(-10) }
      });
      if (response.error) throw response.error;
      const suggestion = response.data?.suggestion;
      if (suggestion) {
        setMessage(suggestion);
        toast.success("Sugestão gerada!");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao gerar sugestão");
    } finally {
      setIsGeneratingContextResponse(false);
      setShowToolsMenu(false);
    }
  };

  // Agent Assist - Generate summary
  const handleGenerateSummary = async () => {
    if (!conversationId || conversationMessages.length === 0) {
      toast.error("Nenhuma mensagem para resumir");
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const response = await supabase.functions.invoke("agent-assist-summarize", {
        body: { conversationId, messages: conversationMessages }
      });
      if (response.error) throw response.error;
      const summary = response.data?.summary;
      if (summary) {
        onSummaryGenerated?.(summary);
        toast.success("Resumo gerado!");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao gerar resumo");
    } finally {
      setIsGeneratingSummary(false);
      setShowToolsMenu(false);
    }
  };

  // Agent Assist - Suggest KB articles
  const handleSuggestKBArticles = async () => {
    if (!conversationId || conversationMessages.length === 0) {
      toast.error("Nenhuma mensagem para analisar");
      return;
    }
    setIsSuggestingKBArticles(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      const lastUserMessage = conversationMessages.filter(m => m.sender === 'customer').slice(-1)[0]?.text || '';
      const response = await supabase.functions.invoke("agent-assist-suggest-kb", {
        body: { conversationId, lastUserMessage, estabelecimentoId }
      });
      if (response.error) throw response.error;
      const articles = response.data?.articles;
      if (articles && articles.length > 0) {
        const articleText = articles.map((a: any) => `• ${a.titulo}`).join("\n");
        setMessage(articleText);
        toast.success("Artigos sugeridos!");
      } else {
        toast.info("Nenhum artigo relevante encontrado");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao buscar artigos");
    } finally {
      setIsSuggestingKBArticles(false);
      setShowToolsMenu(false);
    }
  };

  // Translate message
  const handleTranslateMessage = async () => {
    if (!message.trim()) {
      toast.error("Digite uma mensagem para traduzir");
      return;
    }
    setIsTranslating(true);
    try {
      const response = await supabase.functions.invoke("agent-assist-translate", {
        body: { text: message, targetLanguage }
      });
      if (response.error) throw response.error;
      const translation = response.data?.translation;
      if (translation) {
        setMessage(translation);
        toast.success("Traduzido!");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao traduzir");
    } finally {
      setIsTranslating(false);
      setShowTranslatePopover(false);
      setShowToolsMenu(false);
    }
  };

  // Handle import report selection - Gera PDF ou Excel dinamicamente
  const handleImportReportSelect = async (reportId: string, fileType: 'pdf' | 'excel') => {
    setSelectedImportReport(reportId);
    setReportFileType(fileType);
    setIsProcessingReport(true);
    setReportProgress(0);
    
    const report = importReports.find(r => r.id === reportId);
    if (!report) {
      toast.error("Relatório não encontrado");
      setIsProcessingReport(false);
      return;
    }

    try {
      setReportProgress(10);
      
      // Buscar modelo de relatório
      const estabelecimentoId = await getEstabelecimentoId();
      const { data: modelo } = await supabase
        .from("relatorios")
        .select("id, layout_json")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("nome", "Modelo para Produtos Importados")
        .maybeSingle();

      setReportProgress(20);

      // Buscar dados da API
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-produtos-importados?estabelecimento_id=${estabelecimentoId}&relatorio_id=${reportId}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }
      
      const data = await response.json();
      setReportProgress(40);
      
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
        setIsProcessingReport(false);
        return;
      }

      setReportProgress(50);

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

      setReportProgress(70);

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

      setReportProgress(90);

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

      setReportProgress(100);

      if (urlData?.publicUrl) {
        onSendMessage(`Relatório: ${report.nome}`, "file", urlData.publicUrl, fileName);
        toast.success("Relatório anexado!");
      }

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsProcessingReport(false);
      setShowImportReportsPopover(false);
      setShowToolsMenu(false);
    }
  };

  // Build toolbar items - ALL items appear in BOTH menus
  const allItems: React.ReactNode[] = [];

  // === BASIC TOOLS ===
  allItems.push(
    <ToolbarBtn key="image" icon={Image} title="Imagem" onClick={() => { imageInputRef.current?.click(); setShowToolsMenu(false); }} disabled={disabled} />
  );
  allItems.push(
    <ToolbarBtn key="file" icon={Paperclip} title="Arquivo" onClick={() => { fileInputRef.current?.click(); setShowToolsMenu(false); }} disabled={disabled} />
  );
  allItems.push(
    <ToolbarBtn key="variables" icon={Variable} title="Variáveis" onClick={() => { setShowVariables(true); setShowToolsMenu(false); }} disabled={disabled} />
  );
  allItems.push(
    <QuickRepliesSelector key="quick-replies" onSelect={(content) => { handleQuickReplySelect(content); setShowToolsMenu(false); }} disabled={disabled} />
  );
  allItems.push(
    <QuickAttachmentsSelector key="quick-attachments" onSelect={(attachment) => { handleQuickAttachmentSelect(attachment); setShowToolsMenu(false); }} disabled={disabled} />
  );
  allItems.push(
    <OrcamentoAttachmentSelector 
      key="orcamento-attachment" 
      onSelectLink={(link, title) => { 
        setMessage(prev => prev + (prev ? '\n' : '') + `${title}: ${link}`); 
        setShowToolsMenu(false); 
      }} 
      onSelectPdf={(file, url) => { 
        handleFileSelected(file, url); 
        setShowToolsMenu(false); 
      }} 
      disabled={disabled} 
    />
  );
  allItems.push(
    <CatalogAttachmentSelector 
      key="catalog-attachment" 
      externalOpen={showCatalogPopover}
      onExternalOpenChange={setShowCatalogPopover}
      onSelectPdf={(file, url) => { 
        handleFileSelected(file, url); 
        setShowToolsMenu(false);
        setShowCatalogPopover(false);
      }} 
      disabled={disabled} 
    />
  );

  // Agenda Tracking Tool (Rastreio com Agendamento)
  allItems.push(
    <AgendaTrackingTool
      key="agenda-tracking"
      externalOpen={showAgendaTrackingPopover}
      onExternalOpenChange={setShowAgendaTrackingPopover}
      onInsertLink={(url, text) => {
        // Enviar apenas a URL para ser clicável no WhatsApp, com texto opcional antes
        setMessage(prev => prev + (prev ? '\n' : '') + `${text}\n${url}`);
        setShowToolsMenu(false);
        setShowAgendaTrackingPopover(false);
      }}
      onClose={() => {
        setShowToolsMenu(false);
        setShowAgendaTrackingPopover(false);
      }}
      disabled={disabled}
    />
  );

  // Translate
  allItems.push(
    <TooltipProvider key="translate" delayDuration={200}>
      <Tooltip>
        <Popover open={showTranslatePopover} onOpenChange={setShowTranslatePopover}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button className={isTranslating ? toolbarBtnActiveClass : toolbarBtnClass} disabled={disabled}>
                {isTranslating ? <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Languages size={18} />}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <PopoverContent className="w-56 p-3 rounded-xl shadow-xl border-border/50 z-[9999]" align="start" sideOffset={8}>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Traduzir para</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="fr">Francês</SelectItem>
                  <SelectItem value="de">Alemão</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleTranslateMessage} disabled={!message.trim() || isTranslating} className="w-full">
                <Languages className="h-4 w-4 mr-2" /> Traduzir
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <TooltipContent><p>Traduzir</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // === CHAT/AI TOOLS ===
  // Bot redirect
  if (availableBots.length > 0 && onBotRedirectChange && onBotRedirect) {
    allItems.push(
      <TooltipProvider key="bot" delayDuration={200}>
        <Tooltip>
          <Popover open={showBotPopover} onOpenChange={setShowBotPopover}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className={showBotPopover ? toolbarBtnActiveClass : toolbarBtnClass}>
                  <Bot size={18} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-border/50 z-[9999]" align="start" sideOffset={8}>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Redirecionar para Bot</Label>
                <Select value={selectedBotRedirect || ""} onValueChange={onBotRedirectChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione um bot" /></SelectTrigger>
                  <SelectContent>
                    {availableBots.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => { onBotRedirect(); setShowBotPopover(false); setShowToolsMenu(false); }} disabled={!selectedBotRedirect} className="w-full">
                  <Zap className="h-4 w-4 mr-2" /> Redirecionar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <TooltipContent><p>Redirecionar para Bot</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Webhook auto-response
  if (webhooksForAutoResponse.length > 0 && onWebhookChange && onWebhookToggle) {
    allItems.push(
      <TooltipProvider key="webhook" delayDuration={200}>
        <Tooltip>
          <Popover open={showWebhookPopover} onOpenChange={setShowWebhookPopover}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className={webhookAutoResponseActive ? toolbarBtnActiveClass : toolbarBtnClass}>
                  <Webhook size={18} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-border/50 z-[9999]" align="start" sideOffset={8}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Resposta Automática</Label>
                  <Switch checked={webhookAutoResponseActive} onCheckedChange={onWebhookToggle} />
                </div>
                <Select value={selectedWebhookAutoResponse || ""} onValueChange={onWebhookChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione webhook" /></SelectTrigger>
                  <SelectContent>
                    {webhooksForAutoResponse.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          <TooltipContent><p>Resposta Automática</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Transfer to user
  if (availableUsers.length > 0 && onTransferUserChange && onTransferUser) {
    allItems.push(
      <TooltipProvider key="transfer" delayDuration={200}>
        <Tooltip>
          <Popover open={showTransferPopover} onOpenChange={setShowTransferPopover}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className={showTransferPopover ? toolbarBtnActiveClass : toolbarBtnClass}>
                  <UserPlus size={18} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-border/50 z-[9999]" align="start" sideOffset={8}>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Transferir para</Label>
                <Select value={selectedTransferUser || ""} onValueChange={onTransferUserChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => { onTransferUser(); setShowTransferPopover(false); setShowToolsMenu(false); }} disabled={!selectedTransferUser} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" /> Transferir
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <TooltipContent><p>Transferir para Usuário</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Import reports - always render to allow external trigger
  allItems.push(
    <TooltipProvider key="reports" delayDuration={200}>
      <Tooltip>
        <Popover open={showImportReportsPopover} onOpenChange={setShowImportReportsPopover}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button className={showImportReportsPopover ? toolbarBtnActiveClass : toolbarBtnClass}>
                <FileCheck size={18} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <PopoverContent className="w-72 p-3 rounded-xl shadow-xl border-border/50 bg-popover z-[9999]" align="start" sideOffset={8}>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Relatórios Importados</Label>
              {isProcessingReport && <Progress value={reportProgress} className="h-2" />}
              {importReports.length > 0 ? (
                <div className="space-y-3">
                  <Select 
                    value={selectedImportReport || ""} 
                    onValueChange={(value) => setSelectedImportReport(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha um relatório..." />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
                      {importReports.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          {report.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedImportReport && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleImportReportSelect(selectedImportReport, 'pdf')} 
                        disabled={isProcessingReport}
                      >
                        <FileText className="h-4 w-4 mr-2 text-red-500" />
                        PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleImportReportSelect(selectedImportReport, 'excel')} 
                        disabled={isProcessingReport}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Excel
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum relatório disponível</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <TooltipContent><p>Relatórios</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Agent Assist - Context Response (always show, will show toast if no messages)
  allItems.push(
    <ToolbarBtn key="context" icon={Sparkles} title="Sugestão Contextual" onClick={() => { handleGenerateContextResponse(); }} isLoading={isGeneratingContextResponse} disabled={disabled} />
  );

  // Agent Assist - Summary
  if (onSummaryGenerated) {
    allItems.push(
      <ToolbarBtn key="summary" icon={FileText} title="Gerar Resumo" onClick={() => { handleGenerateSummary(); }} isLoading={isGeneratingSummary} disabled={disabled} />
    );
  }

  // Agent Assist - KB Articles (always show, will show toast if no messages)
  allItems.push(
    <ToolbarBtn key="kb" icon={BookOpen} title="Artigos KB" onClick={() => { handleSuggestKBArticles(); }} isLoading={isSuggestingKBArticles} disabled={disabled} />
  );

  // Real-time translation with popover
  if (onToggleRealTimeTranslation && onTranslationLanguageChange) {
    allItems.push(
      <TooltipProvider key="realtime-translate" delayDuration={200}>
        <Tooltip>
          <Popover open={showRealTimeTranslatePopover} onOpenChange={setShowRealTimeTranslatePopover}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className={isRealTimeTranslationActive ? toolbarBtnActiveClass : toolbarBtnClass}>
                  <Languages size={18} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-border/50 z-[9999]" align="start" sideOffset={8}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Tradução em Tempo Real</Label>
                  <Switch 
                    checked={isRealTimeTranslationActive} 
                    onCheckedChange={() => {
                      onToggleRealTimeTranslation();
                    }} 
                  />
                </div>
                <Select value={translationLanguage} onValueChange={onTranslationLanguageChange}>
                  <SelectTrigger><SelectValue placeholder="Idioma de destino" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">Inglês</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                    <SelectItem value="fr">Francês</SelectItem>
                    <SelectItem value="de">Alemão</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isRealTimeTranslationActive 
                    ? "As mensagens do cliente serão traduzidas automaticamente" 
                    : "Ative para traduzir mensagens do cliente"}
                </p>
              </div>
            </PopoverContent>
          </Popover>
          <TooltipContent><p>Tradução em Tempo Real</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  
  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageInputChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {/* Main container with elegant styling */}
      <div className="relative overflow-visible">
        {/* Main input container */}
        <div className="relative z-[100] bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl shadow-lg p-2 overflow-visible">
          {/* Input row */}
          <div className="flex items-end gap-2 overflow-visible relative z-[100]">
            {/* Expandable Tools Menu - positioned to expand upward */}
            <div ref={menuRef} className="relative">
              {/* All items */}
              {showToolsMenu && (
                <div 
                  className="absolute bottom-full left-0 mb-2 flex flex-col-reverse gap-1.5 z-[9999]"
                >
                  {allItems.map((item, index) => (
                    <div 
                      key={`tool-${index}`}
                      className="transform transition-all duration-200 flex-shrink-0"
                      style={{
                        transitionDelay: `${index * 30}ms`,
                        animation: 'fadeInUp 0.2s ease-out forwards',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {/* Main trigger button */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className={cn(
                        "relative w-10 h-10 rounded-full cursor-pointer",
                        "bg-muted/50 hover:bg-muted",
                        "flex items-center justify-center",
                        "transition-all duration-300 ease-out",
                        "text-muted-foreground hover:text-foreground",
                        showToolsMenu && "bg-primary text-primary-foreground rotate-45 shadow-md"
                      )}
                      onClick={() => setShowToolsMenu(!showToolsMenu)}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{showToolsMenu ? "Fechar menu" : "Abrir ferramentas"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Emoji picker */}
            <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />
            
            {/* Text input - takes remaining space */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className={cn(
                  "min-h-[40px] max-h-[120px] resize-none",
                  "rounded-xl px-4 py-2.5",
                  "bg-background/60 border-0",
                  "focus:ring-1 focus:ring-primary/30",
                  "placeholder:text-muted-foreground/60",
                  "text-sm leading-relaxed"
                )}
                disabled={disabled}
              />
            </div>
            
            {/* Audio recorder */}
            <AudioRecorder onAudioRecorded={handleAudioRecorded} disabled={disabled} />
            
            {/* Send button */}
            <Button 
              onClick={handleSend} 
              disabled={!message.trim() || disabled} 
              size="icon"
              className={cn(
                "rounded-full h-10 w-10",
                "bg-primary hover:bg-primary/90",
                "shadow-md hover:shadow-lg",
                "transition-all duration-200",
                "disabled:opacity-40"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <VariableSequence
        open={showVariables}
        onOpenChange={setShowVariables}
        onSubmit={handleVariablesSubmit}
        botVariables={botVariables}
      />
    </>
  );
}
