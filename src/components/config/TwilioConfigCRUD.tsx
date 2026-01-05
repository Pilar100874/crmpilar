import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, EyeOff, Phone } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface TwilioConfig {
  id?: number;
  account_sid: string;
  auth_token: string;
  sandbox_number: string;
}

export function TwilioConfigCRUD() {
  const [config, setConfig] = useState<TwilioConfig>({
    account_sid: "",
    auth_token: "",
    sandbox_number: "",
  });
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("twilio_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configuração:", error);
        return;
      }

      if (data) {
        setConfig({
          id: data.id,
          account_sid: data.account_sid || "",
          auth_token: data.auth_token || "",
          sandbox_number: data.sandbox_number || "",
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

      if (!config.account_sid || !config.auth_token) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha o Account SID e Auth Token",
          variant: "destructive",
        });
        return;
      }

      const configData = {
        account_sid: config.account_sid,
        auth_token: config.auth_token,
        sandbox_number: config.sandbox_number || null,
      };

      if (hasExistingConfig && config.id) {
        const { error } = await supabase
          .from("twilio_config")
          .update(configData)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("twilio_config")
          .insert([configData]);

        if (error) throw error;
      }

      toast({
        title: "Configuração salva",
        description: "A configuração do Twilio foi salva com sucesso",
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
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-[#F22F46]" />
          <CardTitle>Configuração do Twilio</CardTitle>
        </div>
        <CardDescription>
          Configure o Twilio para envio de SMS e chamadas de voz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account_sid">Account SID *</Label>
          <Input
            id="account_sid"
            type="text"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={config.account_sid}
            onChange={(e) => setConfig({ ...config, account_sid: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Encontre seu Account SID no console do Twilio
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth_token">Auth Token *</Label>
          <div className="relative">
            <Input
              id="auth_token"
              type={showToken ? "text" : "password"}
              placeholder="Seu Auth Token"
              value={config.auth_token}
              onChange={(e) => setConfig({ ...config, auth_token: e.target.value })}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Token de autenticação da sua conta Twilio
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sandbox_number">Número do Sandbox</Label>
          <Input
            id="sandbox_number"
            type="text"
            placeholder="+14155238886"
            value={config.sandbox_number}
            onChange={(e) => setConfig({ ...config, sandbox_number: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Número do sandbox para testes (opcional)
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
