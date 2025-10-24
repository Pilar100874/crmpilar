import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Webhook, ShieldCheck, Store, MessageSquare, Save, ExternalLink } from "lucide-react";
import { AdministradoresCRUD } from "@/components/config/AdministradoresCRUD";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Config() {
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
      <div className="p-8 space-y-8 animate-fade-in bg-white min-h-full">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações da plataforma
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4 max-w-4xl">
          <AccordionItem value="cadastro-estabelecimentos" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Cadastro de Estabelecimentos</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie estabelecimentos/empresas do sistema
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <EstabelecimentosCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cadastro-administradores" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Cadastro de Administradores</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie administradores do sistema
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <AdministradoresCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="whatsapp-config" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Configuração WhatsApp Business API</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure sua integração com a API Oficial do WhatsApp
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>WhatsApp Business API</CardTitle>
                    <CardDescription>
                      Configure suas credenciais da API Oficial do WhatsApp Business
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-token">WhatsApp Business Token</Label>
                      <Input
                        id="whatsapp-token"
                        type="password"
                        placeholder="EAAxxxxxxxxxx..."
                        value={whatsappToken}
                        onChange={(e) => setWhatsappToken(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Token de acesso permanente do WhatsApp Business
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone-number-id">Phone Number ID</Label>
                      <Input
                        id="phone-number-id"
                        placeholder="123456789012345"
                        value={phoneNumberId}
                        onChange={(e) => setPhoneNumberId(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        ID do número de telefone do WhatsApp Business
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business-account-id">Business Account ID (opcional)</Label>
                      <Input
                        id="business-account-id"
                        placeholder="123456789012345"
                        value={businessAccountId}
                        onChange={(e) => setBusinessAccountId(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        ID da conta de negócios do Meta
                      </p>
                    </div>

                    <Button onClick={handleSave} className="w-full" disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Webhook URL</CardTitle>
                    <CardDescription>
                      Configure este URL no WAHA para receber mensagens
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>URL do Webhook</Label>
                      <div className="flex gap-2">
                        <Input value={webhookUrl} readOnly />
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(webhookUrl);
                            toast.success("URL copiada!");
                          }}
                        >
                          Copiar
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Use esta URL como webhook no WAHA para receber mensagens
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Como Configurar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div>
                        <h3 className="font-semibold mb-1 text-foreground">1. Crie uma Conta Meta Business</h3>
                        <p className="text-muted-foreground">
                          Acesse business.facebook.com e crie uma conta de negócios
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1 text-foreground">2. Configure WhatsApp Business</h3>
                        <p className="text-muted-foreground">
                          No Meta Business, adicione WhatsApp Business e configure seu número
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1 text-foreground">3. Gere Token de Acesso</h3>
                        <p className="text-muted-foreground">
                          Em Configurações do App, gere um token de acesso permanente
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1 text-foreground">4. Configure Webhook</h3>
                        <p className="text-muted-foreground">
                          Use a URL de webhook acima nas configurações do WhatsApp Business
                        </p>
                      </div>

                      <Button variant="outline" className="w-full" asChild>
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Layout>
  );
}
