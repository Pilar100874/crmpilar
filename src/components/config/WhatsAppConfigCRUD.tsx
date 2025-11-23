import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface WhatsAppConfig {
  id?: string;
  waha_url: string;
  waha_api_key: string;
  session_name: string;
}

export function WhatsAppConfigCRUD() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    waha_url: "",
    waha_api_key: "",
    session_name: "default",
  });
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        console.log("Nenhum estabelecimento selecionado");
        return;
      }

      const { data, error } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configuração:", error);
        return;
      }

      if (data) {
        setConfig({
          id: data.id,
          waha_url: data.waha_url || "",
          waha_api_key: data.waha_api_key || "",
          session_name: data.session_name || "default",
        });
        setHasExistingConfig(true);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!config.waha_url || !config.session_name) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha a URL da API e o nome da sessão",
          variant: "destructive",
        });
        return;
      }

      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast({
          title: "Erro",
          description: "Nenhum estabelecimento selecionado",
          variant: "destructive",
        });
        return;
      }

      const configData = {
        estabelecimento_id: estabelecimentoId,
        waha_url: config.waha_url,
        waha_api_key: config.waha_api_key || null,
        session_name: config.session_name,
      };

      if (hasExistingConfig && config.id) {
        const { error } = await supabase
          .from("whatsapp_config")
          .update(configData)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_config")
          .insert([configData]);

        if (error) throw error;
      }

      toast({
        title: "Configuração salva",
        description: "A configuração do WhatsApp foi salva com sucesso",
      });

      await loadConfig();
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do WhatsApp (WAHA)</CardTitle>
        <CardDescription>
          Configure a API do WAHA para envio de códigos de verificação via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="waha_url">URL da API *</Label>
          <Input
            id="waha_url"
            type="text"
            placeholder="http://localhost:3000"
            value={config.waha_url}
            onChange={(e) => setConfig({ ...config, waha_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            URL base da API WAHA (ex: http://localhost:3000)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waha_api_key">API Key</Label>
          <div className="relative">
            <Input
              id="waha_api_key"
              type={showApiKey ? "text" : "password"}
              placeholder="Chave da API (opcional)"
              value={config.waha_api_key}
              onChange={(e) => setConfig({ ...config, waha_api_key: e.target.value })}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Chave de autenticação da API (se configurada)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="session_name">Nome da Sessão *</Label>
          <Input
            id="session_name"
            type="text"
            placeholder="default"
            value={config.session_name}
            onChange={(e) => setConfig({ ...config, session_name: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Nome da sessão do WhatsApp no WAHA
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configuração
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
