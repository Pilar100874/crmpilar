import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { MessageSquare, Facebook, Instagram, Send, Globe, Radio, Smartphone, Plus, Trash2, RefreshCw, Save, AlertCircle, ExternalLink, Eye, EyeOff, Power, CheckCircle2, Bug, Clock, PlayCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast as sonnerToast } from "@/lib/toast-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CanalGuiaPassoAPasso } from "@/components/config/CanalGuiaPassoAPasso";


interface CanaisAtendimentoCRUDProps {
  estabelecimentoId?: string;
}

interface WhatsAppSession {
  id: string;
  session_name: string;
  phone_number: string | null;
  status: string;
  qr_code: string | null;
  bot_flow_id: string | null;
  auto_reconnect_days?: number | null;
  last_reconnect_at?: string | null;
}

type EvolutionDiagnosticStatus = "ok" | "warning" | "error" | "info";

interface EvolutionDiagnosticStep {
  id: string;
  title: string;
  status: EvolutionDiagnosticStatus;
  message: string;
  latency?: number;
  details?: unknown;
}

interface EvolutionDiagnosticReport {
  ok: boolean;
  likely?: boolean;
  conclusion: string;
  providerStatus?: string | null;
  messageId?: string | null;
  usedNumber?: string | null;
  startedAt?: string;
  finishedAt?: string;
  steps: EvolutionDiagnosticStep[];
}

// WhatsApp Business API Config
function WhatsAppBusinessConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const [whatsappToken, setWhatsappToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);
  const [webhookUrl] = useState(
    "https://kiuztueouxtyqiecgdxk.supabase.co/functions/v1/whatsapp-webhook"
  );
  const [activeBots, setActiveBots] = useState<any[]>([]);

  useEffect(() => {
    loadWhatsAppConfig();
    loadActiveBots();
  }, [estabelecimentoId]);

  const loadActiveBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_flows')
        .select('id, name')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true)
        .contains('canais', ['whatsapp'])
        .order('name');

      if (error) throw error;
      setActiveBots(data || []);
    } catch (error) {
      console.error('Erro ao carregar bots ativos:', error);
    }
  };

  const loadWhatsAppConfig = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (data) {
        setConfigId(data.id);
        setWhatsappToken(data.business_token || "");
        setPhoneNumberId(data.phone_number_id || "");
        setBusinessAccountId(data.business_account_id || "");
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleSave = async () => {
    if (!whatsappToken || !phoneNumberId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Token e Phone Number ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update({
            business_token: whatsappToken,
            phone_number_id: phoneNumberId,
            business_account_id: businessAccountId || null,
          })
          .eq('id', configId);

        if (error) throw error;
        toast({
          title: "✓ Configuração atualizada!",
          description: "WhatsApp Business API configurado com sucesso.",
        });
      } else {
        const { data, error } = await supabase
          .from('whatsapp_config')
          .insert({
            estabelecimento_id: estabelecimentoId,
            business_token: whatsappToken,
            phone_number_id: phoneNumberId,
            business_account_id: businessAccountId || null,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
        toast({
          title: "✓ Configuração salva!",
          description: "WhatsApp Business API configurado com sucesso.",
        });
      }

      loadWhatsAppConfig();
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Business API
          </CardTitle>
          <CardDescription>
            Configure as credenciais da API Oficial do WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="whatsapp-token">WhatsApp Business Token *</Label>
            <div className="flex gap-2">
              <Input
                id="whatsapp-token"
                type={showToken ? "text" : "password"}
                placeholder="EAAxxxxxxxxxx..."
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Token de acesso permanente do WhatsApp Business
            </p>
          </div>

          <div>
            <Label htmlFor="phone-number-id">Phone Number ID *</Label>
            <Input
              id="phone-number-id"
              placeholder="123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              ID do número de telefone do WhatsApp Business
            </p>
          </div>

          <div>
            <Label htmlFor="business-account-id">Business Account ID (opcional)</Label>
            <Input
              id="business-account-id"
              placeholder="123456789012345"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              ID da conta de negócios do Meta
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O bot será vinculado automaticamente ao ativar na tela de Criar Bot
            </AlertDescription>
          </Alert>

          <Button onClick={handleSave} className="w-full" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook URL</CardTitle>
          <CardDescription>
            Configure este URL no Facebook Developer para receber mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL do Webhook</Label>
            <div className="flex gap-2 mt-1">
              <Input value={webhookUrl} readOnly />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  sonnerToast.success("URL copiada!");
                }}
              >
                Copiar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Use esta URL como webhook no Facebook Developer
            </p>
          </div>
        </CardContent>
      </Card>

      <CanalGuiaPassoAPasso
        titulo="Como obter os dados da API Oficial do WhatsApp"
        descricao="Passo a passo para conseguir o Token, o Phone Number ID e o Business Account ID no Meta."
        defaultOpen
        passos={[
          { titulo: "Crie a conta Meta Business", descricao: "Acesse o Gerenciador de Negócios da Meta e crie/valide a conta da sua empresa.", link: { label: "business.facebook.com", url: "https://business.facebook.com" } },
          { titulo: "Crie o app e adicione o WhatsApp", descricao: "Em Meta for Developers → Meus Apps → Criar app (tipo Empresa) e adicione o produto 'WhatsApp'.", link: { label: "Meta for Developers", url: "https://developers.facebook.com/apps/" } },
          { titulo: "Cadastre o número", descricao: "Em WhatsApp → Configuração da API, adicione e verifique o número que fará os atendimentos (ele não pode estar ativo no app WhatsApp comum)." },
          { titulo: "Copie Phone Number ID e Business Account ID", descricao: "Na mesma tela de Configuração da API, os dois IDs aparecem logo abaixo do seletor 'De' (número remetente). Copie e cole nos campos acima." },
          { titulo: "Gere um token permanente", descricao: "Em business.facebook.com → Configurações do negócio → Usuários → Usuários do sistema, crie um usuário do sistema Administrador, atribua o app e gere um token com as permissões whatsapp_business_messaging e whatsapp_business_management. Esse token não expira." },
          { titulo: "Configure o Webhook", descricao: "Em WhatsApp → Configuração → Webhooks, cole a URL do webhook exibida acima, informe o token de verificação e assine o evento 'messages'." },
          { titulo: "Salve e ative o bot", descricao: "Salve as credenciais aqui e, em Criar Bot, ative um fluxo com o canal WhatsApp selecionado." },
        ]}
        campos={[
          { campo: "WhatsApp Business Token", onde: "Token do usuário do sistema gerado no Gerenciador de Negócios (permanente). O token temporário da tela de teste expira em 24h.", exemplo: "EAAxxxxxxxxxx..." },
          { campo: "Phone Number ID", onde: "Meta for Developers → WhatsApp → Configuração da API, abaixo do número remetente.", exemplo: "123456789012345" },
          { campo: "Business Account ID", onde: "Mesma tela de Configuração da API (WhatsApp Business Account ID) ou em Configurações do negócio → Contas do WhatsApp.", exemplo: "123456789012345" },
        ]}
        docUrl="https://developers.facebook.com/docs/whatsapp/cloud-api"
        docLabel="Documentação WhatsApp Cloud API"
      />

    </div>
  );
}

// WhatsApp Evolution Config
function WhatsAppEvolutionConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const webhookSyncCacheRef = useRef<Record<string, boolean>>({});
  
  const [evolutionUrl, setEvolutionUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  const [evolutionMode, setEvolutionMode] = useState<"producao" | "sandbox">("producao");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [managerUrl, setManagerUrl] = useState("");
  const [showEvolutionKey, setShowEvolutionKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<
    | {
        ok: boolean;
        server: { ok: boolean; latency?: number; status?: number; instances?: number | null; list?: Array<{ name: string; status: string; number?: string | null; profileName?: string | null }>; error?: string };
        manager: { ok: boolean; latency?: number; status?: number; error?: string } | null;
      }
    | null
  >(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [selectedQrSession, setSelectedQrSession] = useState<WhatsAppSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sessionUsages, setSessionUsages] = useState<Array<{ tipo: string; nome: string; id: string }>>([]);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [diagnosticSessionId, setDiagnosticSessionId] = useState("");
  const [diagnosticPhone, setDiagnosticPhone] = useState("");
  const [diagnosticMessage, setDiagnosticMessage] = useState("Teste de diagnóstico do Pilar CRM via Evolution.");
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<EvolutionDiagnosticReport | null>(null);

  useEffect(() => {
    loadConfig();
    loadBots();
    const interval = setInterval(() => {
      refreshSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [estabelecimentoId]);

  useEffect(() => {
    if (selectedQrSession) {
      const updatedSession = sessions.find((s) => s.id === selectedQrSession.id);
      if (updatedSession && updatedSession.status === 'WORKING') {
        setSelectedQrSession(null);
        toast({
          title: '✓ Sessão conectada!',
          description: `A sessão "${updatedSession.session_name}" foi vinculada com sucesso.`,
        });
      }
    }
  }, [sessions, selectedQrSession]);

  useEffect(() => {
    if (!diagnosticSessionId && sessions.length > 0) {
      const workingSession = sessions.find((session) => session.status === "WORKING") || sessions[0];
      setDiagnosticSessionId(workingSession.id);
    }
  }, [sessions, diagnosticSessionId]);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_flows')
        .select('id, name')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true)
        .or('canais.cs.{whatsapp},canais.cs.{marketing_automation}')
        .order('name');

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const { data: configData, error } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (!error && configData) {
        const cfg = configData as any;
        if (cfg.evolution_url) {
          setConfig(cfg);
          setEvolutionUrl(cfg.evolution_url);
          setEvolutionApiKey(cfg.evolution_api_key || "");
          setWebhookUrl(cfg.webhook_url || "");
          setManagerUrl(cfg.manager_url || "");
          setEvolutionMode((cfg.evolution_mode as "producao" | "sandbox") || "producao");
        }
      }

      await refreshSessions();
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const testEvolutionConnection = async () => {
    if (!evolutionUrl.trim() || !evolutionApiKey.trim()) {
      toast({
        title: "Preencha URL e apikey",
        description: "Informe o endpoint e a apikey antes de testar.",
        variant: "destructive",
      });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-manager", {
        body: {
          action: "test",
          url: evolutionUrl.trim(),
          apiKey: evolutionApiKey.trim(),
          managerUrl: managerUrl.trim() || undefined,
        },
      });
      if (error) throw new Error(error.message);
      const d = (data as any) || {};
      const result = {
        ok: !!d.ok,
        server: d.server || { ok: false, error: d.error || "Sem resposta do servidor." },
        manager: d.manager ?? null,
      };
      setTestResult(result);
      if (result.ok) {
        toast({ title: "✓ Conexão OK", description: "Servidor Evolution respondeu com sucesso." + (result.manager?.ok ? " Manager também acessível." : "") });
      } else {
        const err = (!result.server.ok ? result.server.error : result.manager?.error) || "Falha na conexão.";
        toast({ title: "Falha ao conectar", description: err, variant: "destructive" });
      }
    } catch (e: any) {
      const err = e?.message || "Erro ao testar conexão.";
      setTestResult({ ok: false, server: { ok: false, error: err }, manager: null });
      toast({ title: "Erro ao testar", description: err, variant: "destructive" });
    } finally {
      setTestingConnection(false);
    }
  };

  const refreshSessions = async () => {
    const { data: sessionsData } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("created_at", { ascending: false });

    if (sessionsData) {
      setSessions(sessionsData);
      await syncSessionStatus(sessionsData);
    }
  };

  const getResolvedWebhookUrl = (customWebhookUrl?: string | null) => {
    return (customWebhookUrl || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`).trim();
  };

  const buildEvolutionHeaders = (apiKey?: string | null) => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const cleanApiKey = String(apiKey || '').trim();
    if (cleanApiKey) {
      // Evolution API v2 usa o header lowercase "apikey".
      headers['apikey'] = cleanApiKey;
    }
    return headers;
  };

  const callEvolutionManager = async (body: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke('evolution-manager', { body });
    if (error) throw new Error(error.message || 'Erro ao comunicar com o gerenciador Evolution');
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const syncSessionWebhook = async (
    sessionName: string,
    base: string,
    headers: Record<string, string>,
    customWebhookUrl?: string | null,
  ) => {
    const resolvedWebhookUrl = getResolvedWebhookUrl(customWebhookUrl);
    const cacheKey = `${sessionName}:${resolvedWebhookUrl}`;
    if (webhookSyncCacheRef.current[cacheKey]) return;

    const body = JSON.stringify({
      webhook: {
        enabled: true,
        url: resolvedWebhookUrl,
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      },
    });

    // Evolution API v2: POST /webhook/set/{instance}
    try {
      const response = await fetch(
        `${base}/webhook/set/${encodeURIComponent(sessionName)}`,
        { method: 'POST', headers, body },
      );
      if (response.ok || [200, 201, 202, 204].includes(response.status)) {
        webhookSyncCacheRef.current[cacheKey] = true;
      }
    } catch (error) {
      console.warn(`Erro ao sincronizar webhook da sessão ${sessionName}:`, error);
    }
  };

  const syncSessionStatus = async (sessionsToSync: any[]) => {
    for (const session of sessionsToSync) {
      try {
        await callEvolutionManager({
          action: 'status',
          estabelecimentoId,
          sessionId: session.id,
          sessionName: session.session_name,
        });
      } catch (error) {
        console.error(`Erro ao sincronizar status da sessão ${session.session_name}:`, error);
      }
    }

    const { data: updatedSessions } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("created_at", { ascending: false });

    if (updatedSessions) {
      setSessions(updatedSessions);
    }
  };

  const saveConfig = async () => {
    if (!evolutionUrl.trim()) {
      toast({
        title: "Erro",
        description: "URL do Servidor Evolution é obrigatória",
        variant: "destructive",
      });
      return;
    }
    if (!evolutionApiKey.trim()) {
      toast({
        title: "Erro",
        description: "A apikey do Evolution é obrigatória",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: existingConfig } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      const payload = {
        evolution_url: evolutionUrl.trim(),
        evolution_api_key: evolutionApiKey.trim(),
        evolution_mode: evolutionMode,
        webhook_url: webhookUrl || null,
        manager_url: managerUrl || null,
      } as any;

      if (existingConfig) {
        const { error } = await supabase
          .from("whatsapp_config")
          .update(payload)
          .eq("id", existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_config")
          .insert({ estabelecimento_id: estabelecimentoId, ...payload });

        if (error) throw error;
      }
      
      webhookSyncCacheRef.current = {};
      toast({
        title: "✓ Configuração salva!",
        description: "Servidor Evolution configurado com sucesso.",
      });
      setShowConfigDialog(false);
      await loadConfig();
      await refreshSessions();
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSessionName) {
      toast({
        title: "Erro",
        description: "Nome da sessão é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!config) {
      toast({
        title: "Erro",
        description: "Configure o servidor Evolution primeiro",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .insert({
          estabelecimento_id: estabelecimentoId,
          session_name: newSessionName,
          status: "STOPPED",
        })
        .select()
        .single();

      if (error) throw error;

      await startSession(data.id, newSessionName);
      
      toast({
        title: "✓ Sessão criada!",
        description: "Sessão criada com sucesso!",
      });
      setShowNewSessionDialog(false);
      setNewSessionName("");
      await refreshSessions();
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar sessão",
        variant: "destructive",
      });
    }
  };

  const startSession = async (sessionId: string, sessionName: string) => {
    try {
      const result = await callEvolutionManager({
        action: 'start',
        estabelecimentoId,
        sessionId,
        sessionName,
        webhookUrl: getResolvedWebhookUrl(config?.webhook_url),
      });
      if (result?.qrCode) {
        setSelectedQrSession({
          id: sessionId,
          session_name: sessionName,
          phone_number: null,
          status: 'SCAN_QR_CODE',
          qr_code: result.qrCode,
          bot_flow_id: null,
        });
      }
      await refreshSessions();
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao iniciar sessão na Evolution',
        variant: 'destructive',
      });
    }
  };

  const getQRCode = async (sessionId: string, sessionName: string) => {
    try {
      await callEvolutionManager({
        action: 'qr',
        estabelecimentoId,
        sessionId,
        sessionName,
      });
      await refreshSessions();
    } catch (error: any) {
      console.error('Error getting QR code:', error);
      toast({
        title: "Erro",
        description: error.message || 'Erro ao obter QR code',
        variant: "destructive",
      });
    }
  };

  const requestDeleteSession = async (sessionId: string) => {
    setSessionToDelete(sessionId);
    setSessionUsages([]);
    setCheckingUsage(true);
    try {
      const session = sessions.find(s => s.id === sessionId);
      const { checkWhatsappSessionUsage } = await import('@/lib/whatsapp/sessionUsage');
      const usages = await checkWhatsappSessionUsage(sessionId, session?.session_name || null);
      setSessionUsages(usages);
    } catch (e) {
      console.error('Erro ao verificar uso da sessão:', e);
    } finally {
      setCheckingUsage(false);
    }
  };

  const deleteSession = async () => {
    if (!sessionToDelete) return;
    if (sessionUsages.length > 0) {
      toast({
        title: 'Não é possível excluir',
        description: 'A sessão está vinculada a workflows. Altere os blocos para outra sessão antes de excluir.',
        variant: 'destructive',
      });
      return;
    }


    try {
      const session = sessions.find(s => s.id === sessionToDelete);
      if (!session) return;

      const headers: Record<string, string> = {
        ...buildEvolutionHeaders(config?.evolution_api_key),
      };

      const base = config?.evolution_url?.replace(/\/+$/, '') || '';

      // Evolution API v2: logout e delete de instância
      const instance = encodeURIComponent(session.session_name);
      try {
        const resp = await fetch(`${base}/instance/logout/${instance}`, { method: 'DELETE', headers });
        if (!resp.ok && resp.status !== 404) console.warn('logout status', resp.status);
      } catch (e) {}

      await new Promise(r => setTimeout(r, 500));

      let deletedOnServer = false;
      try {
        const resp = await fetch(`${base}/instance/delete/${instance}`, { method: 'DELETE', headers });
        if (resp.ok || resp.status === 404) deletedOnServer = true;
      } catch (e) {}

      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', sessionToDelete);

      toast({
        title: '✓ Sessão excluída!',
        description: deletedOnServer
          ? 'Sessão excluída da Evolution e do banco de dados'
          : 'Sessão removida do app',
      });
      setSessionToDelete(null);
      await refreshSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir sessão',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      "STOPPED": { variant: "secondary", label: "Parado" },
      "SCAN_QR_CODE": { variant: "outline", label: "Escaneie QR Code" },
      "WORKING": { variant: "default", label: "Conectado" },
      "FAILED": { variant: "destructive", label: "Falhou" },
    };

    const info = statusMap[status] || { variant: "outline", label: status };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const getDiagnosticBadge = (status: EvolutionDiagnosticStatus) => {
    const map: Record<EvolutionDiagnosticStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      ok: { variant: "default", label: "OK" },
      warning: { variant: "secondary", label: "Atenção" },
      error: { variant: "destructive", label: "Erro" },
      info: { variant: "outline", label: "Info" },
    };
    const item = map[status];
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const runEvolutionDiagnostic = async () => {
    const session = sessions.find((item) => item.id === diagnosticSessionId);
    const phone = diagnosticPhone.replace(/\D/g, "");

    if (!session) {
      toast({ title: "Selecione uma sessão", description: "Escolha a sessão Evolution que será testada.", variant: "destructive" });
      return;
    }
    if (!phone || phone.length < 10) {
      toast({ title: "WhatsApp inválido", description: "Informe o número com DDD para receber a mensagem de teste.", variant: "destructive" });
      return;
    }

    setDiagnosticRunning(true);
    setDiagnosticReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-manager", {
        body: {
          action: "diagnose",
          estabelecimentoId,
          sessionId: session.id,
          sessionName: session.session_name,
          webhookUrl: getResolvedWebhookUrl(config?.webhook_url),
          testPhone: phone,
          testMessage: diagnosticMessage.trim() || undefined,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const report = data as EvolutionDiagnosticReport;
      setDiagnosticReport(report);
      toast({
        title: report.likely
          ? "Diagnóstico concluído (aguardando ACK)"
          : report.ok
          ? "Diagnóstico concluído"
          : "Diagnóstico encontrou bloqueio",
        description: report.conclusion || "Verifique as etapas do painel.",
        variant: report.ok ? "default" : "destructive",
      });
    } catch (error: any) {
      const message = error?.message || "Erro ao executar diagnóstico.";
      setDiagnosticReport({
        ok: false,
        conclusion: message,
        steps: [{ id: "invoke", title: "Chamada do diagnóstico", status: "error", message }],
      });
      toast({ title: "Erro no diagnóstico", description: message, variant: "destructive" });
    } finally {
      setDiagnosticRunning(false);
    }
  };

  const copyDiagnosticReport = async () => {
    if (!diagnosticReport) return;
    await navigator.clipboard.writeText(JSON.stringify(diagnosticReport, null, 2));
    sonnerToast.success("Relatório copiado!");
  };

  return (
    <div className="space-y-6">
      <CanalGuiaPassoAPasso
        titulo="Como configurar o WhatsApp via Evolution API"
        descricao="Aqui você conecta um número comum de WhatsApp por QR Code, através de um servidor Evolution API."
        passos={[
          { titulo: "Tenha um servidor Evolution API", descricao: "Use um servidor próprio (Docker/VPS) ou um provedor que hospede a Evolution API v2. Anote a URL pública, ex.: https://evolution.suaempresa.com.br", link: { label: "Documentação Evolution API", url: "https://doc.evolution-api.com/" } },
          { titulo: "Copie a apikey global", descricao: "É a variável AUTHENTICATION_API_KEY definida no arquivo .env / docker-compose do servidor Evolution. Se usa provedor, ela aparece no painel do serviço." },
          { titulo: "Configure o servidor", descricao: "Clique em 'Configurar Servidor', cole o Endpoint e a apikey, escolha o modo (Produção ou Sandbox) e use 'Testar conexão' antes de salvar." },
          { titulo: "Confirme a URL do Webhook", descricao: "Deixe a URL de webhook padrão sugerida — é ela que entrega as mensagens recebidas ao CRM. Só altere se usar um proxy próprio." },
          { titulo: "Crie a sessão e leia o QR Code", descricao: "Clique em 'Nova Sessão', dê um nome (ex.: comercial) e leia o QR Code no celular em WhatsApp → Aparelhos conectados → Conectar aparelho. O status muda para WORKING." },
          { titulo: "Vincule o bot e teste", descricao: "Escolha o fluxo de bot da sessão e use o Diagnóstico de envio para enviar uma mensagem de teste e validar ponta a ponta." },
        ]}
        campos={[
          { campo: "Endpoint do Servidor Evolution", onde: "URL pública onde a Evolution API está publicada (sem barra no final).", exemplo: "https://evolution.suaempresa.com.br" },
          { campo: "apikey", onde: "Valor de AUTHENTICATION_API_KEY do servidor Evolution (ou a chave exibida no painel do provedor)." },
          { campo: "Modo do servidor", onde: "Produção para o número oficial da empresa; Sandbox para testes." },
          { campo: "URL do Manager", onde: "Endereço do painel web da Evolution, normalmente o endpoint + /manager.", exemplo: "https://evolution.suaempresa.com.br/manager" },
          { campo: "URL do Webhook", onde: "Endereço do CRM que recebe as mensagens. Use o valor padrão sugerido pelo sistema." },
          { campo: "Nome da Sessão", onde: "Nome livre para identificar o número/instância (sem espaços ou acentos).", exemplo: "comercial" },
        ]}
      />

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Gerencie instâncias do Evolution API para múltiplos números de WhatsApp
        </p>
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {config ? "Editar Servidor" : "Configurar Servidor"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configuração do Servidor Evolution API</DialogTitle>
              <DialogDescription>
                Configure a URL e a apikey do seu servidor Evolution API
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="evolution-url">Endpoint do Servidor Evolution</Label>
                <Input
                  id="evolution-url"
                  placeholder="https://evolution.exemplo.com"
                  value={evolutionUrl}
                  onChange={(e) => { setEvolutionUrl(e.target.value); setTestResult(null); }}
                />
                <p className="text-xs text-muted-foreground">
                  Base URL da Evolution API v2 (sem barra no final).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evolution-key">apikey (obrigatória)</Label>
                <div className="relative">
                  <Input
                    id="evolution-key"
                    type={showEvolutionKey ? "text" : "password"}
                    placeholder="Sua apikey global do Evolution"
                    value={evolutionApiKey}
                    onChange={(e) => { setEvolutionApiKey(e.target.value); setTestResult(null); }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEvolutionKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showEvolutionKey ? "Ocultar apikey" : "Mostrar apikey"}
                  >
                    {showEvolutionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Modo do servidor</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "producao", label: "Produção", desc: "Uso real com clientes" },
                    { id: "sandbox", label: "Sandbox", desc: "Ambiente de testes" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEvolutionMode(opt.id)}
                      className={`text-left rounded-md border p-3 transition-colors ${
                        evolutionMode === opt.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Testar conectividade</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={testEvolutionConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <><RefreshCw className="h-3 w-3 mr-2 animate-spin" /> Testando...</>
                    ) : (
                      <>Testar conexão</>
                    )}
                  </Button>
                </div>
                {testResult && (
                  <div className="space-y-2">
                    {/* Servidor Evolution */}
                    {testResult.server.ok ? (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-xs">
                          <strong>Servidor Evolution:</strong> conectado em {testResult.server.latency}ms
                          {typeof testResult.server.instances === "number"
                            ? ` • ${testResult.server.instances} instância(s)`
                            : ""}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>Servidor Evolution:</strong> {testResult.server.error || "Falha desconhecida."}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Manager */}
                    {testResult.manager ? (
                      testResult.manager.ok ? (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-xs">
                            <strong>Manager:</strong> acessível em {testResult.manager.latency}ms — apikey aceita.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Manager:</strong> {testResult.manager.error || "Falha ao acessar o Manager."}
                          </AlertDescription>
                        </Alert>
                      )
                    ) : (
                      managerUrl.trim() ? null : (
                        <p className="text-[11px] text-muted-foreground pl-1">
                          URL do Manager não informada — teste ignorado para o Manager.
                        </p>
                      )
                    )}

                    {/* Lista de instâncias */}
                    {testResult.server.list && testResult.server.list.length > 0 && (
                      <div className="rounded-md border max-h-64 overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="text-left px-2 py-1.5 font-medium">Instância</th>
                              <th className="text-left px-2 py-1.5 font-medium">Status</th>
                              <th className="text-left px-2 py-1.5 font-medium">Número / Perfil</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testResult.server.list.map((inst, idx) => {
                              const s = String(inst.status || "").toLowerCase();
                              const color =
                                s === "open" || s === "working" || s === "connected"
                                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                  : s === "connecting" || s === "qr" || s === "pairing"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground";
                              return (
                                <tr key={idx} className="border-t">
                                  <td className="px-2 py-1.5 font-mono">{inst.name}</td>
                                  <td className="px-2 py-1.5">
                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
                                      {inst.status || "unknown"}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-muted-foreground">
                                    {inst.number || inst.profileName || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  A validação chama <code>GET /instance/fetchInstances</code> no servidor e, se informado, também no Manager, usando a apikey.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="manager-url">URL do Manager do Evolution</Label>
                  {managerUrl && (
                    <a
                      href={managerUrl.startsWith("http") ? managerUrl : `https://${managerUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir Manager
                    </a>
                  )}
                </div>
                <Input
                  id="manager-url"
                  placeholder="https://manager.evolution.exemplo.com"
                  value={managerUrl}
                  onChange={(e) => setManagerUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Endereço do painel administrativo (Manager) do Evolution API. O Manager autentica apenas com URL + apikey — não usa usuário/senha.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${webhookUrl ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-xs text-muted-foreground">
                      {webhookUrl ? 'Customizado' : 'Padrão'}
                    </span>
                  </div>
                </div>
                <Input
                  id="webhook-url"
                  placeholder={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWebhookUrl("")}
                  className="text-xs"
                >
                  Restaurar Padrão
                </Button>
              </div>
              <Button onClick={saveConfig} className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {config && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Sessões WhatsApp</CardTitle>
              <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Sessão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Sessão WhatsApp</DialogTitle>
                    <DialogDescription>
                      Crie uma nova sessão para conectar um número de WhatsApp
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-name">Nome da Sessão</Label>
                      <Input
                        id="session-name"
                        placeholder="ex: atendimento-01"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                      />
                    </div>
                    <Button onClick={createSession} className="w-full">
                      Criar Sessão
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              Gerencie as sessões de WhatsApp conectadas ao servidor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        <CardTitle className="text-base">{session.session_name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => requestDeleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <CardDescription>
                      {session.phone_number || "Aguardando conexão"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                  {getStatusBadge(session.status)}
                  {session.status === "SCAN_QR_CODE" && session.qr_code ? (
                    <div className="space-y-2">
                      <div className="flex justify-center p-2">
                        <img
                          src={session.qr_code}
                          alt={`QR Code da sessão ${session.session_name}`}
                          className="w-48 h-48 rounded-2xl border"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="w-full rounded-full"
                        size="sm"
                        onClick={() => getQRCode(session.id, session.session_name)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regerar QR
                      </Button>
                    </div>
                  ) : session.status !== 'WORKING' ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      size="sm"
                      onClick={() => startSession(session.id, session.session_name)}
                    >
                      Gerar QR
                    </Button>
                  ) : null}
                  {session.bot_flow_id && (() => {
                    const linkedBot = bots.find(b => b.id === session.bot_flow_id);
                    const isConnected = session.status === 'WORKING';
                    return linkedBot ? (
                      <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                        isConnected ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                      }`}>
                        {isConnected ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${isConnected ? 'text-green-900' : 'text-amber-900'}`}>
                            {isConnected ? 'Bot Vinculado' : 'Bot vinculado, aguardando conexão'}
                          </p>
                          <p className={`text-xs ${isConnected ? 'text-green-700' : 'text-amber-700'}`}>
                            {linkedBot.name}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  <div className="space-y-1 border-t pt-2">
                    <Label className="text-xs flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Reconexão preventiva
                    </Label>
                    <Select
                      value={String(session.auto_reconnect_days ?? 7)}
                      onValueChange={async (v) => {
                        const days = Number(v);
                        const { error } = await supabase
                          .from("whatsapp_sessions")
                          .update({ auto_reconnect_days: days })
                          .eq("id", session.id);
                        if (error) {
                          sonnerToast.error("Falha ao salvar reconexão preventiva.");
                        } else {
                          sonnerToast.success(
                            days === 0
                              ? "Reconexão preventiva desativada."
                              : `Reconecta a cada ${days} dias.`,
                          );
                          refreshSessions();
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Desligada</SelectItem>
                        <SelectItem value="3">A cada 3 dias</SelectItem>
                        <SelectItem value="7">A cada 7 dias (recomendado)</SelectItem>
                        <SelectItem value="15">A cada 15 dias</SelectItem>
                        <SelectItem value="30">A cada 30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                    {session.last_reconnect_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Última: {new Date(session.last_reconnect_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {config && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bug className="h-5 w-5" />
                  Diagnóstico de envio Evolution
                </CardTitle>
                <CardDescription>
                  Valida servidor, instância, webhook, envio, JID e confirmação no histórico do Evolution.
                </CardDescription>
              </div>
              {diagnosticReport && (
                <Button type="button" variant="outline" size="sm" onClick={copyDiagnosticReport}>
                  Copiar relatório
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-2">
                <Label>Sessão para testar</Label>
                <Select value={diagnosticSessionId} onValueChange={(value) => { setDiagnosticSessionId(value); setDiagnosticReport(null); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a sessão" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.session_name} • {session.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnostic-phone">WhatsApp que deve receber o teste</Label>
                <Input
                  id="diagnostic-phone"
                  placeholder="Ex: 5511999999999"
                  value={diagnosticPhone}
                  onChange={(event) => { setDiagnosticPhone(event.target.value); setDiagnosticReport(null); }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnostic-message">Mensagem de teste</Label>
              <Input
                id="diagnostic-message"
                value={diagnosticMessage}
                onChange={(event) => setDiagnosticMessage(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                O teste envia uma mensagem real e tenta confirmar no histórico do Evolution. Se ficar PENDING/ERROR depois de aceito, o gargalo está no Evolution/WhatsApp/sessão.
              </p>
              <Button type="button" onClick={runEvolutionDiagnostic} disabled={diagnosticRunning || sessions.length === 0}>
                {diagnosticRunning ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Diagnosticando...</>
                ) : (
                  <><PlayCircle className="h-4 w-4 mr-2" /> Rodar diagnóstico</>
                )}
              </Button>
            </div>

            {diagnosticReport && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {diagnosticReport.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                      <h3 className="text-sm font-semibold">Conclusão</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{diagnosticReport.conclusion}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {diagnosticReport.providerStatus && <Badge variant="outline">Status: {diagnosticReport.providerStatus}</Badge>}
                    {diagnosticReport.usedNumber && <Badge variant="outline">Destino: {diagnosticReport.usedNumber}</Badge>}
                    {diagnosticReport.messageId && <Badge variant="outline">ID: {diagnosticReport.messageId}</Badge>}
                  </div>
                </div>

                <div className="space-y-3">
                  {diagnosticReport.steps.map((step, index) => (
                    <div key={`${step.id}-${index}`} className="rounded-md border bg-background p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">{step.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {typeof step.latency === "number" && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" /> {step.latency}ms
                            </span>
                          )}
                          {getDiagnosticBadge(step.status)}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{step.message}</p>
                      {step.details ? (
                        <details className="mt-2 rounded border bg-muted/40 p-2 text-xs">
                          <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(step.details, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!config && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Configure o servidor Evolution para começar
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedQrSession} onOpenChange={() => setSelectedQrSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
            <DialogDescription>
              Use o WhatsApp no seu celular para escanear o código
            </DialogDescription>
          </DialogHeader>
          {selectedQrSession?.qr_code && (
            <div className="flex justify-center p-4">
              <img
                src={selectedQrSession.qr_code}
                alt="QR Code"
                className="w-64 h-64 rounded-2xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!sessionToDelete} onOpenChange={() => { setSessionToDelete(null); setSessionUsages([]); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Sessão</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                {checkingUsage ? (
                  <p>Verificando vínculos com workflows...</p>
                ) : sessionUsages.length > 0 ? (
                  <>
                    <p className="text-destructive font-medium">
                      Esta sessão não pode ser excluída porque está vinculada aos seguintes workflows:
                    </p>
                    <ul className="max-h-48 overflow-auto rounded-md border p-2 space-y-1">
                      {sessionUsages.map((u, i) => (
                        <li key={`${u.tipo}-${u.id}-${i}`} className="flex flex-col">
                          <span className="font-medium">{u.nome}</span>
                          <span className="text-xs text-muted-foreground">{u.tipo}</span>
                        </li>
                      ))}
                    </ul>
                    <p>
                      Para excluir, edite cada workflow acima e mude o bloco de WhatsApp para outra sessão.
                    </p>
                  </>
                ) : (
                  <p>Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSession}
              disabled={checkingUsage || sessionUsages.length > 0}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Facebook Messenger Config
function FacebookConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [pageId, setPageId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeBots, setActiveBots] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveBots();
  }, [estabelecimentoId]);

  const loadActiveBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_flows')
        .select('id, name')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true)
        .contains('canais', ['facebook'])
        .order('name');

      if (error) throw error;
      setActiveBots(data || []);
    } catch (error) {
      console.error('Erro ao carregar bots ativos:', error);
    }
  };

  const handleSave = () => {
    if (!pageId || !pageAccessToken) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Configuração do Facebook salva!" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facebook Messenger</CardTitle>
        <CardDescription>Configure a integração com o Facebook Messenger</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeBots.length > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <Power className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-green-900 font-medium">Bots Ativos:</span>
                  {activeBots.map(bot => (
                    <Badge key={bot.id} variant="default" className="bg-green-600">
                      {bot.name}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {activeBots.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O bot será vinculado automaticamente ao ativar na tela de Criar Bot
              </AlertDescription>
            </Alert>
          )}

        <CanalGuiaPassoAPasso
          titulo="Como obter os dados do Facebook Messenger"
          descricao="Todos os dados são gerados no app criado no Meta for Developers, vinculado à Página da sua empresa."
          passos={[
            { titulo: "Tenha uma Página do Facebook", descricao: "Use a Página oficial da empresa (não perfil pessoal). Você precisa ser Administrador dela." },
            { titulo: "Crie o app no Meta for Developers", descricao: "Acesse Meus Apps → Criar app → tipo 'Empresa' e adicione o produto 'Messenger'.", link: { label: "Meta for Developers", url: "https://developers.facebook.com/apps/" } },
            { titulo: "Conecte a Página ao app", descricao: "Em Messenger → Configurações da API do Messenger, clique em 'Adicionar ou remover Páginas' e selecione a Página da empresa." },
            { titulo: "Gere o Page Access Token", descricao: "Ainda em Configurações da API do Messenger, clique em 'Gerar token' na linha da Página. Copie o token completo (começa com EAA...)." },
            { titulo: "Copie o Page ID", descricao: "Na Página do Facebook: Sobre → Transparência da página → Identificação da Página. Ou no próprio painel do Messenger, ao lado do nome da Página." },
            { titulo: "Pegue o App Secret", descricao: "Em Configurações do app → Básico → Chave Secreta do App → Mostrar. Use-a para validar a assinatura dos webhooks." },
            { titulo: "Salve e ative o bot", descricao: "Salve a configuração aqui e, em Criar Bot, ative um fluxo com o canal Facebook selecionado." },
          ]}
          campos={[
            { campo: "Page ID", onde: "Página do Facebook → Sobre → Transparência da página → Identificação da Página.", exemplo: "123456789012345" },
            { campo: "Page Access Token", onde: "Meta for Developers → Messenger → Configurações da API → botão 'Gerar token' da Página.", exemplo: "EAAxxxxxxxxxx" },
            { campo: "App Secret", onde: "Meta for Developers → Configurações → Básico → Chave Secreta do App.", exemplo: "a1b2c3d4e5f6..." },
          ]}
          docUrl="https://developers.facebook.com/docs/messenger-platform/getting-started"
          docLabel="Documentação Messenger Platform"
        />


        <div className="space-y-2">
          <Label htmlFor="fb-page-id">Page ID *</Label>
          <Input
            id="fb-page-id"
            placeholder="123456789012345"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-token">Page Access Token *</Label>
          <Input
            id="fb-token"
            type="password"
            placeholder="EAAxxxxxxxxxx"
            value={pageAccessToken}
            onChange={(e) => setPageAccessToken(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-secret">App Secret (opcional)</Label>
          <Input
            id="fb-secret"
            type="password"
            placeholder="abc123..."
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

// Instagram Config
function InstagramConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeBots, setActiveBots] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveBots();
  }, [estabelecimentoId]);

  const loadActiveBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_flows')
        .select('id, name')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true)
        .contains('canais', ['instagram'])
        .order('name');

      if (error) throw error;
      setActiveBots(data || []);
    } catch (error) {
      console.error('Erro ao carregar bots ativos:', error);
    }
  };

  const handleSave = () => {
    if (!instagramAccountId || !accessToken) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Configuração do Instagram salva!" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instagram Direct</CardTitle>
        <CardDescription>Configure a integração com o Instagram</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeBots.length > 0 && (
          <Alert className="bg-green-50 border-green-200">
            <Power className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-900 font-medium">Bots Ativos:</span>
                {activeBots.map(bot => (
                  <Badge key={bot.id} variant="default" className="bg-green-600">
                    {bot.name}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {activeBots.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O bot será vinculado automaticamente ao ativar na tela de Criar Bot
            </AlertDescription>
          </Alert>
        )}

        <CanalGuiaPassoAPasso
          titulo="Como obter os dados do Instagram Direct"
          descricao="Os dados vêm do Meta for Developers, usando a conta profissional do Instagram vinculada a uma Página do Facebook."
          passos={[
            { titulo: "Transforme o perfil em Comercial/Criador", descricao: "No app do Instagram: Configurações → Tipo de conta e ferramentas → Mudar para conta profissional." },
            { titulo: "Vincule o Instagram a uma Página do Facebook", descricao: "Em Configurações do Instagram → Central de Contas, conecte o perfil à Página do Facebook da empresa (obrigatório para a API)." },
            { titulo: "Crie/abra o app no Meta for Developers", descricao: "Crie um app do tipo Empresa e adicione os produtos 'Instagram' e 'Login do Facebook'.", link: { label: "Meta for Developers", url: "https://developers.facebook.com/apps/" } },
            { titulo: "Gere o Access Token", descricao: "Em Ferramentas → Explorador da API do Graph, selecione seu app e a Página, e autorize os escopos instagram_basic, instagram_manage_messages, pages_manage_metadata e pages_show_list. Troque por um token de longa duração." },
            { titulo: "Descubra o Instagram Business Account ID", descricao: "No Explorador da API do Graph, chame GET /me/accounts para achar o page-id e depois GET /{page-id}?fields=instagram_business_account — o campo 'id' retornado é o seu Instagram Business Account ID." },
            { titulo: "Ative as mensagens", descricao: "No Instagram: Configurações → Mensagens → Controles de mensagens → ative 'Permitir acesso a mensagens' para apps conectados. Depois salve aqui e ative um bot com o canal Instagram." },
          ]}
          campos={[
            { campo: "Instagram Business Account ID", onde: "Retorno de GET /{page-id}?fields=instagram_business_account no Explorador da API do Graph.", exemplo: "17841400000000000" },
            { campo: "Access Token", onde: "Token de longa duração da Página gerado no Explorador da API do Graph com os escopos de mensagens do Instagram.", exemplo: "IGQVJ... / EAAG..." },
          ]}
          docUrl="https://developers.facebook.com/docs/messenger-platform/instagram"
          docLabel="Documentação Instagram Messaging"
        />


        <div className="space-y-2">
          <Label htmlFor="ig-account">Instagram Business Account ID *</Label>
          <Input
            id="ig-account"
            placeholder="17841400000000000"
            value={instagramAccountId}
            onChange={(e) => setInstagramAccountId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ig-token">Access Token *</Label>
          <Input
            id="ig-token"
            type="password"
            placeholder="IGxxxxxxxxxx"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

// Telegram Config
function TelegramConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeBots, setActiveBots] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveBots();
  }, [estabelecimentoId]);

  const loadActiveBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_flows')
        .select('id, name')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true)
        .contains('canais', ['telegram'])
        .order('name');

      if (error) throw error;
      setActiveBots(data || []);
    } catch (error) {
      console.error('Erro ao carregar bots ativos:', error);
    }
  };

  const handleSave = () => {
    if (!botToken) {
      toast({
        title: "Erro",
        description: "Token do bot é obrigatório",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Configuração do Telegram salva!" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram Bot</CardTitle>
        <CardDescription>Configure a integração com o Telegram</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeBots.length > 0 && (
          <Alert className="bg-green-50 border-green-200">
            <Power className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-900 font-medium">Bots Ativos:</span>
                {activeBots.map(bot => (
                  <Badge key={bot.id} variant="default" className="bg-green-600">
                    {bot.name}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {activeBots.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O bot será vinculado automaticamente ao ativar na tela de Criar Bot
            </AlertDescription>
          </Alert>
        )}

        <CanalGuiaPassoAPasso
          titulo="Como obter o Bot Token do Telegram"
          descricao="Todo o processo é feito dentro do próprio Telegram, com o @BotFather."
          passos={[
            { titulo: "Abra o @BotFather", descricao: "No Telegram, pesquise por @BotFather (perfil oficial com selo azul) e inicie a conversa com /start.", link: { label: "Abrir @BotFather", url: "https://t.me/BotFather" } },
            { titulo: "Crie o bot", descricao: "Envie /newbot e informe o nome de exibição do bot e, em seguida, um username único terminado em 'bot' (ex.: pilar_atendimento_bot)." },
            { titulo: "Copie o token", descricao: "O BotFather responde com 'Use this token to access the HTTP API'. Copie a sequência completa e cole no campo Bot Token abaixo." },
            { titulo: "Ajuste a privacidade (opcional)", descricao: "Para o bot ler mensagens em grupos, envie /setprivacy, escolha o bot e selecione Disable." },
            { titulo: "Salve e vincule o bot", descricao: "Clique em Salvar Configuração. Depois, em Criar Bot, ative um fluxo com o canal Telegram selecionado." },
          ]}
          campos={[
            { campo: "Bot Token", onde: "Gerado pelo @BotFather ao criar o bot. Se perder, envie /mybots → seu bot → API Token.", exemplo: "123456789:AAF-xxxxxxxxxxxxxxxxxxxxxxxxxxx" },
          ]}
          docUrl="https://core.telegram.org/bots/features#botfather"
          docLabel="Documentação oficial do Telegram Bots"
        />

        <div className="space-y-2">

          <Label htmlFor="tg-token">Bot Token *</Label>
          <Input
            id="tg-token"
            type="password"
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Obtenha seu token com o @BotFather no Telegram
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

// WebChat Config
function WebChatConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [widgetColor, setWidgetColor] = useState("#10b981");
  const [welcomeMessage, setWelcomeMessage] = useState("Olá! Como posso ajudar?");
  const [widgetTitle, setWidgetTitle] = useState("Atendimento");
  const [widgetPosition, setWidgetPosition] = useState<"right" | "left">("right");
  const [loading, setLoading] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeBots, setActiveBots] = useState<any[]>([]);
  const [previewMessages, setPreviewMessages] = useState<any[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [sessionContext, setSessionContext] = useState<any>({ vars: {} });
  const { toast } = useToast();

  useEffect(() => {
    loadActiveBots();
  }, [estabelecimentoId]);

  useEffect(() => {
    if (showPreview && activeBots.length > 0) {
      initializePreview();
    }
  }, [showPreview, activeBots]);

  const loadActiveBots = async () => {
    try {
      console.log('🔍 WebChat: Carregando bots ativos para estabelecimento:', estabelecimentoId);
      
      const { data, error } = await supabase
        .from('bot_flows')
        .select('id, name, canais, active, flow_data')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true)
        .order('name');

      console.log('📦 WebChat: Todos os bots ativos:', data);

      if (error) {
        console.error('❌ WebChat: Erro ao carregar bots:', error);
        throw error;
      }

      // Filtrar apenas bots que têm 'webchat' no array de canais
      const webchatBots = (data || []).filter(bot => 
        bot.canais && Array.isArray(bot.canais) && bot.canais.includes('webchat')
      );

      console.log('✅ WebChat: Bots filtrados para WebChat:', webchatBots);
      
      // Extrair nodes e edges do flow_data para cada bot
      const botsWithFlowData = webchatBots.map(bot => {
        const flowData = bot.flow_data as any;
        return {
          ...bot,
          nodes: flowData?.nodes || [],
          edges: flowData?.edges || []
        };
      });
      
      setActiveBots(botsWithFlowData);
    } catch (error) {
      console.error('❌ WebChat: Erro ao carregar bots ativos:', error);
      setActiveBots([]);
    }
  };

  const initializePreview = async () => {
    if (activeBots.length === 0) return;

    setPreviewMessages([{
      id: 'welcome',
      text: welcomeMessage,
      sender: 'bot',
      timestamp: new Date(),
    }]);
    setSessionContext({ vars: {} });

    // Executar o bot a partir do nó start
    const bot = activeBots[0];
    await executeBot(bot, '', true);
  };

  const executeBot = async (bot: any, userMessage: string, isStart = false) => {
    try {
      const { FlowEngine } = await import('@/services/flowEngine');
      
      const context = {
        vars: sessionContext.vars,
        userMessage,
        sessionId: 'preview-session',
      };

      const responses: any[] = [];
      
      const engine = new FlowEngine(
        bot.nodes || [],
        bot.edges || [],
        context,
        async (response: any) => {
          responses.push(response);
        }
      );

      await engine.execute();

      // Processar respostas
      for (const response of responses) {
        if (response.type === 'message' || response.type === 'question') {
          const botMessage = {
            id: Date.now().toString() + Math.random(),
            text: response.content || response.question || '',
            sender: 'bot',
            timestamp: new Date(),
            buttons: response.buttons,
          };
          setPreviewMessages(prev => [...prev, botMessage]);
        } else if (response.type === 'buttons') {
          const botMessage = {
            id: Date.now().toString() + Math.random(),
            text: response.content || '',
            sender: 'bot',
            timestamp: new Date(),
            buttons: response.buttons,
            sections: response.sections,
            cards: response.cards,
          };
          setPreviewMessages(prev => [...prev, botMessage]);
        }
      }

      // Atualizar contexto
      setSessionContext({ vars: context.vars });
    } catch (error) {
      console.error('Erro ao executar bot:', error);
      setPreviewMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'Erro ao processar mensagem. Tente novamente.',
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }
  };

  const sendPreviewMessage = async () => {
    if (!previewInput.trim() || activeBots.length === 0) return;

    const userMessage = {
      id: Date.now().toString(),
      text: previewInput,
      sender: 'user',
      timestamp: new Date(),
    };

    setPreviewMessages(prev => [...prev, userMessage]);
    const messageText = previewInput;
    setPreviewInput("");

    await executeBot(activeBots[0], messageText);
  };

  const generateScript = () => {
    const baseUrl = window.location.origin;
    return `<!-- WebChat Widget -->
<script>
  (function() {
    var config = {
      estabelecimentoId: '${estabelecimentoId}',
      color: '${widgetColor}',
      title: '${widgetTitle}',
      welcomeMessage: '${welcomeMessage}',
      position: '${widgetPosition}',
      baseUrl: '${baseUrl}'
    };

    var css = \`
      #webchat-button {
        position: fixed;
        bottom: 20px;
        \${config.position}: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: \${config.color};
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        z-index: 999999;
        transition: transform 0.3s, box-shadow 0.3s;
      }
      #webchat-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }
      #webchat-container {
        position: fixed;
        bottom: 90px;
        \${config.position}: 20px;
        width: 380px;
        height: 600px;
        max-height: calc(100vh - 120px);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        overflow: hidden;
        z-index: 999998;
        display: none;
        background: white;
      }
      #webchat-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
      @media (max-width: 768px) {
        #webchat-container {
          width: calc(100vw - 40px);
          height: calc(100vh - 120px);
          bottom: 90px;
          \${config.position}: 20px;
        }
      }
    \`;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var button = document.createElement('button');
    button.id = 'webchat-button';
    button.innerHTML = '💬';
    button.onclick = function() {
      var container = document.getElementById('webchat-container');
      if (container.style.display === 'none' || !container.style.display) {
        container.style.display = 'block';
        button.innerHTML = '✕';
      } else {
        container.style.display = 'none';
        button.innerHTML = '💬';
      }
    };

    var container = document.createElement('div');
    container.id = 'webchat-container';
    
    var iframe = document.createElement('iframe');
    iframe.id = 'webchat-iframe';
    iframe.src = config.baseUrl + '/webchat?estabelecimento=' + config.estabelecimentoId + 
                 '&color=' + encodeURIComponent(config.color) + 
                 '&title=' + encodeURIComponent(config.title) + 
                 '&welcome=' + encodeURIComponent(config.welcomeMessage);
    
    container.appendChild(iframe);
    document.body.appendChild(button);
    document.body.appendChild(container);
  })();
</script>
<!-- Fim WebChat Widget -->`;
  };

  const copyScript = () => {
    const script = generateScript();
    navigator.clipboard.writeText(script);
    sonnerToast.success("Script copiado para a área de transferência!");
  };

  const handleSave = () => {
    toast({ title: "Configuração do WebChat salva!" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WebChat Widget</CardTitle>
          <CardDescription>Configure o widget de chat para seu site</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CanalGuiaPassoAPasso
          titulo="Como configurar o WebChat"
          descricao="O WebChat não exige credenciais externas: você personaliza o widget aqui e cola o script no seu site."
          passos={[
            { titulo: "Defina título e mensagem", descricao: "Preencha o Título do Widget (aparece no cabeçalho do chat) e a Mensagem de Boas-vindas exibida ao abrir a conversa." },
            { titulo: "Escolha cor e posição", descricao: "A Cor do Widget aceita o hexadecimal da identidade da sua marca (ex.: #10B981). A Posição define se o balão fica no canto direito ou esquerdo." },
            { titulo: "Salve a configuração", descricao: "Clique em Salvar Configuração para gerar o script com os parâmetros escolhidos." },
            { titulo: "Instale no site", descricao: "Copie o código de incorporação e cole antes do fechamento da tag </body> em todas as páginas do seu site. Em WordPress use um plugin de scripts no rodapé; em Shopify use Tema → Editar código → theme.liquid." },
            { titulo: "Vincule um bot (opcional)", descricao: "Em Criar Bot, ative um fluxo marcando o canal WebChat — a vinculação é automática e o bot passa a responder o widget." },
          ]}
          campos={[
            { campo: "Título do Widget", onde: "Texto livre — nome que o visitante vê no topo do chat.", exemplo: "Atendimento" },
            { campo: "Cor do Widget", onde: "Hexadecimal da cor principal da sua marca.", exemplo: "#10B981" },
            { campo: "Mensagem de Boas-vindas", onde: "Primeira mensagem automática enviada ao abrir o chat.", exemplo: "Olá! Como posso ajudar?" },
            { campo: "Posição do Widget", onde: "Canto da tela em que o balão será exibido (direita ou esquerda)." },
          ]}
        />

        {activeBots.length > 0 ? (
          <Alert className="bg-green-50 border-green-200">
            <Power className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-900 font-medium">Bots Ativos para WebChat:</span>
                {activeBots.map(bot => (
                  <Badge key={bot.id} variant="default" className="bg-green-600">
                    {bot.name}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Nenhum bot ativo para WebChat. O bot será vinculado automaticamente ao ativar na tela de Criar Bot com o canal WebChat selecionado.</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadActiveBots}
                  className="ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Atualizar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

          <div className="space-y-2">
            <Label htmlFor="widget-title">Título do Widget</Label>
            <Input
              id="widget-title"
              placeholder="Atendimento"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="widget-color">Cor do Widget</Label>
            <div className="flex gap-2">
              <Input
                id="widget-color"
                type="color"
                value={widgetColor}
                onChange={(e) => setWidgetColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={widgetColor}
                onChange={(e) => setWidgetColor(e.target.value)}
                placeholder="#10b981"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-msg">Mensagem de Boas-vindas</Label>
            <Input
              id="welcome-msg"
              placeholder="Olá! Como posso ajudar?"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Posição do Widget</Label>
            <div className="flex gap-2">
              <Button
                variant={widgetPosition === "right" ? "default" : "outline"}
                onClick={() => setWidgetPosition("right")}
                className="flex-1"
              >
                Direita
              </Button>
              <Button
                variant={widgetPosition === "left" ? "default" : "outline"}
                onClick={() => setWidgetPosition("left")}
                className="flex-1"
              >
                Esquerda
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Script de Incorporação
          </CardTitle>
          <CardDescription>
            Copie e cole este script no seu site (compatível com Tray e outros)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Para Tray.com.br:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                <li>Acesse o painel admin da sua loja Tray</li>
                <li>Vá em: Configurações → Layout → HTML do Rodapé</li>
                <li>Cole o script abaixo no final do código</li>
                <li>Clique em Salvar</li>
              </ol>
              <p className="mt-2 text-sm">
                <strong>Para outros sites:</strong> Cole o script antes da tag {'</body>'} do seu site.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button onClick={() => setShowScript(!showScript)} variant="outline" className="flex-1">
                {showScript ? "Ocultar Script" : "Mostrar Script"}
              </Button>
              <Button onClick={copyScript} className="flex-1">
                Copiar Script
              </Button>
            </div>

            {showScript && (
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{generateScript()}</code>
                </pre>
              </div>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>ID do Estabelecimento:</strong> <code className="bg-muted px-2 py-1 rounded">{estabelecimentoId}</code>
              <p className="mt-2">Este ID está incluído automaticamente no script.</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Veja como o widget ficará no seu site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted/30 rounded-lg p-8 min-h-[400px] border-2 border-dashed overflow-hidden">
            <p className="text-center text-muted-foreground mb-4">
              Simulação do seu site
            </p>
            
            {/* Conteúdo simulado do site */}
            <div className="space-y-3 max-w-md mx-auto">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-4/5"></div>
            </div>

            {/* Botão do WebChat */}
            <div 
              onClick={() => setShowPreview(true)}
              style={{
                position: 'absolute',
                bottom: '20px',
                [widgetPosition]: '20px',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: widgetColor,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'transform 0.3s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title={`${widgetTitle} - Clique para testar`}
            >
              💬
            </div>

            {/* Preview interativo do WebChat */}
            {showPreview && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '90px',
                  [widgetPosition]: '20px',
                  width: '350px',
                  height: '500px',
                  borderRadius: '12px',
                  background: 'white',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div 
                  style={{
                    background: widgetColor,
                    color: 'white',
                    padding: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {widgetTitle}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPreview(false);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '16px',
                    }}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Messages */}
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f5f5f5' }}>
                  {previewMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{
                        background: msg.sender === 'user' ? widgetColor : 'white',
                        color: msg.sender === 'user' ? 'white' : '#333',
                        padding: '12px',
                        borderRadius: '12px',
                        maxWidth: '80%',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}>
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.text}
                        </div>
                        {msg.buttons && msg.buttons.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {msg.buttons.map((btn: any, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  const userMsg = {
                                    id: Date.now().toString(),
                                    text: btn.text || btn.label,
                                    sender: 'user',
                                    timestamp: new Date(),
                                  };
                                  setPreviewMessages(prev => [...prev, userMsg]);
                                  executeBot(activeBots[0], btn.value || btn.text || btn.label);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  border: '1px solid #e5e5e5',
                                  borderRadius: '8px',
                                  background: 'white',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                }}
                              >
                                {btn.text || btn.label}
                              </button>
                            ))}
                          </div>
                        )}
                        <div style={{
                          fontSize: '11px',
                          marginTop: '4px',
                          opacity: 0.7,
                        }}>
                          {msg.timestamp.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeBots.length === 0 && (
                    <div style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#666',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      Nenhum bot ativo para WebChat. Ative um bot na tela "Criar Bot" com o canal WebChat selecionado.
                    </div>
                  )}
                </div>
                
                {/* Input */}
                <div style={{ padding: '12px', background: 'white', borderTop: '1px solid #e5e5e5' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Digite sua mensagem..."
                      value={previewInput}
                      onChange={(e) => setPreviewInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          sendPreviewMessage();
                        }
                      }}
                      disabled={activeBots.length === 0}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        outline: 'none',
                        background: activeBots.length === 0 ? '#f9f9f9' : 'white',
                        cursor: activeBots.length === 0 ? 'not-allowed' : 'text',
                      }}
                    />
                    <button
                      onClick={sendPreviewMessage}
                      disabled={!previewInput.trim() || activeBots.length === 0}
                      style={{
                        padding: '10px 16px',
                        background: widgetColor,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: activeBots.length === 0 || !previewInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: activeBots.length === 0 || !previewInput.trim() ? 0.5 : 1,
                      }}
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Posição: {widgetPosition === 'right' ? 'Direita' : 'Esquerda'} | Cor: {widgetColor}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export const CanaisAtendimentoCRUD = ({ estabelecimentoId: propEstabId }: CanaisAtendimentoCRUDProps) => {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  useEffect(() => {
    const loadEstabelecimento = async () => {
      const estabId = await getEstabelecimentoId(propEstabId);
      if (estabId) {
        setEstabelecimentoId(estabId);
      }
    };
    loadEstabelecimento();
  }, [propEstabId]);

  if (!estabelecimentoId) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Canais de Atendimento</h2>
        <p className="text-muted-foreground">
          Configure os canais de comunicação integrados ao sistema
        </p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="facebook" className="flex items-center gap-2">
            <Facebook className="w-4 h-4" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="w-4 h-4" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="webchat" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            WebChat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="whatsapp-meta">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-green-600" />
                  WhatsApp Business API (Meta)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <WhatsAppBusinessConfig estabelecimentoId={estabelecimentoId} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="whatsapp-evolution">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-blue-600" />
                  WhatsApp (Evolution API)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <WhatsAppEvolutionConfig estabelecimentoId={estabelecimentoId} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="facebook">
          <FacebookConfig estabelecimentoId={estabelecimentoId} />
        </TabsContent>

        <TabsContent value="instagram">
          <InstagramConfig estabelecimentoId={estabelecimentoId} />
        </TabsContent>

        <TabsContent value="telegram">
          <TelegramConfig estabelecimentoId={estabelecimentoId} />
        </TabsContent>

        <TabsContent value="webchat">
          <WebChatConfig estabelecimentoId={estabelecimentoId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
