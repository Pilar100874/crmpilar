import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UnidadesCRUD } from "./UnidadesCRUD";
import { SegmentosCRUD } from "./SegmentosCRUD";
import { GruposAcessoCRUD } from "./GruposAcessoCRUD";
import { UsuariosCRUD } from "./UsuariosCRUD";
import { ClientesCRUD } from "./ClientesCRUD";
import { RedesSociaisCRUD } from "./RedesSociaisCRUD";
import QuickRepliesCRUD from "./QuickRepliesCRUD";
import QuickAttachmentsCRUD from "./QuickAttachmentsCRUD";
import { APIGeneratorCRUD } from "./APIGeneratorCRUD";
import { WebhooksCRUD } from "./WebhooksCRUD";
import { CanaisAtendimentoCRUD } from "./CanaisAtendimentoCRUD";
import { NotificacoesCRUD } from "./NotificacoesCRUD";
import { SegurancaCRUD } from "./SegurancaCRUD";
import { Users, Building2, Tag, FolderTree, UserCog, Share2, MessageSquare, Link as LinkIcon, Globe, Webhook, Key, Bell, Shield } from "lucide-react";

interface EstabelecimentoDetalhesProps {
  estabelecimentoId: string;
  estabelecimentoNome: string;
}

export function EstabelecimentoDetalhes({ estabelecimentoId, estabelecimentoNome }: EstabelecimentoDetalhesProps) {
  return (
    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
      <div className="text-sm font-medium text-muted-foreground mb-4">
        Gerenciando dados de: <span className="text-primary font-semibold">{estabelecimentoNome}</span>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        <AccordionItem value="redes-sociais" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              <span className="font-medium">Redes Sociais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <RedesSociaisCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-clientes" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">Campos do Cadastro de Cliente</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ClientesCRUD />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="grupos-acesso" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              <span className="font-medium">Grupos de Acesso</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <GruposAcessoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-usuarios" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Usuários</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <UsuariosCRUD estabelecimentoId={estabelecimentoId} />
            
            <div className="border-t pt-4 mt-4">
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="unidades" className="border rounded-md">
                  <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Cadastro de Unidades</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <UnidadesCRUD estabelecimentoId={estabelecimentoId} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="segmentos" className="border rounded-md">
                  <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Cadastro de Segmentos</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <SegmentosCRUD estabelecimentoId={estabelecimentoId} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="textos-prontos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-medium">Textos Prontos Globais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <QuickRepliesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="anexos-rapidos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              <span className="font-medium">Anexos Rápidos Globais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <QuickAttachmentsCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="gerador-api" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-medium">Gerador de APIs</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <APIGeneratorCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-webhooks" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Webhooks</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <WebhooksCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="canais" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span className="font-medium">Canais de Atendimento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <CanaisAtendimentoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notificacoes" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-medium">Notificações</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <NotificacoesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seguranca" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-medium">Segurança e LGPD</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SegurancaCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
