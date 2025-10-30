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
  const [selectedQrSession, setSelectedQrSession] = useState<WhatsAppSession | null>(null);
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

      // Start the session via WAHA
      await startSession(data.id, newSessionName);
      
      toast.success("Sessão criada com sucesso!");
      setShowNewSessionDialog(false);
      setNewSessionName("");
      await refreshSessions();
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Erro ao criar sessão");
    }
  };

  const startSession = async (sessionId: string, sessionName: string) => {
    try {
      const response = await fetch(`${config?.waha_url}/api/sessions/${sessionName}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config?.waha_api_key && { "X-Api-Key": config.waha_api_key }),
        },
        body: JSON.stringify({ name: sessionName }),
      });

      if (!response.ok) throw new Error("Failed to start session");

      await getQRCode(sessionId, sessionName);
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Erro ao iniciar sessão no WAHA");
    }
  };

  const getQRCode = async (sessionId: string, sessionName: string) => {
    try {
      const response = await fetch(`${config?.waha_url}/api/${sessionName}/auth/qr`, {
        headers: {
          ...(config?.waha_api_key && { "X-Api-Key": config.waha_api_key }),
        },
      });

      if (!response.ok) throw new Error("Failed to get QR code");

      const data = await response.json();
      
      await supabase
        .from("whatsapp_sessions")
        .update({
          qr_code: data.qr,
          status: "SCAN_QR_CODE",
        })
        .eq("id", sessionId);

      await refreshSessions();
    } catch (error) {
      console.error("Error getting QR code:", error);
    }
  };

  const deleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const session = sessions.find(s => s.id === sessionToDelete);
      if (!session) return;

      // Stop session in WAHA
      await fetch(`${config?.waha_url}/api/sessions/${session.session_name}/stop`, {
        method: "POST",
        headers: {
          ...(config?.waha_api_key && { "X-Api-Key": config.waha_api_key }),
        },
      });

      // Delete from database
      await supabase
        .from("whatsapp_sessions")
        .delete()
        .eq("id", sessionToDelete);

      toast.success("Sessão excluída com sucesso!");
      setSessionToDelete(null);
      await refreshSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Erro ao excluir sessão");
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
                      {session.status === "SCAN_QR_CODE" && session.qr_code && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedQrSession(session)}
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
    </Layout>
  );
}
