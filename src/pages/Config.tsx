import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Webhook, Key, Bell, Shield, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function Config() {
  const [socialLinks, setSocialLinks] = useState({
    whatsapp: "",
    instagram: "",
    facebook: "",
    website: ""
  });

  useEffect(() => {
    const saved = localStorage.getItem("socialLinks");
    if (saved) {
      setSocialLinks(JSON.parse(saved));
    }
  }, []);

  const handleSaveSocialLinks = () => {
    localStorage.setItem("socialLinks", JSON.stringify(socialLinks));
    toast.success("Links das redes sociais salvos!");
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
          <AccordionItem value="n8n" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Integração n8n</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure a conexão com seu workflow n8n
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="n8n-url">URL Base n8n</Label>
                <Input
                  id="n8n-url"
                  placeholder="https://seu-n8n.com"
                  defaultValue=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="n8n-key">API Key</Label>
                <Input
                  id="n8n-key"
                  type="password"
                  placeholder="Sua API key"
                  defaultValue=""
                />
              </div>
              <Button className="w-full">Salvar Integração</Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="canais" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Canais de Atendimento</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie os canais disponíveis
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">Meta Cloud API</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Telegram</p>
                  <p className="text-sm text-muted-foreground">Bot API</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Web Chat</p>
                  <p className="text-sm text-muted-foreground">Widget incorporado</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button variant="outline" className="w-full">
                Configurar Canais
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notificacoes" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Notificações</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure alertas e notificações
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Nova conversa</p>
                  <p className="text-sm text-muted-foreground">Alertar ao receber mensagem</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Campanha concluída</p>
                  <p className="text-sm text-muted-foreground">Notificar término de envio</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Erros do sistema</p>
                  <p className="text-sm text-muted-foreground">Alertar falhas críticas</p>
                </div>
                <Switch defaultChecked />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="seguranca" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Segurança e LGPD</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configurações de privacidade e dados
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Retenção de dados</p>
                  <p className="text-sm text-muted-foreground">Período: 90 dias</p>
                </div>
                <Button variant="outline" size="sm">Ajustar</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Consentimento obrigatório</p>
                  <p className="text-sm text-muted-foreground">Exigir opt-in para campanhas</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button variant="outline" className="w-full">
                Exportar Dados
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="redes-sociais" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Redes Sociais</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure os links das suas redes sociais para o bloco de despedida
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="https://wa.me/5511999999999"
                  value={socialLinks.whatsapp}
                  onChange={(e) => setSocialLinks({ ...socialLinks, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/seu_perfil"
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/sua_pagina"
                  value={socialLinks.facebook}
                  onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://seusite.com"
                  value={socialLinks.website}
                  onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                />
              </div>
              <Button onClick={handleSaveSocialLinks} className="w-full">Salvar Links</Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Layout>
  );
}
