import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  AlertCircle,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { toast } from "@/lib/toast-config";
import { useNavigate, useParams } from "react-router-dom";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

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

interface EmailProps {
  embeddedFolder?: string;
}

export default function Email({ embeddedFolder }: EmailProps = {}) {
  const navigate = useNavigate();
  const { folder } = useParams<{ folder?: string }>();
  const { openSubmenu } = useLayout();
  const effectiveFolder = embeddedFolder || folder;
  const [selectedFolder, setSelectedFolder] = useState<"inbox" | "sent" | "trash" | "archive">(
    (effectiveFolder as "inbox" | "sent" | "trash" | "archive") || "inbox"
  );
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState<boolean | null>(null);
  const [hasResendConfig, setHasResendConfig] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);
  
  // Compose email states
  const [newEmailTo, setNewEmailTo] = useState("");
  const [newEmailSubject, setNewEmailSubject] = useState("");
  const [newEmailBody, setNewEmailBody] = useState("");

  // Emails data
  const [emails, setEmails] = useState<Email[]>([]);

  // Verificar configuração de email do usuário
  useEffect(() => {
    checkEmailConfiguration();
  }, []);

  const checkEmailConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasEmailConfig(false);
        setHasResendConfig(false);
        setCheckingConfig(false);
        return;
      }

      // Verificar configuração de email do usuário
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('smtp, porta_smtp, pop, porta_pop, senha_email, estabelecimento_id')
        .ilike('email', user.email || '')
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar configuração:', error);
        setHasEmailConfig(false);
        setHasResendConfig(false);
      } else {
        // Verifica se todos os campos necessários estão preenchidos
        const isEmailConfigured = !!(
          usuario?.smtp && 
          usuario?.porta_smtp && 
          usuario?.pop && 
          usuario?.porta_pop && 
          usuario?.senha_email
        );
        setHasEmailConfig(isEmailConfigured);

        // Verificar configuração Resend do estabelecimento
        if (usuario?.estabelecimento_id) {
          const { data: resendConfig } = await supabase
            .from('resend_config')
            .select('*')
            .eq('estabelecimento_id', usuario.estabelecimento_id)
            .maybeSingle();
          
          setHasResendConfig(!!resendConfig);
        } else {
          setHasResendConfig(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar configuração:', error);
      setHasEmailConfig(false);
      setHasResendConfig(false);
    } finally {
      setCheckingConfig(false);
    }
  };

  // Sincronizar pasta com a URL
  useEffect(() => {
    if (folder && folder !== selectedFolder) {
      setSelectedFolder(folder as "inbox" | "sent" | "trash" | "archive");
    }
  }, [folder]);

  // Carregar emails do banco
  useEffect(() => {
    if (hasEmailConfig && hasResendConfig) {
      loadEmails();
    }
  }, [selectedFolder, hasEmailConfig, hasResendConfig]);

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
      // Buscar emails via IMAP do servidor pessoal do usuário
      const { data, error } = await supabase.functions.invoke('fetch-emails-imap', {
        body: { folder: 'INBOX', limit: 50 }
      });
      
      if (error) throw error;
      
      if (data?.emails) {
        // Converter emails do IMAP para o formato local
        const imapEmails = data.emails.map((email: any, index: number) => ({
          id: `imap-${Date.now()}-${index}`,
          from_email: email.from_email,
          to_email: email.to_email,
          subject: email.subject,
          body: email.body,
          date: email.date,
          read: email.read,
          starred: email.starred,
          folder: 'inbox' as const,
        }));
        
        setEmails(imapEmails);
        toast.success(`${imapEmails.length} emails carregados do servidor`);
      }
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
      // Enviar via SMTP do servidor pessoal do usuário
      const { data, error } = await supabase.functions.invoke('send-email-smtp', {
        body: {
          to: newEmailTo,
          subject: newEmailSubject,
          body: newEmailBody,
        }
      });

      if (error) throw error;

      toast.success("Email enviado do seu email pessoal!");
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

  // Mostrar tela de carregamento
  if (checkingConfig) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando configurações...</p>
        </div>
      </div>
    );
  }

  // Mostrar aviso se não tiver configuração de email ou Resend
  if (!hasEmailConfig || !hasResendConfig) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8">
          <Alert>
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg mb-2">
              {!hasEmailConfig && !hasResendConfig 
                ? "Configurações de Email Necessárias" 
                : !hasEmailConfig 
                  ? "Configuração de Email do Usuário Necessária"
                  : "Configuração Resend Necessária"}
            </AlertTitle>
            <AlertDescription className="space-y-4">
              {!hasEmailConfig && (
                <>
                  <p className="text-base">
                    Para utilizar o sistema de email, você precisa configurar seus dados pessoais de acesso ao servidor de email.
                  </p>
                  
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-semibold">Informações necessárias do usuário:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Servidor SMTP e porta</li>
                      <li>Servidor IMAP/POP e porta</li>
                      <li>Senha do email (Senha de App para Gmail)</li>
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    As configurações são preenchidas automaticamente para Gmail, Hotmail e Outlook. 
                    Você só precisa informar a senha do email.
                  </p>
                </>
              )}

              {!hasResendConfig && (
                <>
                  <p className="text-base">
                    Além disso, o estabelecimento precisa ter o serviço <strong>Resend</strong> configurado para envio de emails.
                  </p>
                  
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-semibold">Configuração Resend necessária:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>API Key do Resend</li>
                      <li>Email remetente verificado</li>
                      <li>Nome do remetente</li>
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    A configuração do Resend é feita por estabelecimento e permite o envio real de emails profissionais.
                  </p>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => navigate('/config')}
                  className="flex-1"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Ir para Configurações
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Voltar ao Início
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header com botões - só aparece quando não está vendo um email */}
      {!selectedEmail && !composing && (
        <div className="border-b bg-card">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SubMenuHeader 
                title="E-mail"
                onOpenSubmenu={() => openSubmenu("Email")}
              />
              <h2 className="text-lg font-semibold">
                {folders.find(f => f.id === selectedFolder)?.name}
              </h2>
              
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Busca e filtro"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate('/config')}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                CONFIGURAÇÕES
              </Button>
              <Button 
                onClick={() => setComposing(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                ESCREVER
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={fetchNewEmails}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Área principal de emails */}
      <div className="flex-1 flex flex-col">
        {composing ? (
          <div className="flex-1 p-8 overflow-auto bg-background">
            <Card className="max-w-4xl mx-auto">
              <div className="p-6 border-b flex items-center justify-between">
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

              <div className="p-6 space-y-4">
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

                <div>
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
            </Card>
          </div>
        ) : selectedEmail ? (
          <div className="flex-1 p-8 overflow-auto bg-background">
            <div className="max-w-4xl mx-auto">
              <Button 
                variant="ghost" 
                className="mb-4 gap-2"
                onClick={() => setSelectedEmail(null)}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para lista
              </Button>
              
              <Card>
                <div className="p-6 border-b">
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

                <div className="p-6">
                  <div className="p-6 bg-muted/30 rounded-lg">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedEmail.body}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Cabeçalho da tabela */}
            <div className="border-b bg-muted/30">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-medium text-muted-foreground">
                <div className="col-span-3">DE</div>
                <div className="col-span-6">MENSAGEM E CONEXÃO DE LEAD</div>
                <div className="col-span-3 text-right">DATA</div>
              </div>
            </div>

            {/* Lista de emails */}
            <ScrollArea className="flex-1">
              {filteredEmails.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-red-500 text-sm">Desculpe, não há mensagens.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors relative"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3 text-sm truncate">
                          {email.from_email}
                        </div>
                        <div className="col-span-6">
                          <div className="text-sm font-medium truncate mb-1">
                            {email.subject}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {email.body}
                          </div>
                        </div>
                        <div className="col-span-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {email.starred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(email.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!email.read && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
