import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Webhook, Key, Bell, Shield, Globe, MessageSquare, Link as LinkIcon, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { AdministradoresCRUD } from "@/components/config/AdministradoresCRUD";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { APIGeneratorCRUD } from "@/components/config/APIGeneratorCRUD";
import { WebhooksCRUD } from "@/components/config/WebhooksCRUD";
import QuickRepliesCRUD from "@/components/config/QuickRepliesCRUD";
import QuickAttachmentsCRUD from "@/components/config/QuickAttachmentsCRUD";

export default function Config() {

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
