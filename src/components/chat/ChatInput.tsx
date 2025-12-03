import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Image, Paperclip, Variable, Zap, Bot, Webhook, UserPlus, Sparkles, FileText, FileSpreadsheet, MessageSquareText, BookOpen, Languages, FileCheck, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import AudioRecorder from "./AudioRecorder";
import FileUploader from "./FileUploader";
import VariableSequence from "./VariableSequence";
import EmojiPicker from "./EmojiPicker";
import QuickRepliesSelector from "./QuickRepliesSelector";
import QuickAttachmentsSelector from "./QuickAttachmentsSelector";
import { Message } from "@/pages/ChatWebhook";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

// Elegant toolbar button styles
const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

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
  onTranslationLanguageChange
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
  
  // Agent Assist states
  const [isGeneratingContextResponse, setIsGeneratingContextResponse] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSuggestingKBArticles, setIsSuggestingKBArticles] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslatePopover, setShowTranslatePopover] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("en");
  
  // Auto-resize textarea to avoid inner scrollbars
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    if (showToolsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showToolsMenu]);
  
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

  const handleFileSelected = (file: File, fileUrl: string) => {
    onSendMessage(`Arquivo: ${file.name}`, "file", fileUrl, file.name);
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

  // Simple Toolbar Button Component
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
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={isActive ? toolbarBtnActiveClass : toolbarBtnClass}
    >
      {isLoading ? (
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon size={20} />
      )}
    </button>
  );

  // Simple Popover Trigger Button
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
    <button
      disabled={disabled}
      title={title}
      className={isOpen ? toolbarBtnActiveClass : toolbarBtnClass}
    >
      <Icon size={20} />
    </button>
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
      const response = await supabase.functions.invoke("ai-agent-assist", {
        body: { action: "suggest_response", conversationId, messages: conversationMessages.slice(-10) }
      });
      if (response.error) throw response.error;
      const suggestion = response.data?.suggestion || response.data?.response;
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
      const response = await supabase.functions.invoke("ai-agent-assist", {
        body: { action: "summarize", conversationId, messages: conversationMessages }
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
      const response = await supabase.functions.invoke("ai-agent-assist", {
        body: { action: "kb_articles", conversationId, messages: conversationMessages.slice(-5) }
      });
      if (response.error) throw response.error;
      const articles = response.data?.articles;
      if (articles && articles.length > 0) {
        const articleText = articles.map((a: any) => `• ${a.title}`).join("\n");
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
      const response = await supabase.functions.invoke("ai-agent-assist", {
        body: { action: "translate", text: message, targetLanguage }
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
      setShowToolsMenu(false);
    }
  };

  // Handle import report selection
  const handleImportReportSelect = async (reportId: string, fileType: 'pdf' | 'excel') => {
    setSelectedImportReport(reportId);
    setReportFileType(fileType);
    setIsProcessingReport(true);
    setReportProgress(0);
    
    const interval = setInterval(() => {
      setReportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setReportProgress(100);
      const report = importReports.find(r => r.id === reportId);
      if (report) {
        onSendMessage(`Relatório: ${report.nome}`, "file", report.url_arquivo, report.nome);
      }
      setIsProcessingReport(false);
      setShowImportReportsPopover(false);
      setShowToolsMenu(false);
    }, 2000);
  };

  // Build toolbar items - separated into general and chat-specific
  const generalItems: React.ReactNode[] = [];
  const chatItems: React.ReactNode[] = [];

  // === GENERAL ITEMS (always visible) ===
  generalItems.push(
    <ToolbarBtn key="image" icon={Image} title="Imagem" onClick={() => { imageInputRef.current?.click(); setShowToolsMenu(false); }} disabled={disabled} />
  );
  generalItems.push(
    <ToolbarBtn key="file" icon={Paperclip} title="Arquivo" onClick={() => { fileInputRef.current?.click(); setShowToolsMenu(false); }} disabled={disabled} />
  );
  generalItems.push(
    <ToolbarBtn key="variables" icon={Variable} title="Variáveis" onClick={() => { setShowVariables(true); setShowToolsMenu(false); }} disabled={disabled} />
  );
  generalItems.push(
    <QuickRepliesSelector key="quick-replies" onSelect={(content) => { handleQuickReplySelect(content); setShowToolsMenu(false); }} disabled={disabled} />
  );
  generalItems.push(
    <QuickAttachmentsSelector key="quick-attachments" onSelect={(attachment) => { handleQuickAttachmentSelect(attachment); setShowToolsMenu(false); }} disabled={disabled} />
  );

  // Translate (general)
  generalItems.push(
    <Popover key="translate" open={showTranslatePopover} onOpenChange={setShowTranslatePopover}>
      <PopoverTrigger asChild>
        <button className={isTranslating ? toolbarBtnActiveClass : toolbarBtnClass} title="Traduzir" disabled={disabled}>
          {isTranslating ? <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Languages size={18} />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 rounded-xl shadow-xl border-border/50" align="start" sideOffset={8}>
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
  );

  // === CHAT-SPECIFIC ITEMS (only when in chat) ===
  // Bot redirect
  if (availableBots.length > 0 && onBotRedirectChange && onBotRedirect) {
    chatItems.push(
      <Popover key="bot" open={showBotPopover} onOpenChange={setShowBotPopover}>
        <PopoverTrigger asChild>
          <button className={showBotPopover ? toolbarBtnActiveClass : toolbarBtnClass} title="Redirecionar para Bot">
            <Bot size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-border/50" align="start" sideOffset={8}>
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
    );
  }

  // Webhook auto-response
  if (webhooksForAutoResponse.length > 0 && onWebhookChange && onWebhookToggle) {
    chatItems.push(
      <Popover key="webhook" open={showWebhookPopover} onOpenChange={setShowWebhookPopover}>
        <PopoverTrigger asChild>
          <button className={webhookAutoResponseActive ? toolbarBtnActiveClass : toolbarBtnClass} title="Resposta Automática">
            <Webhook size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-border/50" align="start" sideOffset={8}>
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
    );
  }

  // Transfer to user
  if (availableUsers.length > 0 && onTransferUserChange && onTransferUser) {
    chatItems.push(
      <Popover key="transfer" open={showTransferPopover} onOpenChange={setShowTransferPopover}>
        <PopoverTrigger asChild>
          <button className={showTransferPopover ? toolbarBtnActiveClass : toolbarBtnClass} title="Transferir para Usuário">
            <UserPlus size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-border/50" align="start" sideOffset={8}>
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
    );
  }

  // AI Chat toggle
  if (onToggleAIChat) {
    chatItems.push(
      <ToolbarBtn key="ai-chat" icon={Sparkles} title="Chat IA" onClick={() => { onToggleAIChat(); setShowToolsMenu(false); }} isActive={showAIChat} disabled={disabled} />
    );
  }

  // Import reports
  if (importReports.length > 0) {
    chatItems.push(
      <Popover key="reports" open={showImportReportsPopover} onOpenChange={setShowImportReportsPopover}>
        <PopoverTrigger asChild>
          <button className={showImportReportsPopover ? toolbarBtnActiveClass : toolbarBtnClass} title="Relatórios">
            <FileCheck size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 rounded-xl shadow-xl border-border/50" align="start" sideOffset={8}>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Relatórios Importados</Label>
            {isProcessingReport && <Progress value={reportProgress} className="h-2" />}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {importReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50">
                  <span className="text-sm truncate flex-1">{report.nome}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleImportReportSelect(report.id, 'pdf')} disabled={isProcessingReport}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleImportReportSelect(report.id, 'excel')} disabled={isProcessingReport}>
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Agent Assist - Context Response
  if (conversationId) {
    chatItems.push(
      <ToolbarBtn key="context" icon={Sparkles} title="Sugestão Contextual" onClick={handleGenerateContextResponse} isLoading={isGeneratingContextResponse} disabled={disabled || conversationMessages.length === 0} />
    );
  }

  // Agent Assist - Summary
  if (conversationId && onSummaryGenerated) {
    chatItems.push(
      <ToolbarBtn key="summary" icon={FileText} title="Gerar Resumo" onClick={handleGenerateSummary} isLoading={isGeneratingSummary} disabled={disabled || conversationMessages.length === 0} />
    );
  }

  // Agent Assist - KB Articles
  if (conversationId) {
    chatItems.push(
      <ToolbarBtn key="kb" icon={BookOpen} title="Artigos KB" onClick={handleSuggestKBArticles} isLoading={isSuggestingKBArticles} disabled={disabled || conversationMessages.length === 0} />
    );
  }

  // Real-time translation toggle
  if (onToggleRealTimeTranslation) {
    chatItems.push(
      <ToolbarBtn key="realtime-translate" icon={Languages} title="Tradução em Tempo Real" onClick={() => { onToggleRealTimeTranslation(); setShowToolsMenu(false); }} isActive={isRealTimeTranslationActive} disabled={disabled} />
    );
  }

  // Check if we have chat-specific items
  const hasChatItems = chatItems.length > 0;

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
      <div className="relative">
        {/* Expandable menu backdrop blur when open */}
        {showToolsMenu && (
          <div 
            className="fixed inset-0 bg-background/20 backdrop-blur-[2px] z-40"
            onClick={() => setShowToolsMenu(false)}
          />
        )}
        
        {/* Main input container */}
        <div className="relative z-50 bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl shadow-lg p-2">
          {/* Input row */}
          <div className="flex items-end gap-2">
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
            
            {/* Expandable Tools Menu - positioned to the RIGHT, expanding upward */}
            <div ref={menuRef} className="relative">
              {/* Chat-specific items ring (outer/top ring) - only when has chat items */}
              {hasChatItems && (
                <div 
                  className={cn(
                    "absolute bottom-full right-0 flex flex-col-reverse gap-1.5",
                    "transition-all duration-300 origin-bottom",
                    showToolsMenu ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                  )}
                  style={{
                    marginBottom: `${(generalItems.length * 42) + 12}px`
                  }}
                >
                  {/* Chat items label */}
                  <div 
                    className={cn(
                      "mb-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium text-center",
                      "transition-all duration-300",
                      showToolsMenu ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                      transitionDelay: showToolsMenu ? `${(chatItems.length + generalItems.length) * 30}ms` : '0ms'
                    }}
                  >
                    Chat
                  </div>
                  {chatItems.map((item, index) => (
                    <div 
                      key={`chat-${index}`}
                      className="transform transition-all duration-200"
                      style={{
                        transitionDelay: showToolsMenu ? `${(index + generalItems.length + 1) * 30}ms` : '0ms',
                        transform: showToolsMenu ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
                        opacity: showToolsMenu ? 1 : 0,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {/* General items ring (inner/bottom ring) */}
              <div 
                className={cn(
                  "absolute bottom-full right-0 mb-2 flex flex-col-reverse gap-1.5",
                  "transition-all duration-300 origin-bottom",
                  showToolsMenu ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}
              >
                {generalItems.map((item, index) => (
                  <div 
                    key={`general-${index}`}
                    className="transform transition-all duration-200"
                    style={{
                      transitionDelay: showToolsMenu ? `${index * 30}ms` : '0ms',
                      transform: showToolsMenu ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
                      opacity: showToolsMenu ? 1 : 0,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main trigger button */}
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
                title={showToolsMenu ? "Fechar menu" : "Abrir ferramentas"}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
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
