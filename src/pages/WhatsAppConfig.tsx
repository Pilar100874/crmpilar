import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Smartphone, QrCode, Trash2, RefreshCw } from "lucide-react";
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

interface WhatsAppConfig {
  id: string;
  waha_url: string;
  waha_api_key: string | null;
}

interface WhatsAppSession {
  id: string;
  session_name: string;
  phone_number: string | null;
  status: string;
  qr_code: string | null;
  bot_flow_id: string | null;
}

export default function WhatsAppConfig() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  
  // Form states
  const [wahaUrl, setWahaUrl] = useState("");
  const [wahaApiKey, setWahaApiKey] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [selectedQrSessionId, setSelectedQrSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    const interval = setInterval(() => {
      refreshSessions();
    }, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("id", user.id)
        .single();

      if (usuario) {
        setEstabelecimentoId(usuario.estabelecimento_id);
        
        const { data: configData } = await supabase
          .from("whatsapp_config")
          .select("*")
          .eq("estabelecimento_id", usuario.estabelecimento_id)
          .single();

        if (configData) {
          const config = configData as any;
          setConfig(config);
          setWahaUrl(config.waha_url || "");
          setWahaApiKey(config.waha_api_key || "");
        }

        await refreshSessions();
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("estabelecimento_id")
      .eq("id", user.id)
      .single();

    if (usuario) {
      const { data: sessionsData } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("estabelecimento_id", usuario.estabelecimento_id)
        .order("created_at", { ascending: false });

      if (sessionsData) {
        setSessions(sessionsData);
      }
    }
  };

  const saveConfig = async () => {
    if (!wahaUrl) {
      toast.error("URL do servidor WAHA é obrigatória");
      return;
    }

    try {
      if (config) {
        await supabase
          .from("whatsapp_config")
          .update({
            waha_url: wahaUrl,
            waha_api_key: wahaApiKey || null,
          } as any)
          .eq("id", config.id);
      } else {
        await supabase
          .from("whatsapp_config")
          .insert({
            estabelecimento_id: estabelecimentoId,
            waha_url: wahaUrl,
            waha_api_key: wahaApiKey || null,
          } as any);
      }
      
      toast.success("Configuração salva com sucesso!");
      setShowConfigDialog(false);
      await loadConfig();
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    }
  };

  const createSession = async () => {
    if (!newSessionName) {
      toast.error("Nome da sessão é obrigatório");
      return;
    }

    if (!config) {
      toast.error("Configure o servidor WAHA primeiro");
      return;
    }

    try {
      // Cria a sessão no banco primeiro
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

      toast.success("Sessão criada! Iniciando no WAHA...");
      setShowNewSessionDialog(false);
      setNewSessionName("");

      // Inicia a sessão no WAHA e busca o QR code automaticamente
      await startSession(data.id, newSessionName);
      await refreshSessions();
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Erro ao criar sessão");
    }
  };

  const startSession = async (sessionId: string, sessionName: string) => {
    try {
      const base = (config?.waha_url || '').replace(/\/+$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (config?.waha_api_key) {
        headers['X-Api-Key'] = config.waha_api_key;
        headers['x-api-key'] = config.waha_api_key; // compat WAHA-Plus
      }

      // Garante que a sessão existe (WAHA-Plus pode exigir criação explícita)
      const existsResp = await fetch(`${base}/api/sessions/${sessionName}`, { headers });
      if (!existsResp.ok) {
        const createAttempts = [
          { url: `${base}/api/sessions`, method: 'POST', body: JSON.stringify({ name: sessionName }) },
          { url: `${base}/api/sessions/${sessionName}`, method: 'POST', body: JSON.stringify({ name: sessionName }) },
          { url: `${base}/api/${sessionName}`, method: 'POST', body: JSON.stringify({ name: sessionName }) },
        ];
        for (const a of createAttempts) {
          try {
            const r = await fetch(a.url, { method: a.method, headers, body: a.body });
            if (r.ok || r.status === 409) break; // criado ou já existe
          } catch {}
        }
      }

      // Inicia a sessão (tenta múltiplas rotas)
      const startUrls = [
        `${base}/api/sessions/${sessionName}/start`,
        `${base}/api/${sessionName}/start`,
      ];
      let started = false;
      for (const url of startUrls) {
        try {
          const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ name: sessionName }) });
          if (r.ok || r.status === 201) { started = true; break; }
        } catch {}
      }
      if (!started) throw new Error('Failed to start session');

      await getQRCode(sessionId, sessionName);
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Erro ao iniciar sessão no WAHA');
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
        headers['X-Api-Key'] = config.waha_api_key;
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

      // Monitora a leitura do QR para iniciar a sessão automaticamente
      monitorSessionAfterQr(sessionId, sessionName);
    } catch (error: any) {
      console.error('Error getting QR code:', error);
      toast.error(error.message || 'Erro ao obter QR code');
    }
  };

  // Inicia a sessão no WAHA sem buscar QR (uso interno)
  const startSessionOnly = async (sessionName: string) => {
    try {
      await fetch(`${config?.waha_url}/api/sessions/${sessionName}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config?.waha_api_key && { "X-Api-Key": config.waha_api_key }),
        },
        body: JSON.stringify({ name: sessionName }),
      });
    } catch (e) {
      console.warn("startSessionOnly failed", e);
    }
  };

  // Após exibir o QR, monitora até conectar e inicia a sessão automaticamente
  const monitorSessionAfterQr = async (sessionId: string, sessionName: string) => {
    const maxChecks = 60; // ~2 minutos
    for (let i = 0; i < maxChecks; i++) {
      try {
        const endpoints = [
          `${config?.waha_url}/api/sessions/${sessionName}`,
          `${config?.waha_url}/api/${sessionName}/status`,
        ];
        let status: string | null = null;
        for (const url of endpoints) {
          const resp = await fetch(url, {
            headers: {
              ...(config?.waha_api_key && { "X-Api-Key": config.waha_api_key }),
            },
          });
          if (resp.ok) {
            const payload = await resp.json().catch(() => null);
            if (payload) {
              status = payload.state || payload.status || payload.session?.state || payload.session?.status || null;
              if (status) break;
            }
          }
        }

        if (status) {
          const normalized = String(status).toUpperCase();
          if (["WORKING", "CONNECTED", "AUTHENTICATED", "RUNNING", "READY"].includes(normalized)) {
            await startSessionOnly(sessionName).catch(() => {});
            await supabase
              .from("whatsapp_sessions")
              .update({ status: "WORKING", qr_code: null })
              .eq("id", sessionId);
            await refreshSessions();
            toast.success(`Sessão ${sessionName} conectada`);
            return;
          }
        }
      } catch (e) {
        // ignora e continua
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  };

  const deleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const session = sessions.find(s => s.id === sessionToDelete);
      if (!session) return;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (config?.waha_api_key) {
        headers["X-Api-Key"] = config.waha_api_key;
        headers["x-api-key"] = config.waha_api_key; // WAHA-Plus pode exigir este header
      }

      const base = config?.waha_url?.replace(/\/+$/, "") || "";

      // Tenta parar a sessão (endpoints clássicos e WAHA-Plus)
      const stopUrls = [
        `${base}/api/sessions/${session.session_name}/stop`,
        `${base}/api/${session.session_name}/stop`,
      ];
      for (const url of stopUrls) {
        try {
          const resp = await fetch(url, { method: "POST", headers });
          console.log("Stop session", url, resp.status);
          if (resp.ok || resp.status === 201 || resp.status === 404) break;
        } catch (e) {
          console.warn("Stop failed:", url, e);
        }
      }

      // Alguns servidores pedem logout antes de deletar
      const logoutUrls = [
        `${base}/api/sessions/${session.session_name}/logout`,
        `${base}/api/${session.session_name}/logout`,
      ];
      for (const url of logoutUrls) {
        try {
          const resp = await fetch(url, { method: "POST", headers });
          console.log("Logout session", url, resp.status);
          if (resp.ok || resp.status === 404) break;
        } catch (e) {
          console.warn("Logout failed:", url, e);
        }
      }

      // Aguarda um pouco para liberar recursos
      await new Promise(r => setTimeout(r, 500));

      // Tenta excluir a sessão no servidor (vários formatos/rotas)
      const deleteAttempts = [
        { url: `${base}/api/sessions/${session.session_name}?force=true`, method: "DELETE" },
        { url: `${base}/api/sessions/${session.session_name}`, method: "DELETE" },
        { url: `${base}/api/${session.session_name}`, method: "DELETE" },
        { url: `${base}/api/sessions/${session.session_name}/delete`, method: "POST" },
        { url: `${base}/api/${session.session_name}/delete`, method: "POST" },
      ];

      let deletedOnServer = false;
      for (const attempt of deleteAttempts) {
        try {
          const resp = await fetch(attempt.url, { method: attempt.method, headers });
          console.log("Delete attempt", attempt.method, attempt.url, resp.status);
          if (resp.ok || resp.status === 404) {
            deletedOnServer = true;
            break;
          }
        } catch (e) {
          console.warn("Delete attempt failed:", attempt, e);
        }
      }

      // Exclui do banco de dados
      await supabase
        .from("whatsapp_sessions")
        .delete()
        .eq("id", sessionToDelete);

      toast.success(deletedOnServer
        ? "Sessão excluída do WAHA e do banco de dados"
        : "Sessão removida do app; não foi possível confirmar exclusão no WAHA-Plus");

      setSessionToDelete(null);
      await refreshSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Erro ao excluir sessão: " + (error as Error).message);
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="animate-spin h-8 w-8" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Configuração WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie seu servidor WAHA e sessões de WhatsApp
            </p>
          </div>
          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
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
                <Button onClick={saveConfig} className="w-full">
                  Salvar Configuração
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {config && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Sessões WhatsApp</CardTitle>
                <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
                  <DialogTrigger asChild>
                    <Button>
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
                Gerencie as sessões de WhatsApp conectadas ao seu servidor
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
                          <CardTitle className="text-lg">{session.session_name}</CardTitle>
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
                      {session.status === "SCAN_QR_CODE" && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedQrSessionId(session.id)}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          Ver QR Code
                        </Button>
                      )}
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
            <CardHeader>
              <CardTitle>Nenhuma configuração encontrada</CardTitle>
              <CardDescription>
                Configure seu servidor WAHA para começar a usar o WhatsApp
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* QR Code Dialog */}
        <Dialog open={!!selectedQrSessionId} onOpenChange={(open) => { if (!open) setSelectedQrSessionId(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Escaneie o QR Code</DialogTitle>
              <DialogDescription>
                Use o WhatsApp no seu celular para escanear o código
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const s = sessions.find(ss => ss.id === selectedQrSessionId);
              if (s?.qr_code) {
                return (
                  <div className="flex justify-center p-4">
                    <img
                      src={s.qr_code}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                );
              }
              return (
                <div className="flex items-center justify-center p-6 text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Aguardando QR Code...
                </div>
              );
            })()}
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
    </Layout>
  );
}
