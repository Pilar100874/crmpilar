import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  RefreshCw,
  AlertCircle,
  Settings,
  Mail,
} from "lucide-react";
import { toast } from "@/lib/toast-config";
import { useNavigate, useParams } from "react-router-dom";
import { EmailLoadingBar } from "@/components/email/EmailLoadingBar";
import { EmailFolderSidebar } from "@/components/email/EmailFolderSidebar";
import { EmailPanel } from "@/components/email/EmailPanel";
import { ComposeEmailDialog } from "@/components/email/ComposeEmailDialog";

interface Email {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: string;
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
  const effectiveFolder = embeddedFolder || folder;
  
  const [emailFolder, setEmailFolder] = useState<string>(effectiveFolder || "inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmailData, setSelectedEmailData] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [hasEmailConfig, setHasEmailConfig] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);
  
  // Compose email states
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'forward'>('compose');
  const [replyToEmail, setReplyToEmail] = useState<Email | null>(null);

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

      const { data: emailConfigs } = await supabase
        .from('email_oauth_config')
        .select('provider, enabled, client_id')
        .eq('estabelecimento_id', usuario.estabelecimento_id);

      const externalConfig = (emailConfigs as any[])?.find((c: any) => c.provider === 'external_server');
      const googleConfig = (emailConfigs as any[])?.find((c: any) => c.provider === 'google');

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

      if (googleConfig?.enabled && googleConfig?.client_id) {
        setHasEmailConfig(true);
        setUseOAuth(true);
        
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
    if (folder && folder !== emailFolder) {
      setEmailFolder(folder);
    }
  }, [folder]);

  // Carregar emails
  useEffect(() => {
    if (hasEmailConfig !== null) {
      if (useOAuth && oauthConnected) {
        fetchNewEmails();
      } else if (!useOAuth) {
        loadEmails();
      }
    }
  }, [emailFolder, hasEmailConfig, oauthConnected]);

  const loadEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load inbox emails
      const { data: inboxData, error: inboxError } = await supabase
        .from('emails')
        .select('id, from_email, to_email, subject, body, date, read, starred, folder, tracking_id, opened_at, opened_count')
        .eq('user_id', user.id)
        .eq('folder', 'inbox')
        .order('date', { ascending: false })
        .limit(50);

      // Load sent emails
      const { data: sentData, error: sentError } = await supabase
        .from('emails')
        .select('id, from_email, to_email, subject, body, date, read, starred, folder, tracking_id, opened_at, opened_count')
        .eq('user_id', user.id)
        .eq('folder', 'sent')
        .order('date', { ascending: false })
        .limit(50);

      let allEmails: Email[] = [];
      
      if (!inboxError && inboxData) {
        allEmails = [...allEmails, ...inboxData.map(email => ({
          ...email,
          hasAttachment: email.body?.includes('attachment') || false
        }))];
      }
      
      if (!sentError && sentData) {
        allEmails = [...allEmails, ...sentData.map(email => ({
          ...email,
          hasAttachment: email.body?.includes('attachment') || false
        }))];
      }

      setEmails(allEmails);
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
      setLoadingProgress(10);
      setLoadingMessage("Autenticando...");
      
      const functionName = useOAuth ? 'gmail-fetch-emails' : 'fetch-emails-imap';
      
      setLoadingProgress(30);
      setLoadingMessage("Buscando emails...");
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { folder: 'INBOX', maxResults: 50 }
      });
      
      setLoadingProgress(70);
      setLoadingMessage("Processando mensagens...");
      
      if (error) throw error;
      
      let allEmails: Email[] = [];
      
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
          folder: 'inbox',
          hasAttachment: email.body?.includes('attachment') || false,
        }));
        
        allEmails = [...fetchedEmails];
      }

      // Also load sent emails from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: sentData } = await supabase
          .from('emails')
          .select('id, from_email, to_email, subject, body, date, read, starred, folder, tracking_id, opened_at, opened_count')
          .eq('user_id', user.id)
          .eq('folder', 'sent')
          .order('date', { ascending: false })
          .limit(50);

        if (sentData) {
          allEmails = [...allEmails, ...sentData];
        }
      }
      
      setLoadingProgress(90);
      setLoadingMessage("Finalizando...");
      
      setEmails(allEmails);
      
      setLoadingProgress(100);
      toast.success(`${allEmails.length} emails carregados`);
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

  const handleSendEmail = async (emailData: { to: string; subject: string; body: string; attachments?: any[] }) => {
    setLoading(true);
    setLoadingMessage("Enviando email...");
    
    try {
      const functionName = useOAuth && oauthConnected ? 'gmail-send-email' : 'send-email-smtp';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          html: `<p>${emailData.body.replace(/\n/g, '<br>')}</p>`
        }
      });

      if (error) throw error;
      
      toast.success("Email enviado com sucesso!");
      setShowComposeEmail(false);
      
      if (emailFolder === 'sent') {
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
      setLoadingMessage("");
    }
  };

  const handleReply = (email: Email) => {
    setReplyToEmail(email);
    setComposeMode('reply');
    setShowComposeEmail(true);
  };

  const handleForward = (email: Email) => {
    setReplyToEmail(email);
    setComposeMode('forward');
    setShowComposeEmail(true);
  };

  const handleComposeNew = () => {
    setReplyToEmail(null);
    setComposeMode('compose');
    setShowComposeEmail(true);
  };

  const handleFolderChange = (folder: string) => {
    setEmailFolder(folder);
    setSelectedEmailId(null);
    setSelectedEmailData(null);
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

  // Se está embutido no EmailHub, não mostra sidebar própria (EmailHub já tem)
  const isEmbedded = !!embeddedFolder;

  const handleRefresh = async () => {
    if (useOAuth && oauthConnected) {
      await fetchNewEmails();
    } else {
      await loadEmails();
    }
    // Também recarregar o email selecionado para atualizar dados de tracking
    if (selectedEmailId) {
      const { data } = await supabase
        .from('emails')
        .select('*')
        .eq('id', selectedEmailId)
        .single();
      if (data) {
        setSelectedEmailData(data);
      }
    }
  };

  return (
    <div className="h-full flex bg-background">
      {/* Loading bar */}
      <EmailLoadingBar 
        isLoading={loading} 
        progress={loadingProgress}
        message={loadingMessage}
      />

      {/* Sidebar - Only show when NOT embedded (standalone /email/:folder route) */}
      {!isEmbedded && (
        <div className="w-52 border-r bg-card/50 flex-shrink-0 flex flex-col">
          <EmailFolderSidebar
            emails={emails}
            activeFolder={emailFolder}
            onFolderChange={handleFolderChange}
            onComposeClick={handleComposeNew}
            onRefresh={handleRefresh}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <EmailPanel
          emails={emails}
          selectedEmailId={selectedEmailId}
          selectedEmailData={selectedEmailData}
          emailFolder={emailFolder}
          onFolderChange={handleFolderChange}
          onEmailSelect={(id, data) => {
            setSelectedEmailId(id);
            setSelectedEmailData(data);
          }}
          onEmailClose={() => {
            setSelectedEmailId(null);
            setSelectedEmailData(null);
          }}
          onComposeClick={handleComposeNew}
          onRefresh={handleRefresh}
          onReply={handleReply}
          onForward={handleForward}
        />
      </div>

      {/* Compose Email Dialog */}
      <ComposeEmailDialog
        open={showComposeEmail}
        onOpenChange={setShowComposeEmail}
        mode={composeMode}
        defaultTo={composeMode === 'reply' && replyToEmail ? replyToEmail.from_email : ''}
        defaultSubject={
          composeMode === 'reply' && replyToEmail 
            ? `Re: ${replyToEmail.subject}` 
            : composeMode === 'forward' && replyToEmail 
              ? `Fwd: ${replyToEmail.subject}` 
              : ''
        }
        defaultBody={
          composeMode === 'reply' && replyToEmail 
            ? `\n\n--- Original ---\n${replyToEmail.body}` 
            : composeMode === 'forward' && replyToEmail 
              ? `\n\n--- Email encaminhado ---\nDe: ${replyToEmail.from_email}\nAssunto: ${replyToEmail.subject}\n\n${replyToEmail.body}` 
              : ''
        }
        onSend={handleSendEmail}
      />
    </div>
  );
}
