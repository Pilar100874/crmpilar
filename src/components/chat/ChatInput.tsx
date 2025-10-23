import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Image, Paperclip, Variable } from "lucide-react";
import AudioRecorder from "./AudioRecorder";
import FileUploader from "./FileUploader";
import VariableSequence from "./VariableSequence";
import EmojiPicker from "./EmojiPicker";
import QuickRepliesSelector from "./QuickRepliesSelector";
import QuickAttachmentsSelector from "./QuickAttachmentsSelector";
import { Message } from "@/pages/ChatWebhook";

interface ChatInputProps {
  onSendMessage: (
    content: string,
    contentType: Message["contentType"],
    fileUrl?: string,
    fileName?: string,
    variables?: Record<string, string>
  ) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [quickReplies, setQuickReplies] = useState<Array<{content: string, shortcut: string}>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadQuickReplies();
  }, []);

  const loadQuickReplies = async () => {
    const { data } = await supabase
      .from("quick_replies")
      .select("content, shortcut")
      .not("shortcut", "is", null);
    
    if (data) {
      setQuickReplies(data);
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
          <div className="flex gap-1">
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
