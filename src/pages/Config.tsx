import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, Store, Megaphone, FileText, Plus, Send, Users, TrendingUp, Search, Link2, File, Building2 } from "lucide-react";
import { AdministradoresCRUD } from "@/components/config/AdministradoresCRUD";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { EmpresaFieldsCRUD } from "@/components/config/EmpresaFieldsCRUD";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

export default function Config() {
  const { openSubmenu } = useLayout();

  return (
    <div className="p-8 space-y-8 animate-fade-in bg-white min-h-full">
        <div className="flex items-center gap-4">
          <SubMenuHeader 
            title="Configurações"
            onOpenSubmenu={() => openSubmenu("Configurações")}
          />
          <h1 className="text-lg font-bold text-foreground">Configurações Gerais</h1>
        </div>
        
        <p className="text-muted-foreground">
          Gerencie as configurações da plataforma
        </p>

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

          <AccordionItem value="campos-empresa" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Campos de Empresa</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure campos personalizados para cadastro de empresas
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <EmpresaFieldsCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="campanhas" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Campanhas</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Gerencie suas campanhas de mensagens em massa
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Suas Campanhas</h3>
                    <p className="text-sm text-muted-foreground">
                      Acompanhe o status e desempenho de suas campanhas
                    </p>
                  </div>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Campanha
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total de Campanhas
                      </CardTitle>
                      <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">3</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Este mês
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Destinatários Alcançados
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">1120</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        +18% vs mês anterior
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Taxa de Engajamento
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">87%</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        +5% esta semana
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 1, name: "Promoção Black Friday", status: "scheduled", recipients: 1250, sent: 0 },
                    { id: 2, name: "Follow-up Abandonos", status: "running", recipients: 450, sent: 320 },
                    { id: 3, name: "Pesquisa Satisfação", status: "completed", recipients: 800, sent: 800 },
                  ].map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-foreground">{campaign.name}</h3>
                          <Badge variant={campaign.status === "completed" ? "default" : "secondary"}>
                            {campaign.status === "completed" ? "Concluída" : campaign.status === "running" ? "Enviando" : "Agendada"}
                          </Badge>
                        </div>
                        <div className="flex gap-6 text-sm text-muted-foreground">
                          <span>
                            Destinatários: <strong className="text-foreground">{campaign.recipients}</strong>
                          </span>
                          <span>
                            Enviadas: <strong className="text-foreground">{campaign.sent}</strong>
                          </span>
                          {campaign.sent > 0 && (
                            <span>
                              Progresso: <strong className="text-foreground">
                                {Math.round((campaign.sent / campaign.recipients) * 100)}%
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="conteudos" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Conteúdos</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Base de conhecimento e materiais de apoio
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Seus Conteúdos</h3>
                    <p className="text-sm text-muted-foreground">
                      Materiais de apoio e documentação
                    </p>
                  </div>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Conteúdo
                  </Button>
                </div>

                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar conteúdos..." className="pl-10" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { id: 1, titulo: "Política de Trocas", tipo: "faq", tags: ["Vendas", "Pós-venda"], url: null },
                    { id: 2, titulo: "Manual do Produto", tipo: "pdf", tags: ["Suporte", "Documentação"], url: "/docs/manual.pdf" },
                    { id: 3, titulo: "Script de Atendimento", tipo: "script", tags: ["Treinamento"], url: null },
                  ].map((content) => {
                    const TypeIcon = content.tipo === "pdf" ? File : content.tipo === "link" ? Link2 : FileText;
                    const typeLabel = content.tipo === "pdf" ? "PDF" : content.tipo === "link" ? "Link" : content.tipo === "script" ? "Script" : "FAQ";
                    return (
                      <Card key={content.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="p-3 rounded-lg bg-gradient-primary/10 text-primary">
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {typeLabel}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mt-4">{content.titulo}</CardTitle>
                          <CardDescription>
                            {content.url ? (
                              <a href={content.url} className="text-primary hover:underline text-xs">
                                Ver documento
                              </a>
                            ) : (
                              <span className="text-xs">Conteúdo interno</span>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {content.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <Button variant="outline" className="w-full mt-4" size="sm">
                            Editar
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
    </div>
  );
}
