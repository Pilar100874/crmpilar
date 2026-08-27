import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Store, Megaphone, FileText, Plus, Send, Users, TrendingUp, 
  Search, Link2, File, Bell, ShieldCheck, ChevronRight, ArrowLeft,
  Settings, Check, Mail, Zap, Paintbrush, LifeBuoy, PanelLeft, PanelLeftClose
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MacrosPage from "@/pages/Macros";
import { EstabelecimentosCRUD } from "@/components/config/EstabelecimentosCRUD";
import { WhatsAppConfigCRUD } from "@/components/config/WhatsAppConfigCRUD";
import { UnidadesCRUD } from "@/components/config/UnidadesCRUD";
import { GruposAcessoCRUD } from "@/components/config/GruposAcessoCRUD";
import { UsuariosCRUD } from "@/components/config/UsuariosCRUD";
import { SegmentosCRUD } from "@/components/config/SegmentosCRUD";
import { Building2, FolderTree, UserCog, Tag } from "lucide-react";
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

// Sub-itens do menu Estabelecimento (empresa)
const EMPRESA_SUBMENUS: ConfigSection[] = [
  {
    id: "cadastro-unidades",
    title: "Unidades",
    description: "Filiais e departamentos",
    icon: Building2,
    bgColor: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  {
    id: "grupos-acesso",
    title: "Grupos de Acesso",
    description: "Perfis de permissão",
    icon: FolderTree,
    bgColor: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    id: "cadastro-usuarios",
    title: "Usuários",
    description: "Gerenciar usuários",
    icon: UserCog,
    bgColor: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    id: "segmentos",
    title: "Segmentos",
    description: "Agrupamento de clientes",
    icon: Tag,
    bgColor: "bg-teal-500/10",
    iconColor: "text-teal-500",
  },
];

export default function Config() {
  const navigate = useNavigate();
  const { openSubmenu } = useLayout();
  const [searchParams, setSearchParams] = useSearchParams();
  const secaoParam = searchParams.get('secao');
  
  const [activeSection, setActiveSection] = useState<string | null>(secaoParam ?? CONFIG_SECTIONS[0].id);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [estabelecimentos, setEstabelecimentos] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    supabase
      .from("estabelecimentos")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setEstabelecimentos(((data ?? []) as any[]).map((e) => ({ id: e.id, nome: e.nome }))));
  }, []);
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
    setActiveSection(CONFIG_SECTIONS[0].id);
    setSearchParams({ secao: CONFIG_SECTIONS[0].id });
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

  const activeSectionData =
    CONFIG_SECTIONS.find(s => s.id === activeSection) ??
    EMPRESA_SUBMENUS.find(s => s.id === activeSection);

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
      case "cadastro-unidades":
        return <UnidadesCRUD />;
      case "grupos-acesso":
        return <GruposAcessoCRUD />;
      case "cadastro-usuarios":
        return <UsuariosCRUD estabelecimentoId={searchParams.get("estab") ?? undefined} />;
      case "segmentos":
        return <SegmentosCRUD />;

      default:
        return null;
    }
  };

  const renderMenuButton = (section: ConfigSection) => {
    const active = activeSection === section.id;
    const button = (
      <button
        key={section.id}
        onClick={() => handleSectionClick(section.id)}
        className={cn(
          "hub-menu-item flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-muted-foreground",
          active && "is-active",
          isMenuCollapsed && "justify-center"
        )}
      >
        <section.icon className={cn("h-4 w-4 shrink-0", active ? "" : "opacity-70")} />
        {!isMenuCollapsed && <span className="truncate text-sm">{section.title}</span>}
      </button>
    );
    if (isMenuCollapsed) {
      return (
        <Tooltip key={section.id}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{section.title}</TooltipContent>
        </Tooltip>
      );
    }
    if (section.id === "cadastro-estabelecimentos") {
      const estabSel = searchParams.get("estab");
      const isEstabSection = activeSection === "cadastro-estabelecimentos";
      return (
        <div key={section.id} className="space-y-0.5">
          {button}
          <div className="ml-7 space-y-0.5 border-l border-border/60 pl-2">
            <button
              onClick={() => { setActiveSection(section.id); setSearchParams({ secao: section.id }); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60",
                isEstabSection && !estabSel && "text-foreground bg-muted/60 font-medium"
              )}
            >
              <Plus className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">Cadastro de Estabelecimento</span>
            </button>
            {estabelecimentos.map((e) => {
              const expanded = estabSel === e.id;
              return (
                <div key={e.id} className="space-y-0.5">
                  <button
                    onClick={() => { setActiveSection(section.id); setSearchParams({ secao: section.id, estab: e.id }); }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      isEstabSection && expanded && "text-foreground bg-muted/60 font-medium"
                    )}
                  >
                    <Store className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="truncate">{e.nome}</span>
                  </button>
                  {expanded && (
                    <div className="ml-4 space-y-0.5 border-l border-border/40 pl-2">
                      {EMPRESA_SUBMENUS.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => { setActiveSection(sub.id); setSearchParams({ secao: sub.id, estab: e.id }); }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60",
                            activeSection === sub.id && "text-foreground bg-muted/60 font-medium"
                          )}
                        >
                          <sub.icon className="h-3 w-3 shrink-0 opacity-70" />
                          <span className="truncate">{sub.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return button;
  };

  return (
    <div className="h-full min-h-screen flex flex-col bg-background text-foreground">
      {/* Header padrão do sistema */}
      <header className="sticky top-0 z-40 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur">
        <div className="flex items-center gap-3 px-3 py-4 sm:px-6">
          <div className="hidden">
            <SubMenuHeader
              title="Configurações"
              onOpenSubmenu={() => openSubmenu("Configurações")}
            />
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
            {activeSectionData ? (
              <activeSectionData.icon className="h-5 w-5" />
            ) : (
              <Settings className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              {activeSectionData ? activeSectionData.title : "Configurações"}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              {activeSectionData
                ? activeSectionData.description
                : "Gerencie preferências, integrações e a aparência da plataforma"}
            </p>
          </div>
        </div>
      </header>


      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col lg:flex-row">
          {/* Mobile/Tablet: seletor */}
          <div className="border-b bg-muted/30 p-3 lg:hidden">
            <Select
              value={
                activeSection
                  ? searchParams.get("estab") && EMPRESA_SUBMENUS.some((s) => s.id === activeSection)
                    ? `${activeSection}|${searchParams.get("estab")}`
                    : activeSection
                  : "__home__"
              }
              onValueChange={(v) => {
                if (v === "__home__") return handleBack();
                const [id, estab] = v.split("|");
                if (estab) {
                  setActiveSection(id);
                  setSearchParams({ secao: id, estab });
                  return;
                }
                handleSectionClick(id);
              }}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="__home__">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Visão geral</span>
                  </div>
                </SelectItem>
                {CONFIG_SECTIONS.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4" />
                      <span>{section.title}</span>
                    </div>
                  </SelectItem>
                ))}
                {estabelecimentos.flatMap((e) => [
                  <SelectItem key={`estab-${e.id}`} value={`cadastro-estabelecimentos|${e.id}`}>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>{e.nome}</span>
                    </div>
                  </SelectItem>,
                  ...EMPRESA_SUBMENUS.map((section) => (
                    <SelectItem key={`${e.id}-${section.id}`} value={`${section.id}|${e.id}`}>
                      <div className="flex items-center gap-2 pl-3">
                        <section.icon className="h-4 w-4" />
                        <span>{e.nome} → {section.title}</span>
                      </div>
                    </SelectItem>
                  )),
                ])}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: menu lateral */}
          <div
            className={cn(
              "hub-menu hidden transition-all duration-300 lg:flex lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-y-auto lg:border-r lg:p-3",
              isMenuCollapsed ? "lg:w-16" : "lg:w-64"
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
              className="mb-2 self-end"
            >
              {isMenuCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <TooltipProvider delayDuration={0}>
              {CONFIG_SECTIONS.map(renderMenuButton)}
            </TooltipProvider>
          </div>

          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
            <div className="mx-auto w-full max-w-6xl rounded-xl border bg-card p-4 shadow-sm sm:p-6">
              {renderSectionContent()}
            </div>
          </main>

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
