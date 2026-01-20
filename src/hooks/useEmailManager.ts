import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Email {
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
  customer?: any;
  empresa?: any;
}

interface UseEmailManagerOptions {
  onEmailsLoaded?: (emails: Email[]) => void;
}

export function useEmailManager(options?: UseEmailManagerOptions) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmailData, setSelectedEmailData] = useState<Email | null>(null);
  const [emailFolder, setEmailFolder] = useState<string>("inbox");
  const [loading, setLoading] = useState(false);
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [composeEmailMode, setComposeEmailMode] = useState<'compose' | 'reply' | 'forward'>('compose');
  const [composeEmailDefaults, setComposeEmailDefaults] = useState<{ to: string; subject: string; body: string }>({ to: '', subject: '', body: '' });
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  const getEstabelecimentoId = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .ilike('email', user.email || '')
        .maybeSingle();

      return usuario?.estabelecimento_id || null;
    } catch {
      return null;
    }
  };

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const estabId = await getEstabelecimentoId();
      if (!estabId) return;
      
      // Store estabelecimento_id for tools menu
      setEstabelecimentoId(estabId);

      // Check email mode configuration
      const { data: emailConfigs } = await supabase
        .from('email_oauth_config')
        .select('provider, enabled')
        .eq('estabelecimento_id', estabId);

      const googleEnabled = emailConfigs?.find((c: any) => c.provider === 'google')?.enabled;
      const externalEnabled = emailConfigs?.find((c: any) => c.provider === 'external_server')?.enabled;

      let fetchedEmails: Email[] = [];

      // Use OAuth (Gmail) if enabled
      if (googleEnabled) {
        try {
          const { data: gmailData, error: fetchError } = await supabase.functions.invoke('gmail-fetch-emails', {
            body: { folder: 'INBOX', maxResults: 50 }
          });

          if (!fetchError && gmailData?.emails) {
            fetchedEmails = gmailData.emails.map((email: any, index: number) => ({
              id: email.id || `email-${Date.now()}-${index}`,
              from_email: email.from_email,
              to_email: email.to_email,
              subject: email.subject,
              body: email.body,
              date: email.date,
              read: email.read ?? false,
              starred: email.starred ?? false,
              folder: 'inbox',
            }));
          }
        } catch (gmailError) {
          console.error("Gmail OAuth fetch error:", gmailError);
        }
      }
      // Use external server (SMTP/IMAP) if enabled
      else if (externalEnabled) {
        try {
          const { data: imapData, error: fetchError } = await supabase.functions.invoke('fetch-emails-imap', {
            body: { folder: 'INBOX', maxResults: 50 }
          });

          if (!fetchError && imapData?.emails) {
            fetchedEmails = imapData.emails.map((email: any, index: number) => ({
              id: email.id || `email-${Date.now()}-${index}`,
              from_email: email.from_email,
              to_email: email.to_email,
              subject: email.subject,
              body: email.body,
              date: email.date,
              read: email.read ?? false,
              starred: email.starred ?? false,
              folder: 'inbox',
            }));
          }
        } catch (imapError) {
          console.error("IMAP fetch error:", imapError);
        }
      }

      // Also load sent emails from local database (including tracking fields)
      const { data: sentEmailsData } = await supabase
        .from('emails')
        .select('id, from_email, to_email, subject, body, date, read, starred, folder, tracking_id, opened_at, opened_count')
        .eq('user_id', user.id)
        .eq('folder', 'sent')
        .order('date', { ascending: false })
        .limit(50);

      if (sentEmailsData && sentEmailsData.length > 0) {
        fetchedEmails = [...fetchedEmails, ...sentEmailsData];
      }

      // If no emails from remote, fallback to local database for inbox
      if (fetchedEmails.filter(e => e.folder === 'inbox').length === 0) {
        const { data: emailsData, error } = await supabase
          .from('emails')
          .select('*')
          .eq('user_id', user.id)
          .eq('folder', 'inbox')
          .order('date', { ascending: false })
          .limit(50);

        if (!error && emailsData) {
          fetchedEmails = [...fetchedEmails.filter(e => e.folder === 'sent'), ...emailsData];
        }
      }

      setEmails(fetchedEmails);
      options?.onEmailsLoaded?.(fetchedEmails);
    } catch (error) {
      console.error("Erro ao carregar emails:", error);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const loadSelectedEmail = useCallback(async (emailId: string, forceRefresh: boolean = false) => {
    try {
      let emailData: Email | null = !forceRefresh && selectedEmailData && selectedEmailData.id === emailId ? selectedEmailData : null;

      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(emailId);

      if (!emailData && isUuid) {
        const { data, error } = await supabase
          .from("emails")
          .select("*")
          .eq("id", emailId)
          .single();

        if (!error && data) {
          emailData = data as Email;
        }
      }

      if (!emailData) {
        // Try to find in current emails list
        emailData = emails.find(e => e.id === emailId) || null;
      }

      if (emailData) {
        // Get contact email based on folder
        const contactEmail = emailData.folder === "sent"
          ? emailData.to_email || emailData.from_email || ""
          : emailData.from_email || emailData.to_email || "";

        // Fetch customer data
        if (contactEmail) {
          const { data: customerData } = await supabase
            .from("customers")
            .select(`
              id, nome, telefone, email, empresa_id, tags, custom_fields,
              customer_empresas (
                id, cargo, is_primary,
                empresas:empresa_id (id, nome, nome_fantasia, cnpj, telefone)
              )
            `)
            .ilike("email", contactEmail)
            .maybeSingle();

          if (customerData) {
            emailData = { ...emailData, customer: customerData };
          }
        }

        setSelectedEmailData(emailData);
      }
    } catch (error) {
      console.error("Erro ao carregar email:", error);
    }
  }, [selectedEmailData, emails]);

  const sendEmail = useCallback(async (emailData: { to: string; subject: string; body: string; attachments?: any[] }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const estabId = await getEstabelecimentoId();
      if (!estabId) throw new Error('Estabelecimento não encontrado');

      // Check email mode configuration
      const { data: emailConfigs } = await supabase
        .from('email_oauth_config')
        .select('provider, enabled')
        .eq('estabelecimento_id', estabId);

      const googleEnabled = emailConfigs?.find((c: any) => c.provider === 'google')?.enabled;

      let functionName = 'send-email-smtp';
      if (googleEnabled) {
        functionName = 'gmail-send-email';
      }

      // Send email via edge function
      const { error: sendError } = await supabase.functions.invoke(functionName, {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          html: `<p>${emailData.body.replace(/\n/g, '<br>')}</p>`
        }
      });

      if (sendError) throw sendError;

      toast.success("Email enviado com sucesso!");
      
      // Reload emails in background
      loadEmails();

    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      toast.error(error.message || 'Erro ao enviar email');
      throw error;
    }
  }, [loadEmails]);

  const handleFolderChange = useCallback((folder: string) => {
    setEmailFolder(folder);
    setSelectedEmailId(null);
    setSelectedEmailData(null);
  }, []);

  const handleEmailSelect = useCallback((id: string, data: Email) => {
    setSelectedEmailId(id);
    setSelectedEmailData(data);
    loadSelectedEmail(id);
  }, [loadSelectedEmail]);

  const handleEmailClose = useCallback(() => {
    setSelectedEmailId(null);
    setSelectedEmailData(null);
  }, []);

  const handleComposeClick = useCallback(() => {
    setComposeEmailMode('compose');
    setComposeEmailDefaults({ to: '', subject: '', body: '' });
    setShowComposeEmail(true);
  }, []);

  const handleReply = useCallback((email: Email) => {
    const replySubject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`;
    const replyBody = `\n\n---\nEm ${format(new Date(email.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}, ${email.from_email} escreveu:\n${email.body || ''}`;
    setComposeEmailMode('reply');
    setComposeEmailDefaults({ to: email.from_email, subject: replySubject, body: replyBody });
    setShowComposeEmail(true);
  }, []);

  const handleForward = useCallback((email: Email) => {
    const fwdSubject = email.subject?.startsWith('Fwd:') || email.subject?.startsWith('Enc:') ? email.subject : `Enc: ${email.subject || ''}`;
    const fwdBody = `\n\n---\nMensagem encaminhada:\nDe: ${email.from_email}\nData: ${format(new Date(email.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}\nAssunto: ${email.subject || ''}\n\n${email.body || ''}`;
    setComposeEmailMode('forward');
    setComposeEmailDefaults({ to: '', subject: fwdSubject, body: fwdBody });
    setShowComposeEmail(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadEmails();
    if (selectedEmailId) {
      await loadSelectedEmail(selectedEmailId, true);
    }
  }, [loadEmails, loadSelectedEmail, selectedEmailId]);

  const filteredEmails = emails.filter(email => {
    if (emailFolder === "starred") {
      return email.starred;
    }
    return email.folder === emailFolder;
  });

  return {
    // State
    emails,
    filteredEmails,
    selectedEmailId,
    selectedEmailData,
    emailFolder,
    loading,
    showComposeEmail,
    composeEmailMode,
    composeEmailDefaults,
    estabelecimentoId,
    
    // Setters
    setEmails,
    setSelectedEmailId,
    setSelectedEmailData,
    setEmailFolder,
    setShowComposeEmail,
    setComposeEmailMode,
    setComposeEmailDefaults,
    
    // Actions
    loadEmails,
    loadSelectedEmail,
    sendEmail,
    handleFolderChange,
    handleEmailSelect,
    handleEmailClose,
    handleComposeClick,
    handleReply,
    handleForward,
    handleRefresh,
  };
}
