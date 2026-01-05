import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, EyeOff, MessageCircle } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface WhatsAppBusinessConfig {
  id?: string;
  business_token: string;
  phone_number_id: string;
  business_account_id: string;
}

export function WhatsAppBusinessConfigCRUD() {
  const [config, setConfig] = useState<WhatsAppBusinessConfig>({
    business_token: "",
    phone_number_id: "",
    business_account_id: "",
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
          business_token: data.business_token || "",
          phone_number_id: data.phone_number_id || "",
          business_account_id: data.business_account_id || "",
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

      if (!config.business_token || !config.phone_number_id) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha o Token e o Phone Number ID",
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
        business_token: config.business_token,
        phone_number_id: config.phone_number_id,
        business_account_id: config.business_account_id || null,
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
        description: "A configuração do WhatsApp Business foi salva com sucesso",
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
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
          <CardTitle>Configuração do WhatsApp Business API</CardTitle>
        </div>
        <CardDescription>
          Configure a API oficial do WhatsApp Business para envio de mensagens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business_token">Access Token *</Label>
          <div className="relative">
            <Input
              id="business_token"
              type={showToken ? "text" : "password"}
              placeholder="EAAxxxxxxxxxxxxxxxx"
              value={config.business_token}
              onChange={(e) => setConfig({ ...config, business_token: e.target.value })}
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
            Token de acesso permanente obtido no Meta Business Suite
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number_id">Phone Number ID *</Label>
          <Input
            id="phone_number_id"
            type="text"
            placeholder="123456789012345"
            value={config.phone_number_id}
            onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            ID do número de telefone registrado no WhatsApp Business
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_account_id">Business Account ID</Label>
          <Input
            id="business_account_id"
            type="text"
            placeholder="123456789012345"
            value={config.business_account_id}
            onChange={(e) => setConfig({ ...config, business_account_id: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            ID da conta empresarial no Meta Business (opcional)
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
