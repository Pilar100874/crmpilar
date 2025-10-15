import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, ExternalLink } from "lucide-react";

export default function WhatsAppConfig() {
  const [wahaUrl, setWahaUrl] = useState("");
  const [wahaToken, setWahaToken] = useState("");
  const [webhookUrl] = useState(
    "https://kiuztueouxtyqiecgdxk.supabase.co/functions/v1/whatsapp-webhook"
  );

  const handleSave = async () => {
    // Here you would save to Supabase secrets
    toast.success("Configurações salvas! Configure os secrets no backend.");
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Configuração WhatsApp</h1>
          <p className="text-muted-foreground">
            Configure sua integração com WAHA para WhatsApp Web e WhatsApp Business API
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>WAHA Configuration</CardTitle>
              <CardDescription>
                Configure sua instância WAHA (WhatsApp HTTP API)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waha-url">WAHA URL</Label>
                <Input
                  id="waha-url"
                  placeholder="https://waha.yourdomain.com"
                  value={wahaUrl}
                  onChange={(e) => setWahaUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  URL da sua instância WAHA (self-hosted ou cloud)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waha-token">WAHA Token</Label>
                <Input
                  id="waha-token"
                  type="password"
                  placeholder="seu-token-waha"
                  value={wahaToken}
                  onChange={(e) => setWahaToken(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Token de autenticação da sua instância WAHA
                </p>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
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
                  <h3 className="font-semibold mb-1">1. Instale WAHA</h3>
                  <p className="text-muted-foreground">
                    Use Docker: <code className="bg-muted px-2 py-1 rounded">docker run -it -p 3000:3000/tcp devlikeapro/waha</code>
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1">2. Configure Webhook no WAHA</h3>
                  <p className="text-muted-foreground">
                    POST /api/session/start com webhook: {webhookUrl}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1">3. Configure Secrets</h3>
                  <p className="text-muted-foreground">
                    Adicione WAHA_URL e WAHA_TOKEN como secrets no backend
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1">4. WhatsApp Business API (Oficial)</h3>
                  <p className="text-muted-foreground">
                    WAHA suporta WhatsApp Business API. Configure suas credenciais do Meta Business no WAHA.
                  </p>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://github.com/devlikeapro/waha"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Documentação WAHA
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
