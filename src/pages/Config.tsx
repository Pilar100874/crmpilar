import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Store, Megaphone, FileText, Plus, Send, Users, TrendingUp, Search, Link2, File, Bell, Star, ShieldCheck } from "lucide-react";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { WhatsAppConfigCRUD } from "@/components/config/WhatsAppConfigCRUD";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Config() {
  const { openSubmenu } = useLayout();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const secaoParam = searchParams.get('secao');
  
  const [showConfirmationMessages, setShowConfirmationMessages] = useState(
    localStorage.getItem('showConfirmationMessages') !== 'false'
  );
  const [accordionValue, setAccordionValue] = useState<string | undefined>(secaoParam || undefined);

  // Atualiza o accordion quando o parâmetro da URL muda
  useEffect(() => {
    if (secaoParam) {
      setAccordionValue(secaoParam);
    }
  }, [secaoParam]);

  const handleToggleConfirmationMessages = (checked: boolean) => {
    setShowConfirmationMessages(checked);
    localStorage.setItem('showConfirmationMessages', String(checked));
    
    if (checked) {
      toast({
        title: "Mensagens habilitadas",
        description: "As mensagens de confirmação voltarão a aparecer",
      });
    }
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in bg-background min-h-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <SubMenuHeader 
            title="Configurações"
            onOpenSubmenu={() => openSubmenu("Configurações")}
          />
          <h1 className="text-base sm:text-lg font-bold text-foreground">Configurações Gerais</h1>
        </div>
        
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gerencie as configurações da plataforma
        </p>

        <Accordion 
          type="single" 
          collapsible 
          className="space-y-3 sm:space-y-4 w-full max-w-5xl"
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          <AccordionItem value="notificacoes-sistema" className="border rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <div className="text-left">
                  <div className="text-sm sm:text-base font-semibold">Notificações do Sistema</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-normal hidden sm:block">
                    Configure a exibição de mensagens de confirmação
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-confirmations" className="text-sm sm:text-base font-medium">
                      Mostrar mensagens de confirmação
                    </Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Exibe notificações como "Bot ativado", "Mensagem enviada", etc.
                    </p>
                  </div>
                  <Switch
                    id="show-confirmations"
                    checked={showConfirmationMessages}
                    onCheckedChange={handleToggleConfirmationMessages}
                    className="shrink-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Mensagens de erro sempre serão exibidas, independente desta configuração.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cadastro-estabelecimentos" className="border rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <div className="text-left">
                  <div className="text-sm sm:text-base font-semibold">Estabelecimento Cadastrado</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-normal hidden sm:block">
                    Gerencie estabelecimentos e configurações relacionadas
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
              <EstabelecimentosCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="recuperar-senha" className="border rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <div className="text-left">
                  <div className="text-sm sm:text-base font-semibold">Recuperar Senha</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-normal hidden sm:block">
                    Configure o envio de códigos via WhatsApp
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
              <WhatsAppConfigCRUD />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="campanhas" className="border rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <div className="text-left">
                  <div className="text-sm sm:text-base font-semibold">Campanhas</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-normal hidden sm:block">
                    Gerencie suas campanhas de mensagens em massa
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
              <div className="space-y-4 sm:space-y-6 md:space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">Suas Campanhas</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Acompanhe o status e desempenho de suas campanhas
                    </p>
                  </div>
                  <Button className="gap-2 w-full sm:w-auto" size="sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Nova Campanha</span>
                  </Button>
                </div>

                <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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

          <AccordionItem value="conteudos" className="border rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <div className="text-left">
                  <div className="text-sm sm:text-base font-semibold">Conteúdos</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-normal hidden sm:block">
                    Base de conhecimento e materiais de apoio
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
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
