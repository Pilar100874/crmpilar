import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Store, Megaphone, FileText, Plus, Send, Users, TrendingUp, 
  Search, Link2, File, Bell, ShieldCheck, ChevronRight, ArrowLeft,
  Settings, X
} from "lucide-react";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { WhatsAppConfigCRUD } from "@/components/config/WhatsAppConfigCRUD";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    id: "notificacoes-sistema",
    title: "Notificações",
    description: "Mensagens de confirmação",
    icon: Bell,
    color: "text-blue-500",
  },
  {
    id: "cadastro-estabelecimentos",
    title: "Estabelecimento",
    description: "Gerenciar estabelecimentos",
    icon: Store,
    color: "text-green-500",
  },
  {
    id: "recuperar-senha",
    title: "Recuperar Senha",
    description: "Configurar via WhatsApp",
    icon: ShieldCheck,
    color: "text-purple-500",
  },
  {
    id: "campanhas",
    title: "Campanhas",
    description: "Mensagens em massa",
    icon: Megaphone,
    color: "text-orange-500",
  },
  {
    id: "conteudos",
    title: "Conteúdos",
    description: "Base de conhecimento",
    icon: FileText,
    color: "text-cyan-500",
  },
];

export default function Config() {
  const { openSubmenu } = useLayout();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const secaoParam = searchParams.get('secao');
  
  const [activeSection, setActiveSection] = useState<string | null>(secaoParam);
  const [showConfirmationMessages, setShowConfirmationMessages] = useState(
    localStorage.getItem('showConfirmationMessages') !== 'false'
  );

  useEffect(() => {
    if (secaoParam) {
      setActiveSection(secaoParam);
    }
  }, [secaoParam]);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setSearchParams({ secao: sectionId });
  };

  const handleBack = () => {
    setActiveSection(null);
    setSearchParams({});
  };

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

  const activeSectionData = CONFIG_SECTIONS.find(s => s.id === activeSection);

  // Renderiza o conteúdo de cada seção
  const renderSectionContent = () => {
    switch (activeSection) {
      case "notificacoes-sistema":
        return <NotificacoesContent 
          showConfirmationMessages={showConfirmationMessages}
          onToggle={handleToggleConfirmationMessages}
        />;
      case "cadastro-estabelecimentos":
        return <EstabelecimentosCRUD />;
      case "recuperar-senha":
        return <WhatsAppConfigCRUD />;
      case "campanhas":
        return <CampanhasContent />;
      case "conteudos":
        return <ConteudosContent />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-3 sm:p-4">
          {activeSection ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {activeSectionData && (
                  <activeSectionData.icon className={cn("w-5 h-5 shrink-0", activeSectionData.color)} />
                )}
                <h1 className="font-semibold text-base sm:text-lg truncate">
                  {activeSectionData?.title}
                </h1>
              </div>
            </>
          ) : (
            <>
              <SubMenuHeader 
                title="Configurações"
                onOpenSubmenu={() => openSubmenu("Configurações")}
              />
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h1 className="font-semibold text-base sm:text-lg">Configurações</h1>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {activeSection ? (
        // Seção ativa - mostra o conteúdo
        <ScrollArea className="h-[calc(100vh-60px)]">
          <div className="p-3 sm:p-4 md:p-6">
            {renderSectionContent()}
          </div>
        </ScrollArea>
      ) : (
        // Lista de seções
        <div className="p-3 sm:p-4 md:p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Selecione uma opção para configurar
          </p>
          
          {/* Grid para desktop, lista para mobile */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONFIG_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
              >
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0",
                  "bg-muted/50 group-hover:bg-primary/10 transition-colors"
                )}>
                  <section.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", section.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base">{section.title}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground truncate">
                    {section.description}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de Notificações
function NotificacoesContent({ 
  showConfirmationMessages, 
  onToggle 
}: { 
  showConfirmationMessages: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="show-confirmations" className="text-sm font-medium">
                Mostrar mensagens de confirmação
              </Label>
              <p className="text-xs text-muted-foreground">
                Exibe notificações como "Bot ativado", "Mensagem enviada", etc.
              </p>
            </div>
            <Switch
              id="show-confirmations"
              checked={showConfirmationMessages}
              onCheckedChange={onToggle}
            />
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground px-1">
        Mensagens de erro sempre serão exibidas, independente desta configuração.
      </p>
    </div>
  );
}

// Componente de Campanhas
function CampanhasContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">Suas Campanhas</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhe o status das suas campanhas
          </p>
        </div>
        <Button size="sm" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats Cards - Horizontal scroll no mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
        <Card className="min-w-[140px] sm:min-w-0 flex-shrink-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total</span>
              <Send className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-xl sm:text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card className="min-w-[140px] sm:min-w-0 flex-shrink-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Alcançados</span>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-xl sm:text-2xl font-bold">1.120</div>
            <p className="text-xs text-muted-foreground">+18% vs anterior</p>
          </CardContent>
        </Card>

        <Card className="min-w-[140px] sm:min-w-0 flex-shrink-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Engajamento</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-xl sm:text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">+5% esta semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <div className="space-y-3">
        {[
          { id: 1, name: "Promoção Black Friday", status: "scheduled", recipients: 1250, sent: 0 },
          { id: 2, name: "Follow-up Abandonos", status: "running", recipients: 450, sent: 320 },
          { id: 3, name: "Pesquisa Satisfação", status: "completed", recipients: 800, sent: 800 },
        ].map((campaign) => (
          <Card key={campaign.id} className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h4 className="font-medium text-sm truncate">{campaign.name}</h4>
                    <Badge 
                      variant={campaign.status === "completed" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {campaign.status === "completed" ? "Concluída" : campaign.status === "running" ? "Enviando" : "Agendada"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Dest: <strong className="text-foreground">{campaign.recipients}</strong></span>
                    <span>Enviadas: <strong className="text-foreground">{campaign.sent}</strong></span>
                    {campaign.sent > 0 && (
                      <span>Progresso: <strong className="text-foreground">
                        {Math.round((campaign.sent / campaign.recipients) * 100)}%
                      </strong></span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
                  Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Componente de Conteúdos
function ConteudosContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">Seus Conteúdos</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Materiais de apoio e documentação
          </p>
        </div>
        <Button size="sm" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar conteúdos..." className="pl-10" />
      </div>

      {/* Content Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { id: 1, titulo: "Política de Trocas", tipo: "faq", tags: ["Vendas", "Pós-venda"], url: null },
          { id: 2, titulo: "Manual do Produto", tipo: "pdf", tags: ["Suporte", "Documentação"], url: "/docs/manual.pdf" },
          { id: 3, titulo: "Script de Atendimento", tipo: "script", tags: ["Treinamento"], url: null },
        ].map((content) => {
          const TypeIcon = content.tipo === "pdf" ? File : content.tipo === "link" ? Link2 : FileText;
          const typeLabel = content.tipo === "pdf" ? "PDF" : content.tipo === "link" ? "Link" : content.tipo === "script" ? "Script" : "FAQ";
          return (
            <Card key={content.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{content.titulo}</h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {typeLabel}
                      </Badge>
                    </div>
                    {content.url ? (
                      <a href={content.url} className="text-xs text-primary hover:underline">
                        Ver documento
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Conteúdo interno</span>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {content.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-3" size="sm">
                  Editar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
