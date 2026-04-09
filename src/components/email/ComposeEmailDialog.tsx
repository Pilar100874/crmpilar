import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Send, X, Loader2, FileText, FileSpreadsheet, Paperclip } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EmailToolsMenu } from "./EmailToolsMenu";

export interface EmailAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'file';
  url?: string;
  size?: string;
}

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (email: { to: string; subject: string; body: string; attachments?: EmailAttachment[] }) => Promise<void>;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  mode?: 'compose' | 'reply' | 'forward';
  estabelecimentoId?: string | null;
  onOpenConsultaEstoque?: () => void;
  pendingAppendText?: string | null;
  onPendingAppendConsumed?: () => void;
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  onSend,
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  mode = 'compose',
  estabelecimentoId = null,
  onOpenConsultaEstoque,
}: ComposeEmailDialogProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);

  // Sync state when dialog opens or defaults change
  useEffect(() => {
    if (open) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setAttachments([]);
    }
  }, [open, defaultTo, defaultSubject, defaultBody]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const handleSend = async () => {
    if (!to.trim()) {
      toast({
        title: "Erro",
        description: "Informe o destinatário",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Erro",
        description: "Informe o assunto",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      if (onSend) {
        await onSend({ to, subject, body, attachments });
      }
      toast({
        title: "Email enviado",
        description: "O email foi enviado com sucesso",
      });
      setTo("");
      setSubject("");
      setBody("");
      setAttachments([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar o email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setTo("");
    setSubject("");
    setBody("");
    setAttachments([]);
    onOpenChange(false);
  };

  const handleInsertText = (text: string) => {
    setBody(prev => prev + text);
  };

  const handleAddAttachment = (attachment: EmailAttachment) => {
    setAttachments(prev => {
      // Avoid duplicates
      if (prev.some(a => a.id === attachment.id)) {
        return prev;
      }
      return [...prev, attachment];
    });
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const getTitle = () => {
    switch (mode) {
      case 'reply': return 'Responder Email';
      case 'forward': return 'Encaminhar Email';
      default: return 'Novo Email';
    }
  };

  const getAttachmentIcon = (type: EmailAttachment['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      default:
        return <Paperclip className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">Para</Label>
            <Input
              id="to"
              type="email"
              placeholder="destinatario@email.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border-orange-100 focus:border-orange-300 focus:ring-orange-100 dark:border-orange-900/30 dark:focus:border-orange-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              placeholder="Assunto do email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-orange-100 focus:border-orange-300 focus:ring-orange-100 dark:border-orange-900/30 dark:focus:border-orange-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Mensagem</Label>
            <Textarea
              id="body"
              placeholder="Escreva sua mensagem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] resize-none border-orange-100 focus:border-orange-300 focus:ring-orange-100 dark:border-orange-900/30 dark:focus:border-orange-700"
            />
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos ({attachments.length})
              </Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                {attachments.map((attachment) => (
                  <div 
                    key={attachment.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border border-border/50 shadow-sm group hover:border-orange-300 transition-colors"
                  >
                    {getAttachmentIcon(attachment.type)}
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {attachment.name}
                    </span>
                    {attachment.size && (
                      <span className="text-xs text-muted-foreground">
                        ({attachment.size})
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="ml-1 p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover anexo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between w-full">
          {/* Tools menu on left side */}
          <div className="flex-shrink-0 flex items-center gap-1">
            <EmailToolsMenu 
              estabelecimentoId={estabelecimentoId}
              onInsertText={handleInsertText}
              onAddAttachment={handleAddAttachment}
              onToolAction={(toolId) => {
                if (toolId === 'tool-stock' && onOpenConsultaEstoque) {
                  onOpenConsultaEstoque();
                }
              }}
              disabled={sending}
              recipientEmail={to}
            />
          </div>
          
          {/* Action buttons on right side */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}