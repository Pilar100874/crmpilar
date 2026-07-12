import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Store, Megaphone, FileText, Plus, Send, Users, TrendingUp, 
  Search, Link2, File, Bell, ShieldCheck, ChevronRight, ArrowLeft,
  Settings, Check, Mail, Zap, Paintbrush, LifeBuoy
} from "lucide-react";
import MacrosPage from "@/pages/Macros";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { WhatsAppConfigCRUD } from "@/components/config/WhatsAppConfigCRUD";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
}

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    id: "notificacoes-sistema",
    title: "Notificações do Sistema",
    description: "Configure mensagens de confirmação e alertas",
    icon: Bell,
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    id: "cadastro-estabelecimentos",
    title: "Estabelecimento",
    description: "Gerencie seus estabelecimentos e configurações",
    icon: Store,
    bgColor: "bg-green-500/10",
    iconColor: "text-green-500",
  },
  {
    id: "recuperar-senha",
    title: "Recuperação de Senha",
    description: "Configure envio de códigos via WhatsApp",
    icon: ShieldCheck,
    bgColor: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    id: "email-config",
    title: "Email Config",
    description: "Configure servidor externo e OAuth",
    icon: Mail,
    bgColor: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
  },
  {
    id: "visual-sistema",
    title: "Visual do Sistema",
    description: "Splash screen, vídeo de fundo e aparência",
    icon: Paintbrush,
    bgColor: "bg-pink-500/10",
    iconColor: "text-pink-500",
  },
];

export default function Config() {
  const navigate = useNavigate();
  const { openSubmenu } = useLayout();
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
    if (sectionId === "email-config") {
      navigate("/email-config");
      return;
    }
    if (sectionId === "visual-sistema") {
      navigate("/config/visual");
      return;
    }
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
      case "conteudos":
        return <ConteudosContent />;
      default:
        return null;
    }
  };

  // Se há uma seção ativa, mostra o conteúdo dela
  if (activeSection && activeSectionData) {
    return (
      <div className="min-h-full bg-background">
        {/* Header padrão do sistema */}
        <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", activeSectionData.bgColor)}>
              <activeSectionData.icon className={cn("h-5 w-5", activeSectionData.iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-2xl">
                {activeSectionData.title}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                {activeSectionData.description}
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo da seção */}
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          {renderSectionContent()}
        </div>
      </div>
    );
  }

  // Menu principal
  return (
    <div className="min-h-full bg-background">
      {/* Header padrão do sistema */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="hidden">
            <SubMenuHeader
              title="Configurações"
              onOpenSubmenu={() => openSubmenu("Configurações")}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
                Configurações
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Gerencie preferências, integrações e a aparência da plataforma
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONFIG_SECTIONS.map((section) => (
            <Card
              key={section.id}
              onClick={() => handleSectionClick(section.id)}
              className="group relative cursor-pointer overflow-hidden border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/50 transition-transform group-hover:scale-110",
                    section.bgColor
                  )}>
                    <section.icon className={cn("h-5 w-5", section.iconColor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold sm:text-base">
                      {section.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Componente de Notificações
// ============================================
function NotificacoesContent({ 
  showConfirmationMessages, 
  onToggle 
}: { 
  showConfirmationMessages: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Card principal */}
      <Card>
        <CardContent className="p-0">
          <div 
            className="flex items-center justify-between gap-4 p-4 cursor-pointer"
            onClick={() => onToggle(!showConfirmationMessages)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                showConfirmationMessages ? "bg-green-500/10" : "bg-muted"
              )}>
                {showConfirmationMessages ? (
                  <Check className="w-6 h-6 text-green-500" />
                ) : (
                  <Bell className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-sm">Mensagens de confirmação</h4>
                <p className="text-xs text-muted-foreground">
                  "Bot ativado", "Mensagem enviada", etc.
                </p>
              </div>
            </div>
            <Switch
              checked={showConfirmationMessages}
              onCheckedChange={onToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            ℹ️ Mensagens de erro sempre serão exibidas, independente desta configuração.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Componente de Campanhas
// ============================================
function CampanhasContent() {
  const campaigns = [
    { id: 1, name: "Promoção Black Friday", status: "scheduled", recipients: 1250, sent: 0 },
    { id: 2, name: "Follow-up Abandonos", status: "running", recipients: 450, sent: 320 },
    { id: 3, name: "Pesquisa Satisfação", status: "completed", recipients: 800, sent: 800 },
  ];

  const stats = [
    { label: "Total", value: "3", subtitle: "Este mês", icon: Send, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Alcançados", value: "1.120", subtitle: "+18%", icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Engajamento", value: "87%", subtitle: "+5%", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-4">
      {/* Botão nova campanha */}
      <Button className="w-full" size="lg">
        <Plus className="w-5 h-5 mr-2" />
        Nova Campanha
      </Button>

      {/* Stats em cards */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <div className={cn("w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de campanhas */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground px-1">CAMPANHAS</h3>
        
        {campaigns.map((campaign) => {
          const progress = campaign.recipients > 0 ? Math.round((campaign.sent / campaign.recipients) * 100) : 0;
          const statusConfig = {
            completed: { label: "Concluída", color: "bg-green-500" },
            running: { label: "Enviando", color: "bg-blue-500" },
            scheduled: { label: "Agendada", color: "bg-orange-500" },
          }[campaign.status] || { label: campaign.status, color: "bg-gray-500" };

          return (
            <Card key={campaign.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Progress bar no topo */}
                {campaign.status === "running" && (
                  <div className="h-1 bg-muted">
                    <div 
                      className="h-full bg-blue-500 transition-all" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h4 className="font-medium text-sm flex-1">{campaign.name}</h4>
                    <Badge 
                      className={cn("text-xs text-white shrink-0", statusConfig.color)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  {/* Stats da campanha */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="text-sm font-semibold">{campaign.recipients}</div>
                      <div className="text-xs text-muted-foreground">Destino</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="text-sm font-semibold">{campaign.sent}</div>
                      <div className="text-xs text-muted-foreground">Enviadas</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="text-sm font-semibold">{progress}%</div>
                      <div className="text-xs text-muted-foreground">Progresso</div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full mt-3" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Componente de Conteúdos
// ============================================
function ConteudosContent() {
  const contents = [
    { id: 1, titulo: "Política de Trocas", tipo: "faq", tags: ["Vendas", "Pós-venda"], url: null },
    { id: 2, titulo: "Manual do Produto", tipo: "pdf", tags: ["Suporte", "Documentação"], url: "/docs/manual.pdf" },
    { id: 3, titulo: "Script de Atendimento", tipo: "script", tags: ["Treinamento"], url: null },
  ];

  const getTypeConfig = (tipo: string) => {
    switch (tipo) {
      case "pdf": return { icon: File, label: "PDF", color: "text-red-500", bg: "bg-red-500/10" };
      case "link": return { icon: Link2, label: "Link", color: "text-blue-500", bg: "bg-blue-500/10" };
      case "script": return { icon: FileText, label: "Script", color: "text-purple-500", bg: "bg-purple-500/10" };
      default: return { icon: FileText, label: "FAQ", color: "text-cyan-500", bg: "bg-cyan-500/10" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Botão novo conteúdo */}
      <Button className="w-full" size="lg">
        <Plus className="w-5 h-5 mr-2" />
        Novo Conteúdo
      </Button>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar conteúdos..." className="pl-10" />
      </div>

      {/* Lista de conteúdos */}
      <div className="space-y-3">
        {contents.map((content) => {
          const typeConfig = getTypeConfig(content.tipo);
          const TypeIcon = typeConfig.icon;

          return (
            <Card key={content.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start gap-3 p-4">
                  {/* Ícone do tipo */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    typeConfig.bg
                  )}>
                    <TypeIcon className={cn("w-6 h-6", typeConfig.color)} />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{content.titulo}</h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {typeConfig.label}
                      </Badge>
                    </div>
                    
                    {content.url ? (
                      <a href={content.url} className="text-xs text-primary hover:underline">
                        Ver documento →
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Conteúdo interno</span>
                    )}
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {content.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Botão editar */}
                <div className="px-4 pb-4">
                  <Button variant="outline" className="w-full" size="sm">
                    Editar Conteúdo
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
