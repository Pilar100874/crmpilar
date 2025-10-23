import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UnidadesCRUD } from "./UnidadesCRUD";
import { SegmentosCRUD } from "./SegmentosCRUD";
import { GruposAcessoCRUD } from "./GruposAcessoCRUD";
import { UsuariosCRUD } from "./UsuariosCRUD";
import { ClientesCRUD } from "./ClientesCRUD";
import { RedesSociaisCRUD } from "./RedesSociaisCRUD";
import { Users, Building2, Tag, FolderTree, UserCog, Share2 } from "lucide-react";

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
                  <GruposAcessoCRUD estabelecimentoId={estabelecimentoId} />
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
            <UnidadesCRUD estabelecimentoId={estabelecimentoId} />
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
            <SegmentosCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-usuarios" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Usuários</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UsuariosCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
