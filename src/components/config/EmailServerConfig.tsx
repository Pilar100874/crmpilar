import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Server, Globe, Save, Loader2 } from "lucide-react";

interface EmailServerConfigProps {
  estabelecimentoId?: string;
}

export function EmailServerConfig({ estabelecimentoId: propEstabelecimentoId }: EmailServerConfigProps) {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("https://mailcrm.pilar.com.br");

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
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("email_oauth_config" as any)
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("provider", "external_server")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfigId((data as any).id);
        // server_url é armazenado no client_id
        if ((data as any).client_id) {
          setServerUrl((data as any).client_id);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!estabelecimentoId) {
      toast.error("Estabelecimento não selecionado");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        estabelecimento_id: estabelecimentoId,
        provider: "external_server",
        client_id: serverUrl,
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
        const { data, error } = await supabase
          .from("email_oauth_config" as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setConfigId((data as any).id);
      }

      toast.success("URL do servidor salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Servidor de Email Externo
        </CardTitle>
        <CardDescription>
          Configure a URL do servidor IMAP/SMTP externo. As configurações de cada usuário (servidor, porta, senha) são definidas no cadastro do usuário.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            URL do Servidor de Email
          </Label>
          <Input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://mailcrm.pilar.com.br"
          />
          <p className="text-xs text-muted-foreground">
            Este endpoint será usado para enviar e receber emails de todos os usuários.
          </p>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configuração
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
