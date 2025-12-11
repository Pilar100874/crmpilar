import { useState, useRef } from "react";
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
import { Send, X, Paperclip, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FormattingToolbar } from "@/components/flow/block-configs/FormattingToolbar";

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (email: { to: string; subject: string; body: string }) => Promise<void>;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  mode?: 'compose' | 'reply' | 'forward';
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  onSend,
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  mode = 'compose',
}: ComposeEmailDialogProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const newText = body.substring(0, start) + prefix + selectedText + suffix + body.substring(end);
    
    setBody(newText);
    
    // Restore cursor position after the formatted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleVariableClick = () => {
    // Placeholder for variable insertion - can be expanded later
    toast({
      title: "Variáveis",
      description: "Funcionalidade de variáveis em desenvolvimento",
    });
  };

  // Reset fields when dialog opens with new defaults
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody(defaultBody);
    }
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
        await onSend({ to, subject, body });
      }
      toast({
        title: "Email enviado",
        description: "O email foi enviado com sucesso",
      });
      setTo("");
      setSubject("");
      setBody("");
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
    onOpenChange(false);
  };

  const getTitle = () => {
    switch (mode) {
      case 'reply': return 'Responder Email';
      case 'forward': return 'Encaminhar Email';
      default: return 'Novo Email';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <FormattingToolbar 
              onFormat={handleFormat} 
              onVariableClick={handleVariableClick} 
            />
            <Textarea
              ref={textareaRef}
              id="body"
              placeholder="Escreva sua mensagem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] resize-none border-orange-100 focus:border-orange-300 focus:ring-orange-100 dark:border-orange-900/30 dark:focus:border-orange-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Paperclip className="w-4 h-4" />
              Anexar arquivo
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
