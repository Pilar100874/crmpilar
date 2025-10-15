import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function WhatsAppConfig() {
  const [whatsappToken, setWhatsappToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [webhookUrl] = useState(
    "https://kiuztueouxtyqiecgdxk.supabase.co/functions/v1/whatsapp-webhook"
  );

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from("whatsapp_config")
      .select("*")
      .single();

    if (data) {
      setWhatsappToken(data.business_token || "");
      setPhoneNumberId(data.phone_number_id || "");
      setBusinessAccountId(data.business_account_id || "");
    }
  };

  const handleSave = async () => {
    if (!whatsappToken || !phoneNumberId) {
      toast.error("Preencha o Token e Phone Number ID");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("whatsapp_config")
        .upsert({
          business_token: whatsappToken,
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">Configuração WhatsApp Business API</h1>
          <p className="text-white/70">
            Configure sua integração com a API Oficial do WhatsApp Business
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">WhatsApp Business API</CardTitle>
              <CardDescription className="text-white/70">
                Configure suas credenciais da API Oficial do WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-token" className="text-white">WhatsApp Business Token</Label>
                <Input
                  id="whatsapp-token"
                  type="password"
                  placeholder="EAAxxxxxxxxxx..."
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-sm text-white/70">
                  Token de acesso permanente do WhatsApp Business
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number-id" className="text-white">Phone Number ID</Label>
                <Input
                  id="phone-number-id"
                  placeholder="123456789012345"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-sm text-white/70">
                  ID do número de telefone do WhatsApp Business
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-account-id" className="text-white">Business Account ID (opcional)</Label>
                <Input
                  id="business-account-id"
                  placeholder="123456789012345"
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-sm text-white/70">
                  ID da conta de negócios do Meta
                </p>
              </div>

              <Button onClick={handleSave} className="w-full" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Webhook URL</CardTitle>
              <CardDescription className="text-white/70">
                Configure este URL no WAHA para receber mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="bg-slate-900 border-slate-700 text-white" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success("URL copiada!");
                    }}
                    className="bg-slate-900 border-slate-700 text-white hover:bg-slate-700"
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-sm text-white/70">
                  Use esta URL como webhook no WAHA para receber mensagens
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Como Configurar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <h3 className="font-semibold mb-1 text-white">1. Crie uma Conta Meta Business</h3>
                  <p className="text-white/70">
                    Acesse business.facebook.com e crie uma conta de negócios
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 text-white">2. Configure WhatsApp Business</h3>
                  <p className="text-white/70">
                    No Meta Business, adicione WhatsApp Business e configure seu número
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 text-white">3. Gere Token de Acesso</h3>
                  <p className="text-white/70">
                    Em Configurações do App, gere um token de acesso permanente
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 text-white">4. Configure Webhook</h3>
                  <p className="text-white/70">
                    Use a URL de webhook acima nas configurações do WhatsApp Business
                  </p>
                </div>

                <Button variant="outline" className="w-full bg-slate-900 border-slate-700 text-white hover:bg-slate-700" asChild>
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
      </div>
    </Layout>
  );
}
