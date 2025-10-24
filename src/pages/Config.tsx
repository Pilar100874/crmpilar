import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Webhook, ShieldCheck, Store, Users, MessageSquare, FileText, Globe, Building2, Lock, Radio, Database, Code } from "lucide-react";
import { AdministradoresCRUD } from "@/components/config/AdministradoresCRUD";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { UsuariosCRUD } from "@/components/config/UsuariosCRUD";
import { ClientesCRUD } from "@/components/config/ClientesCRUD";
import { GruposAcessoCRUD } from "@/components/config/GruposAcessoCRUD";
import { UnidadesCRUD } from "@/components/config/UnidadesCRUD";
import { SegmentosCRUD } from "@/components/config/SegmentosCRUD";
import QuickRepliesCRUD from "@/components/config/QuickRepliesCRUD";
import QuickAttachmentsCRUD from "@/components/config/QuickAttachmentsCRUD";
import { WebhooksCRUD } from "@/components/config/WebhooksCRUD";
import { RedesSociaisCRUD } from "@/components/config/RedesSociaisCRUD";
import { CanaisAtendimentoCRUD } from "@/components/config/CanaisAtendimentoCRUD";
import { NotificacoesCRUD } from "@/components/config/NotificacoesCRUD";
import { SegurancaCRUD } from "@/components/config/SegurancaCRUD";
import { DatabaseConnectionsCRUD } from "@/components/config/DatabaseConnectionsCRUD";
import { APIGeneratorCRUD } from "@/components/config/APIGeneratorCRUD";

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

          <AccordionItem value="cadastro-usuarios" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Cadastro de Usuários</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie usuários do estabelecimento
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <UsuariosCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cadastro-clientes" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Cadastro de Clientes</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie clientes e leads
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <ClientesCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="grupos-acesso" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Grupos de Acesso</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure permissões e grupos de usuários
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <GruposAcessoCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="unidades" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Unidades</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie unidades do estabelecimento
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <UnidadesCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="segmentos" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Segmentos</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie segmentos de clientes
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <SegmentosCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="textos-prontos" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Textos Prontos</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure respostas rápidas
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <QuickRepliesCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="anexos" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Anexos Rápidos</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie anexos e arquivos rápidos
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <QuickAttachmentsCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="webhooks" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Webhooks</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure integrações via webhooks
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <WebhooksCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="redes-sociais" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Redes Sociais</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure links de redes sociais
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <RedesSociaisCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="canais-atendimento" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Canais de Atendimento</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure canais de comunicação
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <CanaisAtendimentoCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notificacoes" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Notificações</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure preferências de notificações
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <NotificacoesCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="seguranca" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Segurança e LGPD</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure políticas de segurança
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <SegurancaCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="database-connections" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Conexões de Banco de Dados</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure conexões externas de banco
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <DatabaseConnectionsCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="api-generator" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Gerador de APIs</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure endpoints de API personalizados
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <APIGeneratorCRUD />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Layout>
  );
}
