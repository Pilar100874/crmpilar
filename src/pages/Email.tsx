import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Send,
  Trash2,
  Archive,
  Star,
  Search,
  Plus,
  Paperclip,
  Reply,
  Forward,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Email {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: "inbox" | "sent" | "trash" | "archive";
}

export default function Email() {
  const [selectedFolder, setSelectedFolder] = useState<"inbox" | "sent" | "trash" | "archive">("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Compose email states
  const [newEmailTo, setNewEmailTo] = useState("");
  const [newEmailSubject, setNewEmailSubject] = useState("");
  const [newEmailBody, setNewEmailBody] = useState("");

  // Emails data
  const [emails, setEmails] = useState<Email[]>([]);

  // Carregar emails do banco
  useEffect(() => {
    loadEmails();
  }, [selectedFolder]);

  const loadEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('folder', selectedFolder)
        .order('date', { ascending: false });

      if (error) throw error;
      setEmails((data as any[]).map(email => ({
        ...email,
        folder: email.folder as "inbox" | "sent" | "trash" | "archive"
      })));
    } catch (error) {
      console.error('Erro ao carregar emails:', error);
      toast.error('Erro ao carregar emails');
    }
  };

  const fetchNewEmails = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('fetch-emails');
      
      if (error) throw error;
      
      toast.success('Emails atualizados com sucesso!');
      await loadEmails();
    } catch (error: any) {
      console.error('Erro ao buscar emails:', error);
      toast.error(error.message || 'Erro ao buscar emails');
    } finally {
      setLoading(false);
    }
  };

  const folders = [
    { id: "inbox", name: "Caixa de Entrada", icon: Inbox, count: emails.filter(e => e.folder === "inbox" && !e.read).length },
    { id: "sent", name: "Enviados", icon: Send, count: 0 },
    { id: "archive", name: "Arquivados", icon: Archive, count: 0 },
    { id: "trash", name: "Lixeira", icon: Trash2, count: 0 },
  ];

  const filteredEmails = emails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendEmail = async () => {
    if (!newEmailTo || !newEmailSubject || !newEmailBody) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: newEmailTo,
          subject: newEmailSubject,
          body: newEmailBody,
        }
      });

      if (error) throw error;

      toast.success("Email enviado com sucesso!");
      setComposing(false);
      setNewEmailTo("");
      setNewEmailSubject("");
      setNewEmailBody("");
      
      if (selectedFolder === 'sent') {
        await loadEmails();
      }
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      toast.error(error.message || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    setComposing(true);
    setNewEmailTo(selectedEmail.from_email);
    setNewEmailSubject(`Re: ${selectedEmail.subject}`);
    setNewEmailBody(`\n\n--- Original ---\n${selectedEmail.body}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar - Folders */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <Button 
            className="w-full gap-2" 
            onClick={() => setComposing(true)}
          >
            <Plus className="w-4 h-4" />
            Novo E-mail
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedFolder === folder.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <folder.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{folder.name}</span>
                </div>
                {folder.count > 0 && (
                  <Badge variant={selectedFolder === folder.id ? "secondary" : "default"}>
                    {folder.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Email List */}
      <div className="w-96 border-r flex flex-col bg-background">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {folders.find(f => f.id === selectedFolder)?.name}
            </h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={fetchNewEmails}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Nenhum email nesta pasta</p>
              </div>
            ) : (
              filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`w-full text-left p-4 hover:bg-muted transition-colors relative ${
                    selectedEmail?.id === email.id ? "bg-muted" : ""
                  } ${!email.read ? "font-semibold" : ""}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm truncate flex-1">{email.from_email}</span>
                    <div className="flex items-center gap-2 ml-2">
                      {email.starred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(email.date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm truncate mb-1">{email.subject}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {email.body}
                  </div>
                  {!email.read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Email Content / Compose */}
      <div className="flex-1 flex flex-col">
        {composing ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-card">
              <h2 className="text-lg font-semibold">Novo E-mail</h2>
              <div className="flex gap-2">
                <Button onClick={handleSendEmail} className="gap-2">
                  <Send className="w-4 h-4" />
                  Enviar
                </Button>
                <Button variant="outline" onClick={() => setComposing(false)}>
                  Cancelar
                </Button>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-auto">
              <div>
                <label className="text-sm font-medium mb-2 block">Para:</label>
                <Input
                  placeholder="destinatario@exemplo.com"
                  value={newEmailTo}
                  onChange={(e) => setNewEmailTo(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Assunto:</label>
                <Input
                  placeholder="Assunto do e-mail"
                  value={newEmailSubject}
                  onChange={(e) => setNewEmailSubject(e.target.value)}
                />
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Mensagem:</label>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={newEmailBody}
                  onChange={(e) => setNewEmailBody(e.target.value)}
                  className="min-h-[400px] resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Paperclip className="w-4 h-4" />
                  Anexar arquivo
                </Button>
              </div>
            </div>
          </div>
        ) : selectedEmail ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold mb-1">{selectedEmail.subject}</h2>
                  <div className="text-sm text-muted-foreground">
                    De: {selectedEmail.from_email}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(selectedEmail.date).toLocaleString("pt-BR")}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleReply}>
                  <Reply className="w-4 h-4" />
                  Responder
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Forward className="w-4 h-4" />
                  Encaminhar
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Archive className="w-4 h-4" />
                  Arquivar
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <Card className="p-6 bg-muted/30">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedEmail.body}
                  </div>
                </Card>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Inbox className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Selecione um e-mail para visualizar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
