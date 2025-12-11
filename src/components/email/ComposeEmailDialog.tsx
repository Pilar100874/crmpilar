import { useState } from "react";
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
import { Send, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EmailToolsMenu } from "./EmailToolsMenu";

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (email: { to: string; subject: string; body: string }) => Promise<void>;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  mode?: 'compose' | 'reply' | 'forward';
  estabelecimentoId?: string | null;
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
}: ComposeEmailDialogProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);

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

  const handleInsertText = (text: string) => {
    setBody(prev => prev + text);
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
            <Textarea
              id="body"
              placeholder="Escreva sua mensagem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] resize-none border-orange-100 focus:border-orange-300 focus:ring-orange-100 dark:border-orange-900/30 dark:focus:border-orange-700"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between w-full">
          {/* Tools menu on left side */}
          <div className="flex-shrink-0">
            <EmailToolsMenu 
              estabelecimentoId={estabelecimentoId}
              onInsertText={handleInsertText}
              disabled={sending}
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
