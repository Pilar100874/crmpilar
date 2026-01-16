import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
  MoreVertical,
  Clock,
  Tag,
  CheckCircle2,
  Mail,
  MailOpen,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast-config";
import { useNavigate, useParams } from "react-router-dom";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { EmailLoadingBar } from "@/components/email/EmailLoadingBar";
import { EmailToolbar } from "@/components/email/EmailToolbar";
import { EmailListItem } from "@/components/email/EmailListItem";
import { EmailEmptyState } from "@/components/email/EmailEmptyState";
import { cn } from "@/lib/utils";

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
  hasAttachment?: boolean;
  tracking_id?: string;
  opened_at?: string | null;
  opened_count?: number;
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [hasEmailConfig, setHasEmailConfig] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  
  // Compose email states
  const [newEmailTo, setNewEmailTo] = useState("");
  const [newEmailSubject, setNewEmailSubject] = useState("");
  const [newEmailBody, setNewEmailBody] = useState("");

  // Emails data
  const [emails, setEmails] = useState<Email[]>([]);
  const [useOAuth, setUseOAuth] = useState(false);
  const [oauthConnected, setOauthConnected] = useState(false);

  // Verificar configuração de email do usuário
  useEffect(() => {
    checkEmailConfiguration();
  }, []);

  const checkEmailConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasEmailConfig(false);
        setCheckingConfig(false);
        return;
      }

      // Verificar configuração de email do usuário (SMTP e IMAP)
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('smtp, porta_smtp, imap, porta_imap, senha_email, estabelecimento_id')
        .ilike('email', user.email || '')
        .maybeSingle() as { data: { smtp: string | null; porta_smtp: number | null; imap: string | null; porta_imap: number | null; senha_email: string | null; estabelecimento_id: string | null } | null; error: any };

      if (error) {
        console.error('Erro ao verificar configuração:', error);
        setHasEmailConfig(false);
        setCheckingConfig(false);
        return;
      }

      if (!usuario?.estabelecimento_id) {
        setHasEmailConfig(false);
        setCheckingConfig(false);
        return;
      }

      // Buscar todas as configurações de email do estabelecimento
      const { data: emailConfigs } = await supabase
        .from('email_oauth_config')
        .select('provider, enabled, client_id')
        .eq('estabelecimento_id', usuario.estabelecimento_id);

      // Verificar qual modo está ativo
      const externalConfig = (emailConfigs as any[])?.find((c: any) => c.provider === 'external_server');
      const googleConfig = (emailConfigs as any[])?.find((c: any) => c.provider === 'google');

      // Se external_server está habilitado, usar servidor externo (SMTP/IMAP)
      if (externalConfig?.enabled) {
        const isImapConfigured = !!(
          usuario?.smtp && 
          usuario?.porta_smtp && 
          usuario?.senha_email
        );

        if (isImapConfigured) {
          setHasEmailConfig(true);
          setUseOAuth(false);
          setCheckingConfig(false);
          return;
        }

        setHasEmailConfig(false);
        setCheckingConfig(false);
        return;
      }

      // Se OAuth (Google) está habilitado e tem client_id
      if (googleConfig?.enabled && googleConfig?.client_id) {
        setHasEmailConfig(true);
        setUseOAuth(true);
        
        // Verificar se já tem tokens OAuth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: tokenData } = await supabase
            .from('email_oauth_tokens')
            .select('id')
            .eq('user_id', authUser.id)
            .eq('provider', 'google')
            .maybeSingle();
          
          setOauthConnected(!!tokenData);
        }
        
        setCheckingConfig(false);
        return;
      }

      // Fallback: tentar IMAP/SMTP mesmo sem external_server explicitamente habilitado
      const isImapConfigured = !!(
        usuario?.smtp && 
        usuario?.porta_smtp && 
        usuario?.senha_email
      );

      if (isImapConfigured) {
        setHasEmailConfig(true);
        setUseOAuth(false);
        setCheckingConfig(false);
        return;
      }

      setHasEmailConfig(false);
    } catch (error) {
      console.error('Erro ao verificar configuração:', error);
      setHasEmailConfig(false);
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

  // Carregar emails do banco ou via OAuth
  useEffect(() => {
    if (hasEmailConfig !== null) {
      if (useOAuth && oauthConnected) {
        fetchNewEmails();
      } else if (!useOAuth) {
        loadEmails();
      }
    }
  }, [selectedFolder, hasEmailConfig, oauthConnected]);

  const loadEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('emails')
        .select('id, from_email, to_email, subject, body, date, read, starred, folder, tracking_id, opened_at, opened_count')
        .eq('user_id', user.id)
        .eq('folder', selectedFolder)
        .order('date', { ascending: false });

      if (error) throw error;
      setEmails((data as any[]).map(email => ({
        ...email,
        folder: email.folder as "inbox" | "sent" | "trash" | "archive",
        hasAttachment: email.body?.includes('attachment') || false
      })));
    } catch (error) {
      console.error('Erro ao carregar emails:', error);
      toast.error('Erro ao carregar emails');
    }
  };

  const connectGmailOAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-auth-start');
      
      if (error) throw error;
      
      if (data?.auth_url) {
        const popup = window.open(data.auth_url, 'gmail-oauth', 'width=600,height=700');
        
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'gmail-oauth-success') {
            toast.success('Gmail conectado com sucesso!');
            setOauthConnected(true);
            fetchNewEmails();
          } else if (event.data?.type === 'gmail-oauth-error') {
            toast.error(event.data.message || 'Erro ao conectar Gmail');
          }
          window.removeEventListener('message', handleMessage);
        };
        window.addEventListener('message', handleMessage);
      }
    } catch (error: any) {
      console.error('Erro ao iniciar OAuth:', error);
      toast.error(error.message || 'Erro ao conectar Gmail');
    } finally {
      setLoading(false);
    }
  };

  const fetchNewEmails = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage("Conectando ao servidor...");
    
    try {
      // Simular progresso inicial
      setLoadingProgress(10);
      setLoadingMessage("Autenticando...");
      
      const functionName = useOAuth ? 'gmail-fetch-emails' : 'fetch-emails-imap';
      
      setLoadingProgress(30);
      setLoadingMessage("Buscando emails...");
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { folder: selectedFolder.toUpperCase(), maxResults: 50 }
      });
      
      setLoadingProgress(70);
      setLoadingMessage("Processando mensagens...");
      
      if (error) throw error;
      
      if (data?.emails) {
        const fetchedEmails = data.emails.map((email: any, index: number) => ({
          id: email.id || `email-${Date.now()}-${index}`,
          from_email: email.from_email,
          to_email: email.to_email,
          subject: email.subject,
          body: email.body,
          date: email.date,
          read: email.read,
          starred: email.starred,
          folder: selectedFolder,
          hasAttachment: email.body?.includes('attachment') || false,
        }));
        
        setLoadingProgress(90);
        setLoadingMessage("Finalizando...");
        
        setEmails(fetchedEmails);
        
        setLoadingProgress(100);
        toast.success(`${fetchedEmails.length} emails carregados`);
      }
    } catch (error: any) {
      console.error('Erro ao buscar emails:', error);
      toast.error(error.message || 'Erro ao buscar emails');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
        setLoadingMessage("");
      }, 500);
    }
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = emails.filter(e => !e.read).length;

  const handleSelectEmail = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedEmails(new Set(filteredEmails.map(e => e.id)));
  };

  const handleDeselectAll = () => {
    setSelectedEmails(new Set());
  };

  const handleStarEmail = (emailId: string) => {
    setEmails(emails.map(e => 
      e.id === emailId ? { ...e, starred: !e.starred } : e
    ));
  };

  const handleMarkAsRead = () => {
    setEmails(emails.map(e => 
      selectedEmails.has(e.id) ? { ...e, read: true } : e
    ));
    setSelectedEmails(new Set());
    toast.success('Emails marcados como lidos');
  };

  const handleMarkAsUnread = () => {
    setEmails(emails.map(e => 
      selectedEmails.has(e.id) ? { ...e, read: false } : e
    ));
    setSelectedEmails(new Set());
    toast.success('Emails marcados como não lidos');
  };

  const handleSendEmail = async () => {
    if (!newEmailTo || !newEmailSubject || !newEmailBody) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage("Enviando email...");
    
    try {
      setLoadingProgress(30);
      
      const functionName = useOAuth && oauthConnected ? 'gmail-send-email' : 'send-email-smtp';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          to: newEmailTo,
          subject: newEmailSubject,
          body: newEmailBody,
          html: `<p>${newEmailBody.replace(/\n/g, '<br>')}</p>`
        }
      });

      if (error) throw error;

      setLoadingProgress(100);
      
      const messageId = data?.messageId;
      const successMessage = messageId 
        ? `Email enviado com sucesso!`
        : "Email enviado com sucesso!";
      
      toast.success(successMessage);
      setComposing(false);
      setNewEmailTo("");
      setNewEmailSubject("");
      setNewEmailBody("");
      
      if (selectedFolder === 'sent') {
        if (useOAuth && oauthConnected) {
          await fetchNewEmails();
        } else {
          await loadEmails();
        }
      }
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      toast.error(error.message || 'Erro ao enviar email');
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setLoadingMessage("");
    }
  };

  const handleComposeNew = () => {
    setNewEmailTo("");
    setNewEmailSubject("");
    setNewEmailBody("");
    setSelectedEmail(null);
    setComposing(true);
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    setNewEmailTo(selectedEmail.from_email);
    setNewEmailSubject(`Re: ${selectedEmail.subject}`);
    setNewEmailBody(`\n\n--- Original ---\n${selectedEmail.body}`);
    setComposing(true);
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    setComposing(true);
    setNewEmailTo("");
    setNewEmailSubject(`Fwd: ${selectedEmail.subject}`);
    setNewEmailBody(`\n\n--- Email encaminhado ---\nDe: ${selectedEmail.from_email}\nAssunto: ${selectedEmail.subject}\n\n${selectedEmail.body}`);
  };

  // Mostrar tela de carregamento
  if (checkingConfig) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Verificando configurações...</p>
        </div>
      </div>
    );
  }

  // Mostrar aviso se não tiver configuração de email
  if (!hasEmailConfig) {
    return (
      <div className="flex h-full items-center justify-center p-4 bg-background">
        <Card className="max-w-2xl w-full p-8 shadow-lg">
          <Alert className="border-none bg-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <AlertTitle className="text-lg font-semibold mb-2">
                  Configuração de Email Necessária
                </AlertTitle>
                <AlertDescription className="space-y-4">
                  <p className="text-muted-foreground">
                    Para utilizar o sistema de email, você precisa configurar seus dados pessoais de acesso ao servidor de email.
                  </p>
                  
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-medium text-sm">Informações necessárias:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Servidor SMTP e porta (para envio)</li>
                      <li>Servidor IMAP e porta (para recebimento)</li>
                      <li>Senha do email (Senha de App para Gmail/Hotmail)</li>
                    </ul>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    As configurações são preenchidas automaticamente para Gmail, Hotmail e Outlook.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button 
                      onClick={() => navigate('/config')}
                      className="flex-1"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configurar SMTP/IMAP
                    </Button>
                    <Button 
                      onClick={() => navigate('/email-config')}
                      variant="secondary"
                      className="flex-1"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Configurar Gmail/Outlook API
                    </Button>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </Card>
      </div>
    );
  }

  // Mostrar tela para conectar Gmail via OAuth
  if (useOAuth && !oauthConnected) {
    return (
      <div className="flex h-full items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-8 text-center shadow-lg">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-12 h-12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Conectar Gmail</h2>
            <p className="text-muted-foreground text-sm">
              Clique no botão abaixo para autorizar o acesso ao seu Gmail via API do Google.
            </p>
          </div>
          
          <Button 
            onClick={connectGmailOAuth}
            disabled={loading}
            className="w-full gap-2 h-12 text-base"
            size="lg"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
            Conectar com Google
          </Button>
          
          <p className="text-xs text-muted-foreground mt-4">
            Isso abrirá uma janela para você autorizar o acesso de leitura e envio de emails.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Loading bar */}
      <EmailLoadingBar 
        isLoading={loading} 
        progress={loadingProgress}
        message={loadingMessage}
      />

      {/* Composing view */}
      {composing ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setComposing(false)}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold">Novo E-mail</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setComposing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendEmail} className="gap-2" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Para:</label>
                <Input
                  placeholder="destinatario@exemplo.com"
                  value={newEmailTo}
                  onChange={(e) => setNewEmailTo(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Assunto:</label>
                <Input
                  placeholder="Assunto do e-mail"
                  value={newEmailSubject}
                  onChange={(e) => setNewEmailSubject(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Mensagem:</label>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={newEmailBody}
                  onChange={(e) => setNewEmailBody(e.target.value)}
                  className="min-h-[400px] resize-none bg-background"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Paperclip className="w-4 h-4" />
                  Anexar arquivo
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      ) : selectedEmail ? (
        /* Email detail view */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedEmail(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{selectedEmail.subject}</h2>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleReply}>
                <Reply className="w-4 h-4" />
                Responder
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleForward}>
                <Forward className="w-4 h-4" />
                Encaminhar
              </Button>
              <Separator orientation="vertical" className="h-8 mx-1" />
              <Button variant="outline" size="sm" className="gap-2">
                <Archive className="w-4 h-4" />
                Arquivar
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Tag className="w-4 h-4" />
                Etiqueta
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-6">
              <div className="bg-card rounded-lg border shadow-sm">
                <div className="p-6 border-b">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">{selectedEmail.from_email}</div>
                          <div className="text-sm text-muted-foreground">
                            Para: {selectedEmail.to_email}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground shrink-0 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(selectedEmail.date).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedEmail.body}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      ) : (
        /* Email list view */
        <div className="flex-1 flex flex-col overflow-hidden">
          <EmailToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCompose={handleComposeNew}
            onRefresh={fetchNewEmails}
            onSettings={() => navigate('/config')}
            loading={loading}
            unreadCount={unreadCount}
            totalCount={filteredEmails.length}
            selectedCount={selectedEmails.size}
            onMarkAsRead={handleMarkAsRead}
            onMarkAsUnread={handleMarkAsUnread}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />

          <ScrollArea className="flex-1">
            {filteredEmails.length === 0 ? (
              <EmailEmptyState folder={selectedFolder} />
            ) : (
              <div className="divide-y">
                {filteredEmails.map((email) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    isSelected={selectedEmails.has(email.id)}
                    onSelect={() => handleSelectEmail(email.id)}
                    onClick={() => {
                      setSelectedEmail(email);
                      // Mark as read
                      setEmails(emails.map(e => 
                        e.id === email.id ? { ...e, read: true } : e
                      ));
                    }}
                    onStar={() => handleStarEmail(email.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
