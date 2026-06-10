import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, EyeOff, Info } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

type Provider = "evolution" | "cloud_api";

interface WhatsAppConfig {
  id?: string;
  provider: Provider;
  // Evolution
  waha_url: string;
  waha_api_key: string;
  session_name: string;
  // Cloud API
  cloud_phone_number_id: string;
  cloud_access_token: string;
  cloud_business_account_id: string;
  cloud_webhook_verify_token: string;
}

const EMPTY: WhatsAppConfig = {
  provider: "evolution",
  waha_url: "",
  waha_api_key: "",
  session_name: "default",
  cloud_phone_number_id: "",
  cloud_access_token: "",
  cloud_business_account_id: "",
  cloud_webhook_verify_token: "",
};

export function WhatsAppConfigCRUD() {
  const [config, setConfig] = useState<WhatsAppConfig>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

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
          provider: (data.provider as Provider) || "evolution",
          waha_url: data.waha_url || "",
          waha_api_key: data.waha_api_key || "",
          session_name: data.session_name || "default",
          cloud_phone_number_id: data.cloud_phone_number_id || "",
          cloud_access_token: data.cloud_access_token || "",
          cloud_business_account_id: data.cloud_business_account_id || "",
          cloud_webhook_verify_token: data.cloud_webhook_verify_token || "",
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

      if (config.provider === "evolution") {
        if (!config.waha_url || !config.session_name) {
          toast({
            title: "Campos obrigatórios",
            description: "Preencha a URL da API e o nome da sessão",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (!config.cloud_phone_number_id || !config.cloud_access_token) {
          toast({
            title: "Campos obrigatórios",
            description: "Preencha o Phone Number ID e o Access Token da Cloud API",
            variant: "destructive",
          });
          return;
        }
      }

      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast({ title: "Erro", description: "Nenhum estabelecimento selecionado", variant: "destructive" });
        return;
      }

      const configData = {
        estabelecimento_id: estabelecimentoId,
        provider: config.provider,
        waha_url: config.waha_url,
        waha_api_key: config.waha_api_key || null,
        session_name: config.session_name,
        cloud_phone_number_id: config.cloud_phone_number_id || null,
        cloud_access_token: config.cloud_access_token || null,
        cloud_business_account_id: config.cloud_business_account_id || null,
        cloud_webhook_verify_token: config.cloud_webhook_verify_token || null,
      };

      if (hasExistingConfig && config.id) {
        const { error } = await supabase
          .from("whatsapp_config")
          .update(configData)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_config").insert([configData]);
        if (error) throw error;
      }

      toast({ title: "Configuração salva", description: "A configuração do WhatsApp foi salva com sucesso" });
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
        <CardTitle>Configuração do WhatsApp</CardTitle>
        <CardDescription>
          Escolha o provedor e configure as credenciais de envio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor de provedor */}
        <div className="space-y-3">
          <Label>Provedor</Label>
          <RadioGroup
            value={config.provider}
            onValueChange={(v) => setConfig({ ...config, provider: v as Provider })}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <label
              htmlFor="prov-evolution"
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition ${
                config.provider === "evolution" ? "border-primary bg-accent/40" : "border-border"
              }`}
            >
              <RadioGroupItem value="evolution" id="prov-evolution" className="mt-1" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Evolution API</span>
                  <Badge variant="secondary">Recomendado</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  WhatsApp pessoal via QR Code. Grátis. Sem botões/listas interativas (limitação da Meta).
                </p>
              </div>
            </label>

            <label
              htmlFor="prov-cloud"
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition ${
                config.provider === "cloud_api" ? "border-primary bg-accent/40" : "border-border"
              }`}
            >
              <RadioGroupItem value="cloud_api" id="prov-cloud" className="mt-1" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">WhatsApp Cloud API</span>
                  <Badge>Oficial Meta</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  API oficial. Pago por conversa. Suporta List Message e botões interativos nativos.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Campos Evolution */}
        {config.provider === "evolution" && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="waha_url">URL da API *</Label>
              <Input
                id="waha_url"
                type="text"
                placeholder="https://evolution.seudominio.com"
                value={config.waha_url}
                onChange={(e) => setConfig({ ...config, waha_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">URL base da Evolution API</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waha_api_key">API Key</Label>
              <div className="relative">
                <Input
                  id="waha_api_key"
                  type={showSecrets ? "text" : "password"}
                  placeholder="Chave da API"
                  value={config.waha_api_key}
                  onChange={(e) => setConfig({ ...config, waha_api_key: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_name">Nome da Instância/Sessão *</Label>
              <Input
                id="session_name"
                type="text"
                placeholder="default"
                value={config.session_name}
                onChange={(e) => setConfig({ ...config, session_name: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Campos Cloud API */}
        {config.provider === "cloud_api" && (
          <div className="space-y-4 border-t pt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Estrutura pronta para Cloud API. O envio efetivo via Meta será ativado em uma próxima etapa —
                no momento o sistema continua enviando pelo Evolution.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="cloud_phone_number_id">Phone Number ID *</Label>
              <Input
                id="cloud_phone_number_id"
                type="text"
                placeholder="Ex: 123456789012345"
                value={config.cloud_phone_number_id}
                onChange={(e) => setConfig({ ...config, cloud_phone_number_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Encontrado em: Meta Business → WhatsApp → Configuração da API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cloud_access_token">Access Token *</Label>
              <div className="relative">
                <Input
                  id="cloud_access_token"
                  type={showSecrets ? "text" : "password"}
                  placeholder="Token permanente da Cloud API"
                  value={config.cloud_access_token}
                  onChange={(e) => setConfig({ ...config, cloud_access_token: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Gere um token permanente em Meta Business → Usuários do Sistema
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cloud_business_account_id">WhatsApp Business Account ID (WABA)</Label>
              <Input
                id="cloud_business_account_id"
                type="text"
                placeholder="Ex: 987654321098765"
                value={config.cloud_business_account_id}
                onChange={(e) => setConfig({ ...config, cloud_business_account_id: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cloud_webhook_verify_token">Webhook Verify Token</Label>
              <Input
                id="cloud_webhook_verify_token"
                type="text"
                placeholder="Token livre que você define no painel Meta"
                value={config.cloud_webhook_verify_token}
                onChange={(e) => setConfig({ ...config, cloud_webhook_verify_token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use o mesmo valor ao configurar o webhook no painel Meta
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
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
