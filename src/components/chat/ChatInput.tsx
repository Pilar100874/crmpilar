import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Image, Paperclip, Variable, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

export default function ChatInput({ onSendMessage, disabled, lastUserMessage, onSuggestionGenerated }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [quickReplies, setQuickReplies] = useState<Array<{content: string, shortcut: string}>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
    if (!estabId) return;

    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("estabelecimento_id", estabId)
      .eq("active", true)
      .contains("usage_locations", ["resposta-automatica-chat"]);

    if (error) {
      console.error("Erro ao carregar webhooks de resposta automática:", error);
      return;
    }

    if (data && data.length > 0) {
      setAutoResponseWebhooks(data);
      setSelectedAutoWebhook(data[0].id);
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
    onSendMessage(
      `${attachment.type === "link" ? "Link" : "Arquivo"}: ${attachment.title}`,
      attachment.type === "link" ? "text" : "file",
      attachment.url,
      attachment.title
    );
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="min-h-[80px] resize-none"
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 items-center flex-wrap">
            <QuickRepliesSelector onSelect={handleQuickReplySelect} disabled={disabled} />
            
            <QuickAttachmentsSelector onSelect={handleQuickAttachmentSelect} disabled={disabled} />
            
            <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />
            
            <AudioRecorder onAudioRecorded={handleAudioRecorded} disabled={disabled} />
            
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
            >
              <Variable className="h-4 w-4" />
            </Button>

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

          <Button onClick={handleSend} disabled={!message.trim() || disabled} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <VariableSequence
        open={showVariables}
        onOpenChange={setShowVariables}
        onSubmit={handleVariablesSubmit}
      />
    </>
  );
}
