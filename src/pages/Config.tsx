import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Webhook, Key, Bell, Shield, Share2, Users, UserCog, Building2, Tag, FolderTree, Globe, MessageSquare, Link as LinkIcon, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { UnidadesCRUD } from "@/components/config/UnidadesCRUD";
import { SegmentosCRUD } from "@/components/config/SegmentosCRUD";
import { GruposAcessoCRUD } from "@/components/config/GruposAcessoCRUD";
import { UsuariosCRUD } from "@/components/config/UsuariosCRUD";
import { AdministradoresCRUD } from "@/components/config/AdministradoresCRUD";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { ClientesCRUD } from "@/components/config/ClientesCRUD";
import { APIGeneratorCRUD } from "@/components/config/APIGeneratorCRUD";
import { WebhooksCRUD } from "@/components/config/WebhooksCRUD";
import QuickRepliesCRUD from "@/components/config/QuickRepliesCRUD";
import QuickAttachmentsCRUD from "@/components/config/QuickAttachmentsCRUD";

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

          <AccordionItem value="cadastro-webhooks" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Cadastro de Webhooks</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie webhooks para integrações com n8n, WAHA e WhatsApp
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <WebhooksCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="gerador-api" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Gerador de APIs</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Crie endpoints de API dinâmicos conectados a bancos de dados
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <APIGeneratorCRUD />
            </AccordionContent>
          </AccordionItem>

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
            <AccordionContent className="px-6 pb-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Estabelecimentos</h3>
                <EstabelecimentosCRUD />
              </div>

              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="redes-sociais" className="border rounded-md">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">Redes Sociais</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        placeholder="https://wa.me/5511999999999"
                        value={socialLinks.whatsapp}
                        onChange={(e) => setSocialLinks({...socialLinks, whatsapp: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        placeholder="https://instagram.com/seuperfil"
                        value={socialLinks.instagram}
                        onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        placeholder="https://facebook.com/suapagina"
                        value={socialLinks.facebook}
                        onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        placeholder="https://seusite.com.br"
                        value={socialLinks.website}
                        onChange={(e) => setSocialLinks({...socialLinks, website: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleSaveSocialLinks} className="w-full">Salvar Links</Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cadastro-clientes" className="border rounded-md">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-medium">Campos do Cadastro de Cliente</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-6">
                    <ClientesCRUD />
                    
                    <Accordion type="single" collapsible className="space-y-2">
                      <AccordionItem value="grupos-acesso" className="border rounded-md">
                        <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/20">
                          <div className="flex items-center gap-2">
                            <FolderTree className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">Grupos de Acesso</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <GruposAcessoCRUD />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cadastro-unidades" className="border rounded-md">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">Cadastro de Unidades</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <UnidadesCRUD />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cadastro-segmentos" className="border rounded-md">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="font-medium">Cadastro de Segmentos</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <SegmentosCRUD />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cadastro-usuarios" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Cadastro de Usuários</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie usuários e suas informações
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <UsuariosCRUD />
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

          <AccordionItem value="textos-prontos" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Textos Prontos Globais</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Crie textos prontos disponíveis para grupos de acesso
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <QuickRepliesCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="anexos-rapidos" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Anexos Rápidos Globais</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Cadastre links e arquivos para grupos de acesso
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <QuickAttachmentsCRUD />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Layout>
  );
}
