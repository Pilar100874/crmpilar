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

// Simple circular toolbar button class - each with its own circle
const toolbarBtnClass = "h-10 w-10 rounded-full border border-border/50 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
const toolbarBtnActiveClass = "h-10 w-10 rounded-full border border-primary/50 bg-primary/10 flex items-center justify-center text-primary transition-colors shadow-sm";

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

  // Toolbar items for expandable menu
  const toolbarItems = [
    <ToolbarBtn key="image" icon={Image} title="Imagem" onClick={() => imageInputRef.current?.click()} disabled={disabled} />,
    <ToolbarBtn key="file" icon={Paperclip} title="Arquivo" onClick={() => fileInputRef.current?.click()} disabled={disabled} />,
    <ToolbarBtn key="variables" icon={Variable} title="Variáveis" onClick={() => { setShowVariables(true); setShowToolsMenu(false); }} disabled={disabled} />,
  ];

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
      
      <div className="flex flex-col gap-3">
        {/* Text Input Row with Expandable Menu (left), Emoji, Text Area (center), Audio & Send (right) */}
        <div className="flex items-end gap-2">
          {/* Expandable Tools Menu */}
          <div ref={menuRef} className="relative pb-1" style={{ height: 'auto' }}>
            <div className="relative">
              {/* Main trigger button */}
              <button 
                className={cn(
                  "relative w-10 h-10 rounded-full cursor-pointer z-50",
                  "bg-background border border-border/50 shadow-sm",
                  "flex items-center justify-center",
                  "transition-all duration-300",
                  showToolsMenu && "bg-primary text-primary-foreground border-primary rotate-45"
                )}
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                title={showToolsMenu ? "Fechar menu" : "Abrir ferramentas"}
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* Menu items - expand upward */}
              {toolbarItems.map((item, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "absolute left-0 w-10 h-10 rounded-full",
                    "bg-background border border-border/50 shadow-sm",
                    "flex items-center justify-center"
                  )}
                  style={{
                    transform: `translateY(${showToolsMenu ? -((index + 1) * 44) : 0}px)`,
                    opacity: showToolsMenu ? 1 : 0,
                    zIndex: 40 - index,
                    transition: `transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
                               opacity ${showToolsMenu ? '300ms' : '200ms'}`,
                    pointerEvents: showToolsMenu ? 'auto' : 'none',
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          
          <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />
          
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="min-h-[44px] max-h-[120px] resize-none rounded-full px-4"
            style={{ paddingTop: '12px', paddingBottom: '12px' }}
            disabled={disabled}
          />
          
          <AudioRecorder onAudioRecorded={handleAudioRecorded} disabled={disabled} />
          
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || disabled} 
            size="icon"
            className="rounded-full h-11 w-11"
          >
            <Send className="h-4 w-4" />
          </Button>
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
