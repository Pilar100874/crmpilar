import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Image, Paperclip, Variable, Zap, Bot, Webhook, UserPlus, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AudioRecorder from "./AudioRecorder";
import FileUploader from "./FileUploader";
import VariableSequence from "./VariableSequence";
import EmojiPicker from "./EmojiPicker";
import QuickRepliesSelector from "./QuickRepliesSelector";
import QuickAttachmentsSelector from "./QuickAttachmentsSelector";
import { Message } from "@/pages/ChatWebhook";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";

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
  aiWebhooks = []
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [quickReplies, setQuickReplies] = useState<Array<{content: string, shortcut: string}>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showBotPopover, setShowBotPopover] = useState(false);
  const [showWebhookPopover, setShowWebhookPopover] = useState(false);
  const [showTransferPopover, setShowTransferPopover] = useState(false);
  
  // Auto-resize textarea to avoid inner scrollbars
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);
  
  // Auto-suggestion states
  const [autoSuggestionEnabled, setAutoSuggestionEnabled] = useState(false);
  const [autoResponseWebhooks, setAutoResponseWebhooks] = useState<any[]>([]);
  const [selectedAutoWebhook, setSelectedAutoWebhook] = useState<string | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const lastProcessedMessageRef = useRef<string | null>(null);

  useEffect(() => {
    loadQuickReplies();
    loadAutoResponseWebhooks();
  }, []);

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

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Action Buttons Row */}
        <div className="flex gap-1.5 items-center flex-wrap justify-center">
          <QuickRepliesSelector onSelect={handleQuickReplySelect} disabled={disabled} />
          
          <QuickAttachmentsSelector onSelect={handleQuickAttachmentSelect} disabled={disabled} />
          
          <FileUploader
            accept="image/*"
            onFileSelected={handleImageSelected}
            disabled={disabled}
            icon={<Image className="h-4 w-4" />}
            tooltip="Enviar imagem"
          />
          
          <FileUploader
            accept="*/*"
            onFileSelected={handleFileSelected}
            disabled={disabled}
            icon={<Paperclip className="h-4 w-4" />}
            tooltip="Enviar arquivo"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowVariables(true)}
            disabled={disabled}
            title="Enviar variáveis"
            className="rounded-full"
          >
            <Variable className="h-4 w-4" />
          </Button>

          {/* Bot Redirect Popover */}
          {availableBots.length > 0 && (
            <Popover open={showBotPopover} onOpenChange={setShowBotPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  title="Direcionar para bot"
                  disabled={disabled}
                  className="rounded-full"
                >
                  <Bot className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
                <PopoverContent className="w-80 z-50" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-semibold">Direcionar para bot</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Selecione o bot</Label>
                      <Select
                        value={selectedBotRedirect || ""}
                        onValueChange={onBotRedirectChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um bot" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          {availableBots.map((bot) => (
                            <SelectItem key={bot.id} value={bot.id}>
                              {bot.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => {
                        onBotRedirect?.();
                        setShowBotPopover(false);
                      }}
                      disabled={!selectedBotRedirect}
                      className="w-full"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      Direcionar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
          {/* Webhook Auto-Response */}
          {webhooksForAutoResponse.length > 0 && (
            <>
              <Popover open={showWebhookPopover} onOpenChange={setShowWebhookPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Selecionar webhook"
                    disabled={disabled}
                    className="rounded-full"
                  >
                    <Webhook className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                  <PopoverContent className="w-80 z-50" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <Webhook className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-semibold">Resposta automática via webhook</Label>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Selecione o webhook</Label>
                        <Select
                          value={selectedWebhookAutoResponse || ""}
                          onValueChange={onWebhookChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione um webhook" />
                          </SelectTrigger>
                          <SelectContent className="z-50">
                            {webhooksForAutoResponse.map((webhook) => (
                              <SelectItem key={webhook.id} value={webhook.id}>
                                {webhook.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              
              <Button
                variant={webhookAutoResponseActive ? "default" : "outline"}
                size="icon"
                onClick={onWebhookToggle}
                disabled={!selectedWebhookAutoResponse || disabled}
                title={webhookAutoResponseActive ? "Desativar webhook" : "Ativar webhook"}
                className={webhookAutoResponseActive ? "bg-green-500 hover:bg-green-600 rounded-full" : "rounded-full"}
              >
                {webhookAutoResponseActive ? (
                  <Zap className="h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4 opacity-50" />
                )}
              </Button>
            </>
          )}

          {/* Transfer to User Popover */}
          {availableUsers.length > 0 && (
            <Popover open={showTransferPopover} onOpenChange={setShowTransferPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  title="Direcionar para usuário"
                  disabled={disabled}
                  className="rounded-full"
                >
                  <UserPlus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 z-50" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-semibold">Direcionar para usuário</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Selecione o usuário</Label>
                      <Select
                        value={selectedTransferUser || ""}
                        onValueChange={onTransferUserChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.nome} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => {
                        onTransferUser?.();
                        setShowTransferPopover(false);
                      }}
                      disabled={!selectedTransferUser}
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Transferir Conversa
                    </Button>
                  </div>
                </PopoverContent>
            </Popover>
          )}

          {/* AI Chat Button */}
          {aiWebhooks.length > 0 && (
            <Button
              variant={showAIChat ? "default" : "outline"}
              size="icon"
              onClick={onToggleAIChat}
              disabled={aiWebhooks.length === 0}
              title="Chat com IA"
              className="rounded-full"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}

          {/* Auto-suggestion toggle */}
          {autoResponseWebhooks.length > 0 && (
            <div className="flex items-center gap-2 ml-2 border-l pl-2">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="auto-suggestion"
                  checked={autoSuggestionEnabled}
                  onCheckedChange={setAutoSuggestionEnabled}
                  disabled={disabled}
                />
                <Label 
                  htmlFor="auto-suggestion" 
                  className="text-xs cursor-pointer flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" />
                  Auto
                </Label>
              </div>
              
              {autoSuggestionEnabled && (
                <Select
                  value={selectedAutoWebhook || ""}
                  onValueChange={setSelectedAutoWebhook}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue placeholder="Selecione webhook" />
                  </SelectTrigger>
                  <SelectContent>
                    {autoResponseWebhooks.map((webhook) => (
                      <SelectItem key={webhook.id} value={webhook.id} className="text-xs">
                        {webhook.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isGeneratingSuggestion && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Gerando...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text Input Row with Emoji (left), Text Area (center), Audio & Send (right) */}
        <div className="flex items-center gap-2">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />
          
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="h-[32px] resize-none rounded-full px-4 text-left overflow-hidden"
            rows={1}
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
