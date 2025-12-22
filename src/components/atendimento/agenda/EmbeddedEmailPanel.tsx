import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Send, RefreshCw, Inbox, ArrowUpRight, ArrowDownLeft, Paperclip, X, FileText, FileSpreadsheet, ArrowLeft, Reply, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/lib/toast-config";
import { EmailToolsMenu } from "@/components/email/EmailToolsMenu";
import { cn } from "@/lib/utils";

interface EmailAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'file';
  url?: string;
  size?: string;
}

interface EmailMessage {
  id: string;
  subject: string;
  from_email: string;
  to_email: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: string;
}

interface EmbeddedEmailPanelProps {
  customerEmail: string;
  customerName: string;
  customerId?: string;
  estabelecimentoId: string;
  userId: string;
}

export function EmbeddedEmailPanel({
  customerEmail,
  customerName,
  customerId,
  estabelecimentoId,
  userId
}: EmbeddedEmailPanelProps) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [showCompose, setShowCompose] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customerEmail) {
      loadEmails();
    }
  }, [customerEmail, userId]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      // Fetch emails related to this customer
      const { data } = await supabase
        .from("emails")
        .select("*")
        .eq("user_id", userId)
        .or(`from_email.ilike.%${customerEmail}%,to_email.ilike.%${customerEmail}%`)
        .order("date", { ascending: false })
        .limit(20);

      if (data) {
        setEmails(data);
      }
    } catch (error) {
      console.error("Error loading emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Preencha o assunto e a mensagem");
      return;
    }

    setSending(true);
    try {
      // Call edge function to send email
      const { data, error } = await supabase.functions.invoke("gmail-send-email", {
        body: {
          to: customerEmail,
          subject,
          body,
          attachments: attachments.map(a => ({ name: a.name, url: a.url }))
        }
      });

      if (error) throw error;

      toast.success("Email enviado com sucesso!");
      setSubject("");
      setBody("");
      setAttachments([]);
      
      // Reload emails
      loadEmails();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Erro ao enviar email");
    } finally {
      setSending(false);
    }
  };

  const handleInsertText = (text: string) => {
    setBody(prev => prev + text);
  };

  const handleAddAttachment = (attachment: EmailAttachment) => {
    setAttachments(prev => {
      if (prev.some(a => a.id === attachment.id)) return prev;
      return [...prev, attachment];
    });
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const getAttachmentIcon = (type: EmailAttachment['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-3.5 w-3.5 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />;
      default:
        return <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[450px] bg-background rounded-lg border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Mail className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-medium">{customerName}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{customerEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showCompose ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={() => setShowCompose(true)}
          >
            <Send className="h-3 w-3 mr-1" />
            Escrever
          </Button>
          <Button
            variant={!showCompose ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={() => setShowCompose(false)}
          >
            <Inbox className="h-3 w-3 mr-1" />
            Histórico
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={loadEmails}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showCompose ? (
        /* Compose Email */
        <div className="flex-1 flex flex-col p-3 space-y-2 overflow-hidden">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Para</Label>
            <Input
              value={customerEmail}
              disabled
              className="h-8 text-xs bg-muted/30"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Assunto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email..."
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1 flex-1 flex flex-col min-h-0">
            <Label className="text-[10px] text-muted-foreground">Mensagem</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva sua mensagem..."
              className="flex-1 resize-none text-xs min-h-[100px]"
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((attachment) => (
                <div 
                  key={attachment.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border border-border/50 text-xs"
                >
                  {getAttachmentIcon(attachment.type)}
                  <span className="truncate max-w-[100px]">{attachment.name}</span>
                  <button
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer with tools and send */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <EmailToolsMenu
              estabelecimentoId={estabelecimentoId}
              onInsertText={handleInsertText}
              onAddAttachment={handleAddAttachment}
              disabled={sending}
              recipientEmail={customerEmail}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="h-8 gap-1.5 text-xs"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      ) : selectedEmail ? (
        /* Email Detail View */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Email Detail Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/20">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedEmail(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">Voltar ao histórico</span>
          </div>
          
          {/* Email Content */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {/* Subject */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-tight">
                  {selectedEmail.subject || "(Sem assunto)"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={async () => {
                    await supabase
                      .from("emails")
                      .update({ starred: !selectedEmail.starred })
                      .eq("id", selectedEmail.id);
                    setSelectedEmail({ ...selectedEmail, starred: !selectedEmail.starred });
                    loadEmails();
                  }}
                >
                  <Star className={cn(
                    "h-4 w-4",
                    selectedEmail.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )} />
                </Button>
              </div>
              
              {/* From/To Info */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-10">De:</span>
                  <span className="font-medium">{selectedEmail.from_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-10">Para:</span>
                  <span className="font-medium">{selectedEmail.to_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-10">Data:</span>
                  <span>{format(new Date(selectedEmail.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              </div>
              
              {/* Email Body */}
              <div className="pt-3 border-t border-border/50">
                <div 
                  className="text-xs leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedEmail.body.includes('<') 
                      ? selectedEmail.body 
                      : selectedEmail.body.replace(/\n/g, '<br/>') 
                  }}
                />
              </div>
            </div>
          </ScrollArea>
          
          {/* Reply Button */}
          <div className="p-2 border-t border-border/50">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => {
                setSubject(`Re: ${selectedEmail.subject}`);
                setBody(`\n\n---\nEm ${format(new Date(selectedEmail.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}, ${selectedEmail.from_email} escreveu:\n\n${selectedEmail.body.replace(/<[^>]*>/g, '')}`);
                setSelectedEmail(null);
                setShowCompose(true);
              }}
            >
              <Reply className="h-3.5 w-3.5" />
              Responder
            </Button>
          </div>
        </div>
      ) : (
        /* Email History List */
        <ScrollArea className="flex-1 p-2" ref={scrollRef}>
          {emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum email encontrado</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Os emails com {customerName} aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => {
                const isOutgoing = email.to_email.toLowerCase().includes(customerEmail.toLowerCase());
                return (
                  <div
                    key={email.id}
                    className={cn(
                      "p-2.5 rounded-lg border border-border/50 transition-colors hover:bg-muted/30 cursor-pointer",
                      !email.read && "bg-primary/5 border-primary/20"
                    )}
                    onClick={async () => {
                      setSelectedEmail(email);
                      // Mark as read
                      if (!email.read) {
                        await supabase
                          .from("emails")
                          .update({ read: true })
                          .eq("id", email.id);
                        loadEmails();
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                        isOutgoing ? "bg-green-500/20" : "bg-blue-500/20"
                      )}>
                        {isOutgoing ? (
                          <ArrowUpRight className="h-3 w-3 text-green-600" />
                        ) : (
                          <ArrowDownLeft className="h-3 w-3 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-xs truncate",
                            !email.read ? "font-semibold" : "font-medium"
                          )}>
                            {email.subject || "(Sem assunto)"}
                          </p>
                          <div className="flex items-center gap-1">
                            {email.starred && (
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            )}
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {format(new Date(email.date), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                          {email.body.replace(/<[^>]*>/g, '').slice(0, 100)}...
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
