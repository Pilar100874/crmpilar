import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Webhook, Key, Bell, Shield } from "lucide-react";

export default function Config() {
  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Configurações</h1>
          <p className="text-white/70">
            Gerencie as configurações da plataforma
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" />
                <CardTitle className="text-white">Integração n8n</CardTitle>
              </div>
              <CardDescription className="text-white/70">
                Configure a conexão com seu workflow n8n
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="n8n-url" className="text-white">URL Base n8n</Label>
                <Input
                  id="n8n-url"
                  placeholder="https://seu-n8n.com"
                  defaultValue=""
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="n8n-key" className="text-white">API Key</Label>
                <Input
                  id="n8n-key"
                  type="password"
                  placeholder="Sua API key"
                  defaultValue=""
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <Button className="w-full">Salvar Integração</Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <CardTitle className="text-white">Canais de Atendimento</CardTitle>
              </div>
              <CardDescription className="text-white/70">
                Gerencie os canais disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">WhatsApp</p>
                  <p className="text-sm text-white/70">Meta Cloud API</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Telegram</p>
                  <p className="text-sm text-white/70">Bot API</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Web Chat</p>
                  <p className="text-sm text-white/70">Widget incorporado</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button variant="outline" className="w-full bg-slate-900 border-slate-700 text-white hover:bg-slate-700">
                Configurar Canais
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle className="text-white">Notificações</CardTitle>
              </div>
              <CardDescription className="text-white/70">
                Configure alertas e notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Nova conversa</p>
                  <p className="text-sm text-white/70">Alertar ao receber mensagem</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Campanha concluída</p>
                  <p className="text-sm text-white/70">Notificar término de envio</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Erros do sistema</p>
                  <p className="text-sm text-white/70">Alertar falhas críticas</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-white">Segurança e LGPD</CardTitle>
              </div>
              <CardDescription className="text-white/70">
                Configurações de privacidade e dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Retenção de dados</p>
                  <p className="text-sm text-white/70">Período: 90 dias</p>
                </div>
                <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-white hover:bg-slate-700">Ajustar</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Consentimento obrigatório</p>
                  <p className="text-sm text-white/70">Exigir opt-in para campanhas</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button variant="outline" className="w-full bg-slate-900 border-slate-700 text-white hover:bg-slate-700">
                Exportar Dados
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
