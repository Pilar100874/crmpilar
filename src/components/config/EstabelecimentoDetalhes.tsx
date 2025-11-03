import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UnidadesCRUD } from "./UnidadesCRUD";
import { SegmentosCRUD } from "./SegmentosCRUD";
import { GruposAcessoCRUD } from "./GruposAcessoCRUD";
import { UsuariosCRUD } from "./UsuariosCRUD";
import { ClientesCRUD } from "./ClientesCRUD";
import { RedesSociaisCRUD } from "./RedesSociaisCRUD";
import QuickRepliesCRUD from "./QuickRepliesCRUD";
import QuickAttachmentsCRUD from "./QuickAttachmentsCRUD";
import { APIGeneratorCRUD } from "./APIGeneratorCRUD";
import { WebhooksCRUD } from "./WebhooksCRUD";
import { CanaisAtendimentoCRUD } from "./CanaisAtendimentoCRUD";
import { NotificacoesCRUD } from "./NotificacoesCRUD";
import { SegurancaCRUD } from "./SegurancaCRUD";
import { ProdutosCRUD } from "./ProdutosCRUD";
import { ProdutoCategoriasCRUD } from "./ProdutoCategoriasCRUD";
import { ProdutoGruposCRUD } from "./ProdutoGruposCRUD";
import { CondicoesPagamentoCRUD } from "./CondicoesPagamentoCRUD";
import { TabelasPrecoCRUD } from "./TabelasPrecoCRUD";
import { TiposPagamentoCRUD } from "./TiposPagamentoCRUD";
import { Users, Building2, Tag, FolderTree, UserCog, Share2, MessageSquare, Link as LinkIcon, Globe, Webhook, Key, Bell, Shield, Mail, Package, FolderOpen, Layers, CreditCard, DollarSign, Wallet, Smartphone, QrCode, Plus, Trash2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast as sonnerToast } from "sonner";
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

interface EstabelecimentoDetalhesProps {
  estabelecimentoId: string;
  estabelecimentoNome: string;
}

function WhatsAppConfigSection({ estabelecimentoId }: { estabelecimentoId: string }) {
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

  useEffect(() => {
    loadWhatsAppConfig();
  }, [estabelecimentoId]);

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
            Configure este URL no WAHA para receber mensagens
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
              Use esta URL como webhook no WAHA para receber mensagens
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

interface WhatsAppSession {
  id: string;
  session_name: string;
  phone_number: string | null;
  status: string;
  qr_code: string | null;
  bot_flow_id: string | null;
}

function WhatsAppWAHAConfigSection({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  
  const [wahaUrl, setWahaUrl] = useState("");
  const [wahaApiKey, setWahaApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [selectedQrSession, setSelectedQrSession] = useState<WhatsAppSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    const interval = setInterval(() => {
      refreshSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [estabelecimentoId]);

  const loadConfig = async () => {
    try {
      const { data: configData, error } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (!error && configData) {
        const cfg = configData as any;
        // Only set config if it has waha_url configured
        if (cfg.waha_url) {
          setConfig(cfg);
          setWahaUrl(cfg.waha_url);
          setWahaApiKey(cfg.waha_api_key || "");
          setWebhookUrl(cfg.webhook_url || "");
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
      // Sincronizar status com WAHA
      await syncSessionStatus(sessionsData);
    }
  };

  const syncSessionStatus = async (sessionsToSync: any[]) => {
    if (!config?.waha_url) return;

    const base = config.waha_url.replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.waha_api_key) {
      headers['x-api-key'] = config.waha_api_key;
    }

    for (const session of sessionsToSync) {
      try {
        // Tentar diferentes endpoints para obter status
        const statusUrls = [
          `${base}/api/sessions/${session.session_name}`,
          `${base}/api/${session.session_name}`,
          `${base}/api/sessions/${session.session_name}/status`,
          `${base}/api/${session.session_name}/status`,
        ];

        let statusFound = false;
        for (const url of statusUrls) {
          try {
            const response = await fetch(url, { method: 'GET', headers });
            if (response.ok) {
              const data = await response.json();
              const wahaStatus = data.status || data.state;
              
              if (wahaStatus) {
                // Mapear status do WAHA para nosso sistema
                let mappedStatus = 'STOPPED';
                if (wahaStatus === 'WORKING' || wahaStatus === 'AUTHENTICATED') {
                  mappedStatus = 'WORKING';
                } else if (wahaStatus === 'SCAN_QR_CODE' || wahaStatus === 'STARTING') {
                  mappedStatus = 'SCAN_QR_CODE';
                } else if (wahaStatus === 'FAILED') {
                  mappedStatus = 'FAILED';
                }

                // Atualizar apenas se o status mudou
                if (session.status !== mappedStatus) {
                  await supabase
                    .from('whatsapp_sessions')
                    .update({ status: mappedStatus })
                    .eq('id', session.id);
                  
                  console.log(`Status atualizado: ${session.session_name} -> ${mappedStatus}`);
                }
                
                statusFound = true;
                break;
              }
            }
          } catch (e) {
            // Tentar próximo endpoint
            continue;
          }
        }

        if (!statusFound) {
          console.log(`Não foi possível obter status da sessão ${session.session_name}`);
        }
      } catch (error) {
        console.error(`Erro ao sincronizar status da sessão ${session.session_name}:`, error);
      }
    }

    // Recarregar sessões após sincronização
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
        description: "URL do servidor WAHA é obrigatória",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if config already exists
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
          } as any);

        if (error) throw error;
      }
      
      toast({
        title: "✓ Configuração salva!",
        description: "Servidor WAHA configurado com sucesso. Agora você pode criar sessões.",
      });
      setShowConfigDialog(false);
      await loadConfig();
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
      const base = (config?.waha_url || '').replace(/\/+$/, '');
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      if (config?.waha_api_key) {
        headers['x-api-key'] = config.waha_api_key;
      }

      const webhookUrl = config?.webhook_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

      // Garante que a sessão exista (criação/atualização)
      const createBody = JSON.stringify({
        name: sessionName,
        config: {
          webhooks: [
            { url: webhookUrl, events: ['message'] }
          ],
        },
      });
      const createAttempts = [
        { url: `${base}/api/sessions`, method: 'POST', body: createBody },
        { url: `${base}/api/sessions/${sessionName}`, method: 'POST', body: createBody },
        { url: `${base}/api/${sessionName}`, method: 'POST', body: createBody },
      ];
      for (const a of createAttempts) {
        try {
          const r = await fetch(a.url, { method: a.method, headers, body: a.body });
          const ok = r.ok || [200,201,202,204,409].includes(r.status);
          console.log('WAHA create resp', a.url, r.status);
          if (ok) break;
        } catch (e) { console.warn('WAHA create error', a.url, e); }
      }

      // Inicia a sessão - variações com/sem body
      const startAttempts = [
        { url: `${base}/api/sessions/${sessionName}/start`, method: 'POST' },
        { url: `${base}/api/${sessionName}/start`, method: 'POST' },
        { url: `${base}/api/sessions/${sessionName}/start`, method: 'POST', body: JSON.stringify({ name: sessionName }) },
        { url: `${base}/api/${sessionName}/start`, method: 'POST', body: JSON.stringify({ name: sessionName }) },
      ];
      let started = false;
      for (const a of startAttempts) {
        try {
          const r = await fetch(a.url, { method: a.method as any, headers, ...(a.body ? { body: a.body } : {}) });
          console.log('WAHA start resp', a.url, r.status);
          if (r.ok || r.status === 201) { started = true; break; }
        } catch (e) { console.warn('WAHA start error', a.url, e); }
      }
      if (!started) throw new Error('Failed to start session');

      await getQRCode(sessionId, sessionName);
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar sessão no WAHA',
        variant: 'destructive',
      });
    }
  };

  const getQRCode = async (sessionId: string, sessionName: string) => {
    try {
      const base = (config?.waha_url || '').replace(/\/+$/, '');
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      if (config?.waha_api_key) {
        headers['x-api-key'] = config.waha_api_key;
      }

      const maxAttempts = 20;
      let attempt = 0;
      let qrUrl: string | null = null;

      while (attempt < maxAttempts && !qrUrl) {
        attempt++;
        const attempts = [
          { method: 'POST', url: `${base}/api/${sessionName}/auth/qr`, body: '{}' },
          { method: 'POST', url: `${base}/api/sessions/${sessionName}/auth/qr`, body: '{}' },
          { method: 'GET',  url: `${base}/api/${sessionName}/auth/qr` },
          { method: 'GET',  url: `${base}/api/sessions/${sessionName}/auth/qr` },
        ];
        for (const a of attempts) {
          try {
            const response = await fetch(a.url, { method: a.method as any, headers, ...(a.body ? { body: a.body } : {}) });
            if (response.ok) {
              const payload = await response.json();
              const urlFound: string | null = payload.qr || (payload.data ? `data:${payload.mimetype || 'image/png'};base64,${payload.data}` : null);
              if (urlFound) { qrUrl = urlFound; break; }
            }
          } catch {}
        }

        if (!qrUrl) {
          const backoff = Math.min(2500, 500 * attempt);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }

      if (!qrUrl) {
        throw new Error(`QR code não disponível após ${attempt} tentativas. Verifique se o nome da sessão "${sessionName}" está correto no WAHA.`);
      }

      await supabase
        .from('whatsapp_sessions')
        .update({
          qr_code: qrUrl,
          status: 'SCAN_QR_CODE',
        })
        .eq('id', sessionId);

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

  const deleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const session = sessions.find(s => s.id === sessionToDelete);
      if (!session) return;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (config?.waha_api_key) {
        headers['x-api-key'] = config.waha_api_key;
      }

      const base = config?.waha_url?.replace(/\/+$/, '') || '';

      // Para a sessão
      const stopUrls = [
        `${base}/api/sessions/${session.session_name}/stop`,
        `${base}/api/${session.session_name}/stop`,
      ];
      for (const url of stopUrls) {
        try {
          const resp = await fetch(url, { method: 'POST', headers });
          console.log('Stop session', url, resp.status);
          if (resp.ok || resp.status === 201 || resp.status === 404) break;
        } catch (e) {
          console.warn('Stop failed:', url, e);
        }
      }

      // Faz logout
      const logoutUrls = [
        `${base}/api/sessions/${session.session_name}/logout`,
        `${base}/api/${session.session_name}/logout`,
      ];
      for (const url of logoutUrls) {
        try {
          const resp = await fetch(url, { method: 'POST', headers });
          console.log('Logout session', url, resp.status);
          if (resp.ok || resp.status === 404) break;
        } catch (e) {
          console.warn('Logout failed:', url, e);
        }
      }

      await new Promise(r => setTimeout(r, 500));

      // Exclui a sessão no WAHA
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
          console.log('Delete attempt', attempt.method, attempt.url, resp.status);
          if (resp.ok || resp.status === 404) {
            deletedOnServer = true;
            break;
          }
        } catch (e) {
          console.warn('Delete attempt failed:', attempt, e);
        }
      }

      // Exclui do banco
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', sessionToDelete);

      toast({
        title: '✓ Sessão excluída!',
        description: deletedOnServer
          ? 'Sessão excluída do WAHA e do banco de dados'
          : 'Sessão removida do app; não foi possível confirmar exclusão no WAHA-Plus',
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
          Gerencie sessões WAHA para múltiplos números de WhatsApp
        </p>
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {config ? "Editar Servidor" : "Configurar Servidor"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configuração do Servidor WAHA</DialogTitle>
              <DialogDescription>
                Configure a URL e chave de API do seu servidor WAHA
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="waha-url">URL do Servidor WAHA</Label>
                <Input
                  id="waha-url"
                  placeholder="https://waha.exemplo.com"
                  value={wahaUrl}
                  onChange={(e) => setWahaUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waha-key">Chave de API (opcional)</Label>
                <Input
                  id="waha-key"
                  type="password"
                  placeholder="Sua chave de API"
                  value={wahaApiKey}
                  onChange={(e) => setWahaApiKey(e.target.value)}
                />
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
                          className="w-48 h-48 rounded border"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
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
                      className="w-full"
                      size="sm"
                      onClick={() => startSession(session.id, session.session_name)}
                    >
                      Gerar QR
                    </Button>
                  ) : null}
                  {session.bot_flow_id && (
                      <p className="text-xs text-muted-foreground">
                        Em uso por bot
                      </p>
                    )}
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

      {/* QR Code Dialog */}
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
                className="w-64 h-64"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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

function ResendConfigSection({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    loadResendConfig();
  }, [estabelecimentoId]);

  const loadResendConfig = async () => {
    try {
      const { data } = await supabase
        .from('resend_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (data) {
        setConfigId(data.id);
        setApiKey(data.api_key);
        setFromEmail(data.from_email);
        setFromName(data.from_name);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !fromEmail || !fromName) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from('resend_config')
          .update({
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .eq('id', configId);

        if (error) throw error;
        toast({
          title: "✓ Configuração atualizada!",
          description: "As configurações do Resend foram atualizadas.",
        });
      } else {
        const { data, error } = await supabase
          .from('resend_config')
          .insert({
            estabelecimento_id: estabelecimentoId,
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
        toast({
          title: "✓ Configuração salva!",
          description: "As configurações do Resend foram salvas.",
        });
      }

      loadResendConfig();
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5" />
          Configuração Resend (Envio de Email)
        </CardTitle>
        <CardDescription>
          Configure o serviço Resend para envio de emails deste estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold text-sm">Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
              <li>
                Acesse{" "}
                <a 
                  href="https://resend.com/signup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  resend.com/signup
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Verifique seu domínio em{" "}
                <a 
                  href="https://resend.com/domains" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Domains
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Gere uma API Key em{" "}
                <a 
                  href="https://resend.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  API Keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ol>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="api-key">
              API Key *
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxx"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="from-email">
              Email Remetente *
            </Label>
            <Input
              id="from-email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="noreply@seudominio.com"
            />
          </div>

          <div>
            <Label htmlFor="from-name">
              Nome do Remetente *
            </Label>
            <Input
              id="from-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Minha Empresa"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : configId ? "Atualizar" : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function EstabelecimentoDetalhes({ estabelecimentoId, estabelecimentoNome }: EstabelecimentoDetalhesProps) {
  const [userEstabId, setUserEstabId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user) {
          const { data, error } = await supabase.rpc('get_user_estabelecimento_id', { _user_id: user.id });
          if (!error) setUserEstabId(data);
        }
      } catch (e) {
        console.error('Erro ao obter estabelecimento do usuário:', e);
      }
    })();
  }, [estabelecimentoId]);

  return (
    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
      <div className="text-sm font-medium text-muted-foreground mb-4">
        Gerenciando dados de: <span className="text-primary font-semibold">{estabelecimentoNome}</span>
      </div>

      {userEstabId && userEstabId !== estabelecimentoId && (
        <Alert variant="destructive">
          <AlertDescription>
            Você não tem permissão para salvar neste estabelecimento. Selecione o estabelecimento vinculado ao seu usuário.
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="single" collapsible className="space-y-2">
        <AccordionItem value="whatsapp-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-medium">Configuração WhatsApp Business API</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <WhatsAppConfigSection estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="whatsapp-waha-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span className="font-medium">Configuração WhatsApp WAHA</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <WhatsAppWAHAConfigSection estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="resend-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="font-medium">Configuração Resend (Email)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ResendConfigSection estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="redes-sociais" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              <span className="font-medium">Redes Sociais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <RedesSociaisCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-clientes" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">Campos do Cadastro de Cliente</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ClientesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-unidades" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Unidades</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UnidadesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-segmentos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Segmentos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SegmentosCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="grupos-acesso" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              <span className="font-medium">Grupos de Acesso</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <GruposAcessoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-usuarios" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Usuários</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UsuariosCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="textos-prontos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-medium">Textos Prontos Globais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <QuickRepliesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="anexos-rapidos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              <span className="font-medium">Anexos Rápidos Globais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <QuickAttachmentsCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="gerador-api" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-medium">Gerador de APIs</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <APIGeneratorCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-webhooks" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Webhooks</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <WebhooksCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="canais" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span className="font-medium">Canais de Atendimento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <CanaisAtendimentoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notificacoes" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-medium">Notificações</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <NotificacoesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seguranca" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-medium">Segurança e LGPD</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SegurancaCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="produtos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Produtos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ProdutosCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="produto-categorias" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              <span className="font-medium">Categorias de Produtos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ProdutoCategoriasCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="produto-grupos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="font-medium">Grupos de Produtos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ProdutoGruposCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="condicoes-pagamento" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="font-medium">Condições de Pagamento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <CondicoesPagamentoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tabelas-preco" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-medium">Tabelas de Preço</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <TabelasPrecoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tipos-pagamento" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="font-medium">Tipos de Pagamento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <TiposPagamentoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
