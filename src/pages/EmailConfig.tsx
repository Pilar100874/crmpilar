import { useState, useEffect } from "react";
import { EmailOAuthConfig } from "@/components/config/EmailOAuthConfig";
import { EmailServerConfig } from "@/components/config/EmailServerConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Server, KeyRound, Settings, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

type EmailMode = "external" | "oauth";

export default function EmailConfig() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<EmailMode>("external");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadEstabelecimento = async () => {
      const id = await getEstabelecimentoId();
      setEstabelecimentoId(id);
    };
    loadEstabelecimento();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) {
      loadEmailMode();
    }
  }, [estabelecimentoId]);

  const loadEmailMode = async () => {
    if (!estabelecimentoId) return;
    setLoading(true);

    try {
      // Check which mode is active by looking at email_oauth_config
      const { data, error } = await supabase
        .from("email_oauth_config" as any)
        .select("provider, enabled")
        .eq("estabelecimento_id", estabelecimentoId);

      if (error) throw error;

      // Check if external_server is enabled
      const externalConfig = (data as any[])?.find((c: any) => c.provider === "external_server");
      const googleConfig = (data as any[])?.find((c: any) => c.provider === "google");
      const microsoftConfig = (data as any[])?.find((c: any) => c.provider === "microsoft");

      // Priority: if external_server is enabled, use external mode
      // Otherwise, if google or microsoft is enabled, use oauth mode
      if (externalConfig?.enabled) {
        setEmailMode("external");
      } else if (googleConfig?.enabled || microsoftConfig?.enabled) {
        setEmailMode("oauth");
      } else {
        setEmailMode("external"); // Default
      }
    } catch (error) {
      console.error("Erro ao carregar modo de email:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailMode = async () => {
    if (!estabelecimentoId) {
      toast.error("Estabelecimento não selecionado");
      return;
    }

    setSaving(true);
    try {
      // Get current configs
      const { data: currentConfigs } = await supabase
        .from("email_oauth_config" as any)
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId);

      if (emailMode === "external") {
        // Enable external_server, disable google and microsoft
        const externalConfig = (currentConfigs as any[])?.find((c: any) => c.provider === "external_server");
        
        if (externalConfig) {
          await supabase
            .from("email_oauth_config" as any)
            .update({ enabled: true, updated_at: new Date().toISOString() })
            .eq("id", externalConfig.id);
        } else {
          await supabase
            .from("email_oauth_config" as any)
            .insert({
              estabelecimento_id: estabelecimentoId,
              provider: "external_server",
              enabled: true,
              updated_at: new Date().toISOString()
            });
        }

        // Disable OAuth providers
        const googleConfig = (currentConfigs as any[])?.find((c: any) => c.provider === "google");
        const microsoftConfig = (currentConfigs as any[])?.find((c: any) => c.provider === "microsoft");

        if (googleConfig) {
          await supabase
            .from("email_oauth_config" as any)
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", googleConfig.id);
        }
        if (microsoftConfig) {
          await supabase
            .from("email_oauth_config" as any)
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", microsoftConfig.id);
        }
      } else {
        // Disable external_server, keep OAuth as is (user will configure which one)
        const externalConfig = (currentConfigs as any[])?.find((c: any) => c.provider === "external_server");
        if (externalConfig) {
          await supabase
            .from("email_oauth_config" as any)
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", externalConfig.id);
        }
      }

      toast.success("Modo de email salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar modo de email:", error);
      toast.error("Erro ao salvar modo de email");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Modo de Envio de Email
          </CardTitle>
          <CardDescription>
            Escolha como os emails serão enviados e recebidos no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={emailMode}
            onValueChange={(value) => setEmailMode(value as EmailMode)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="external" id="external" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="external" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Server className="h-4 w-4" />
                  Servidor de Email Externo (SMTP/IMAP)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Use seu próprio servidor de email via API Railway. Cada usuário configura suas credenciais SMTP/IMAP no cadastro.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="oauth" id="oauth" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="oauth" className="flex items-center gap-2 cursor-pointer font-medium">
                  <KeyRound className="h-4 w-4" />
                  Integração OAuth (Gmail/Outlook)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecte contas Gmail ou Outlook via OAuth. Requer configuração das APIs do Google/Microsoft.
                </p>
              </div>
            </div>
          </RadioGroup>

          <Button onClick={saveEmailMode} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Modo de Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={emailMode} onValueChange={(value) => setEmailMode(value as EmailMode)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Servidor Externo
          </TabsTrigger>
          <TabsTrigger value="oauth" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            OAuth Gmail/Outlook
          </TabsTrigger>
        </TabsList>
        <TabsContent value="external">
          <EmailServerConfig />
        </TabsContent>
        <TabsContent value="oauth">
          <EmailOAuthConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
