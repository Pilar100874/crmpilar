import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { MessageSquare, Facebook, Instagram, Send, Globe, Radio, Smartphone, Plus, Trash2, RefreshCw, Save, AlertCircle, ExternalLink, Eye, EyeOff, Power, CheckCircle2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como Configurar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-semibold mb-1">1. Crie uma Conta Meta Business</h3>
              <p className="text-muted-foreground">
                Acesse business.facebook.com e crie uma conta de negócios
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">2. Configure WhatsApp Business</h3>
              <p className="text-muted-foreground">
                No Meta Business, adicione WhatsApp Business e configure seu número
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">3. Gere Token de Acesso</h3>
              <p className="text-muted-foreground">
                Em Configurações do App, gere um token de acesso permanente
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">4. Configure Webhook</h3>
              <p className="text-muted-foreground">
                Use a URL de webhook acima nas configurações do WhatsApp Business
              </p>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Documentação WhatsApp Business API
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// WhatsApp WAHA Config
function WhatsAppWAHAConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const webhookSyncCacheRef = useRef<Record<string, boolean>>({});
  
  const [wahaUrl, setWahaUrl] = useState("");
  const [wahaApiKey, setWahaApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [managerUrl, setManagerUrl] = useState("");
  const [managerUser, setManagerUser] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [selectedQrSession, setSelectedQrSession] = useState<WhatsAppSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sessionUsages, setSessionUsages] = useState<Array<{ tipo: string; nome: string; id: string }>>([]);
  const [checkingUsage, setCheckingUsage] = useState(false);

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
        if (cfg.waha_url) {
          setConfig(cfg);
          setWahaUrl(cfg.waha_url);
          setWahaApiKey(cfg.waha_api_key || "");
          setWebhookUrl(cfg.webhook_url || "");
          setManagerUrl(cfg.manager_url || "");
          setManagerUser(cfg.manager_user || "");
          setManagerPassword(cfg.manager_password || "");
        }
      }

      await refreshSessions();
    } catch (error) {
      console.error("Error loading config:", error);
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

  const buildWahaHeaders = (apiKey?: string | null) => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const cleanApiKey = String(apiKey || '').trim();
    if (cleanApiKey) {
      headers['x-api-key'] = cleanApiKey;
    }
    return headers;
  };

  const callWahaManager = async (body: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke('waha-manager', { body });
    if (error) throw new Error(error.message || 'Erro ao comunicar com o gerenciador WAHA');
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
      name: sessionName,
      config: {
        webhooks: [
          {
            url: resolvedWebhookUrl,
            events: ['message', 'message.any'],
          },
        ],
      },
    });

    const attempts = [
      { url: `${base}/api/sessions/${sessionName}`, method: 'PUT' },
      { url: `${base}/api/sessions/${sessionName}`, method: 'POST' },
    ];

    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt.url, { method: attempt.method, headers, body });
        if (response.ok || [200, 201, 202, 204].includes(response.status)) {
          webhookSyncCacheRef.current[cacheKey] = true;
          return;
        }
      } catch (error) {
        console.warn(`Erro ao sincronizar webhook da sessão ${sessionName}:`, error);
      }
    }
  };

  const syncSessionStatus = async (sessionsToSync: any[]) => {
    for (const session of sessionsToSync) {
      try {
        await callWahaManager({
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
    if (!wahaUrl) {
      toast({
        title: "Erro",
        description: "URL do Servidor Evolution é obrigatória",
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

      if (existingConfig) {
        const { error } = await supabase
          .from("whatsapp_config")
          .update({
            waha_url: wahaUrl,
            waha_api_key: wahaApiKey || null,
            webhook_url: webhookUrl || null,
            manager_url: managerUrl || null,
            manager_user: managerUser || null,
            manager_password: managerPassword || null,
          } as any)
          .eq("id", existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_config")
          .insert({
            estabelecimento_id: estabelecimentoId,
            waha_url: wahaUrl,
            waha_api_key: wahaApiKey || null,
            webhook_url: webhookUrl || null,
            manager_url: managerUrl || null,
            manager_user: managerUser || null,
            manager_password: managerPassword || null,
          } as any);

        if (error) throw error;
      }
      
      webhookSyncCacheRef.current = {};
      toast({
        title: "✓ Configuração salva!",
        description: "Servidor WAHA configurado com sucesso.",
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
        description: "Configure o servidor WAHA primeiro",
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
      const result = await callWahaManager({
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
        description: error?.message || 'Erro ao iniciar sessão no WAHA',
        variant: 'destructive',
      });
    }
  };

  const getQRCode = async (sessionId: string, sessionName: string) => {
    try {
      await callWahaManager({
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
        ...buildWahaHeaders(config?.waha_api_key),
      };

      const base = config?.waha_url?.replace(/\/+$/, '') || '';

      const stopUrls = [
        `${base}/api/sessions/${session.session_name}/stop`,
        `${base}/api/${session.session_name}/stop`,
      ];
      for (const url of stopUrls) {
        try {
          const resp = await fetch(url, { method: 'POST', headers });
          if (resp.ok || resp.status === 201 || resp.status === 404) break;
        } catch (e) {}
      }

      const logoutUrls = [
        `${base}/api/sessions/${session.session_name}/logout`,
        `${base}/api/${session.session_name}/logout`,
      ];
      for (const url of logoutUrls) {
        try {
          const resp = await fetch(url, { method: 'POST', headers });
          if (resp.ok || resp.status === 404) break;
        } catch (e) {}
      }

      await new Promise(r => setTimeout(r, 500));

      const deleteAttempts = [
        { url: `${base}/api/sessions/${session.session_name}?force=true`, method: 'DELETE' },
        { url: `${base}/api/sessions/${session.session_name}`, method: 'DELETE' },
        { url: `${base}/api/${session.session_name}`, method: 'DELETE' },
        { url: `${base}/api/sessions/${session.session_name}/delete`, method: 'POST' },
        { url: `${base}/api/${session.session_name}/delete`, method: 'POST' },
      ];

      let deletedOnServer = false;
      for (const attempt of deleteAttempts) {
        try {
          const resp = await fetch(attempt.url, { method: attempt.method, headers });
          if (resp.ok || resp.status === 404) {
            deletedOnServer = true;
            break;
          }
        } catch (e) {}
      }

      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', sessionToDelete);

      toast({
        title: '✓ Sessão excluída!',
        description: deletedOnServer
          ? 'Sessão excluída do WAHA e do banco de dados'
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

  return (
    <div className="space-y-6">
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
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="waha-url">URL do Servidor Evolution</Label>
                <Input
                  id="waha-url"
                  placeholder="https://evolution.exemplo.com"
                  value={wahaUrl}
                  onChange={(e) => setWahaUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waha-key">apikey (obrigatória)</Label>
                <Input
                  id="waha-key"
                  type="password"
                  placeholder="Sua apikey global do Evolution"
                  value={wahaApiKey}
                  onChange={(e) => setWahaApiKey(e.target.value)}
                />
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
                  Endereço do painel administrativo (Manager) do Evolution API.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="manager-user">Usuário do Manager</Label>
                  <Input
                    id="manager-user"
                    placeholder="admin"
                    autoComplete="off"
                    value={managerUser}
                    onChange={(e) => setManagerUser(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager-password">Senha do Manager</Label>
                  <Input
                    id="manager-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                  />
                </div>
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
                        onClick={() => setSessionToDelete(session.id)}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!config && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Configure o servidor WAHA para começar
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

      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Sessão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSession}>
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

            <AccordionItem value="whatsapp-waha">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-blue-600" />
                  WhatsApp (Evolution API)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <WhatsAppWAHAConfig estabelecimentoId={estabelecimentoId} />
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
