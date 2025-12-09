import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Server, Mail, Lock, Globe, Save, TestTube } from "lucide-react";

interface EmailServerSettings {
  server_url: string;
  smtp_server: string;
  smtp_port: number;
  imap_server: string;
  imap_port: number;
  email: string;
  password: string;
  use_ssl: boolean;
}

interface EmailServerConfigProps {
  estabelecimentoId?: string;
}

export function EmailServerConfig({ estabelecimentoId: propEstabelecimentoId }: EmailServerConfigProps) {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [settings, setSettings] = useState<EmailServerSettings>({
    server_url: "https://mailcrm.pilar.com.br",
    smtp_server: "",
    smtp_port: 465,
    imap_server: "",
    imap_port: 993,
    email: "",
    password: "",
    use_ssl: true
  });

  useEffect(() => {
    const loadEstabelecimento = async () => {
      const id = await getEstabelecimentoId(propEstabelecimentoId);
      setEstabelecimentoId(id);
    };
    loadEstabelecimento();
  }, [propEstabelecimentoId]);

  useEffect(() => {
    if (estabelecimentoId) {
      loadSettings();
    }
  }, [estabelecimentoId]);

  const loadSettings = async () => {
    if (!estabelecimentoId) return;

    try {
      // Carrega de email_oauth_config com provider = 'external_server'
      const { data, error } = await supabase
        .from("email_oauth_config" as any)
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("provider", "external_server")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfigId((data as any).id);
        // Credenciais são armazenadas no campo client_secret como JSON
        try {
          const serverConfig = JSON.parse((data as any).client_secret || "{}");
          setSettings(prev => ({
            ...prev,
            ...serverConfig,
            email: (data as any).client_id || ""
          }));
        } catch {
          // Se não for JSON válido, ignora
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const saveSettings = async () => {
    if (!estabelecimentoId) {
      toast.error("Estabelecimento não selecionado");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        estabelecimento_id: estabelecimentoId,
        provider: "external_server",
        client_id: settings.email,
        client_secret: JSON.stringify({
          server_url: settings.server_url,
          smtp_server: settings.smtp_server,
          smtp_port: settings.smtp_port,
          imap_server: settings.imap_server,
          imap_port: settings.imap_port,
          password: settings.password,
          use_ssl: settings.use_ssl
        }),
        enabled: true,
        updated_at: new Date().toISOString()
      };

      if (configId) {
        const { error } = await supabase
          .from("email_oauth_config" as any)
          .update(payload)
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_oauth_config" as any)
          .insert(payload);
        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      loadSettings();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!settings.email || !settings.password) {
      toast.error("Preencha email e senha para testar");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`${settings.server_url}/send-emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accounts: [
            {
              user: settings.email,
              pass: settings.password,
              smtp: settings.smtp_server,
              smtp_port: settings.smtp_port,
              imap: settings.imap_server,
              imap_port: settings.imap_port
            }
          ],
          to: settings.email,
          subject: "Teste de conexão - Pilar CRM",
          text: "Este é um email de teste para verificar a conexão."
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success("Conexão testada com sucesso! Verifique seu email.");
        console.log("Resultado do teste:", result);
      } else {
        toast.error(`Erro na conexão: ${result.error || "Falha desconhecida"}`);
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      toast.error("Erro ao conectar com o servidor de email");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Servidor de Email Externo
        </CardTitle>
        <CardDescription>
          Configure seu servidor IMAP/SMTP personalizado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL do Servidor */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            URL do Servidor de Email
          </Label>
          <Input
            value={settings.server_url}
            onChange={(e) => setSettings(prev => ({ ...prev, server_url: e.target.value }))}
            placeholder="https://mailcrm.pilar.com.br"
          />
          <p className="text-xs text-muted-foreground">
            Endpoint da API que processa envio e recebimento de emails
          </p>
        </div>

        {/* Credenciais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Senha / App Password
            </Label>
            <Input
              type="password"
              value={settings.password}
              onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* SMTP */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Configuração SMTP (Envio)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Servidor SMTP</Label>
              <Input
                value={settings.smtp_server}
                onChange={(e) => setSettings(prev => ({ ...prev, smtp_server: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Porta SMTP</Label>
              <Input
                type="number"
                value={settings.smtp_port}
                onChange={(e) => setSettings(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 465 }))}
                placeholder="465"
              />
            </div>
          </div>
        </div>

        {/* IMAP */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Configuração IMAP (Recebimento)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Servidor IMAP</Label>
              <Input
                value={settings.imap_server}
                onChange={(e) => setSettings(prev => ({ ...prev, imap_server: e.target.value }))}
                placeholder="imap.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Porta IMAP</Label>
              <Input
                type="number"
                value={settings.imap_port}
                onChange={(e) => setSettings(prev => ({ ...prev, imap_port: parseInt(e.target.value) || 993 }))}
                placeholder="993"
              />
            </div>
          </div>
        </div>

        {/* SSL */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Usar SSL/TLS</Label>
            <p className="text-xs text-muted-foreground">
              Conexão segura (recomendado)
            </p>
          </div>
          <Switch
            checked={settings.use_ssl}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, use_ssl: checked }))}
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <Button onClick={saveSettings} disabled={loading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={testing}>
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? "Testando..." : "Testar Conexão"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
