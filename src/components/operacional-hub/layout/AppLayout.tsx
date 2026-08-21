import { ReactNode, useState, useMemo, createContext, useContext } from "react";
import { OfflineIndicator } from "@/components/operacional-hub/OfflineIndicator";
import { useNavBadges } from "@/hooks/operacional-hub/useNavBadges";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  PanelLeft,
  PanelLeftClose,
  Building2,
  Clock,
  Briefcase,
  FileText,
  Bell,
  LogOut,
  History,
  Tv,
  AlertOctagon,
  Camera,
  CloudRain,
  TrendingUp,
  UserX,
  CalendarClock,
  BarChart3,
  Repeat,
  Wrench,
  ShieldCheck,
  Timer,
  Store,
  Shield,
  LucideIcon,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { EstablishmentSelector } from "./EstablishmentSelector";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { useAccessLevel } from "@/hooks/operacional-hub/useAccessLevel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description?: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

// Seções (admin/gestor) — mesmo padrão de agrupamento do hub de Listas
const adminSections: NavSection[] = [
  {
    id: "operacao",
    title: "Operação",
    items: [
      { icon: LayoutDashboard, label: "Painel", href: "/operacional", description: "Visão geral e tarefas do dia" },
      { icon: UserX, label: "Ausências", href: "/operacional/absences", description: "Gestão de presença e ausências da equipe" },
      { icon: Camera, label: "Irregularidades", href: "/operacional/irregularities", description: "Registro e acompanhamento de irregularidades" },
      { icon: CloudRain, label: "Condições", href: "/operacional/conditions", description: "Condições operacionais que afetam as tarefas" },
      { icon: AlertOctagon, label: "Incidentes", href: "/operacional/incidents", description: "Ocorrências e incidentes registrados" },
      { icon: ShieldCheck, label: "Aprovações", href: "/operacional/approvals", description: "Aprovações pendentes de execuções" },
    ],
  },
  {
    id: "analises",
    title: "Análises",
    items: [
      { icon: TrendingUp, label: "Produtividade", href: "/operacional/productivity", description: "Indicadores de produtividade por equipe" },
      { icon: CalendarClock, label: "Simulação", href: "/operacional/schedule-simulation", description: "Simulação de jornada e escala" },
      { icon: BarChart3, label: "Previsto x Real", href: "/operacional/planned-vs-actual", description: "Comparativo entre previsto e realizado" },
      { icon: Timer, label: "Ociosidade", href: "/operacional/idle-time", description: "Análise de ociosidade das equipes" },
      { icon: History, label: "Histórico", href: "/operacional/history", description: "Histórico e auditoria das operações" },
    ],
  },
  {
    id: "cadastros",
    title: "Cadastros",
    items: [
      { icon: FileText, label: "Templates", href: "/operacional/templates", description: "Templates de tarefas operacionais" },
      { icon: Users, label: "Usuários", href: "/operacional/users", description: "Usuários e permissões do hub" },
      { icon: Building2, label: "Setores", href: "/operacional/sectors", description: "Setores da operação" },
      { icon: Briefcase, label: "Funções", href: "/operacional/functions", description: "Funções exercidas pelos colaboradores" },
      { icon: Clock, label: "Turnos", href: "/operacional/shifts", description: "Turnos e horários de trabalho" },
      { icon: Package, label: "Materiais", href: "/operacional/materials", description: "Materiais e controle de estoque" },
      { icon: Wrench, label: "Ferramentas", href: "/operacional/tools", description: "Ferramentas e status de manutenção" },
      { icon: Repeat, label: "Frequências", href: "/operacional/frequencies", description: "Frequências de execução das tarefas" },
    ],
  },
  {
    id: "exibicao",
    title: "Exibição & Configurações",
    items: [
      { icon: Tv, label: "Modo TV", href: "/operacional/tv", description: "Painel de controle para exibição em TV" },
      { icon: Tv, label: "TV Tarefas", href: "/operacional/tv-tasks", description: "Acompanhamento de tarefas em TV" },
      { icon: Bell, label: "Alertas", href: "/operacional/alerts", description: "Alertas operacionais configurados" },
      { icon: Shield, label: "Níveis de Acesso", href: "/operacional/access-levels", description: "Níveis de acesso e menus permitidos" },
      { icon: Settings, label: "Configurações", href: "/operacional/settings", description: "Configurações gerais do módulo" },
    ],
  },
];

const superAdminSection: NavSection = {
  id: "super",
  title: "Administração",
  items: [{ icon: Store, label: "Estabelecimentos", href: "/operacional/establishments", description: "Estabelecimentos do sistema" }],
};

const workerSection: NavSection = {
  id: "minhas",
  title: "Minhas Atividades",
  items: [
    { icon: LayoutDashboard, label: "Minhas Tarefas", href: "/operacional", description: "Visão geral e tarefas do dia" },
    { icon: Camera, label: "Irregularidades", href: "/operacional/irregularities", description: "Registro e acompanhamento de irregularidades" },
  ],
};

const AppLayoutContext = createContext(false);

/** Evita layout duplicado quando páginas internas também usam <AppLayout>. */
export function AppLayout({ children }: AppLayoutProps) {
  const nested = useContext(AppLayoutContext);
  if (nested) return <>{children}</>;
  return <AppLayoutInner>{children}</AppLayoutInner>;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminOrManager, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { establishmentName } = useEstablishment();
  const badges = useNavBadges();
  const { accessLevel, loading: accessLoading } = useAccessLevel();

  const sections: NavSection[] = useMemo(() => {
    if (roleLoading || accessLoading) return [];

    const base = isSuperAdmin ? [superAdminSection, ...adminSections] : adminSections;

    if (accessLevel && accessLevel.allowed_menus && accessLevel.allowed_menus.length > 0) {
      return base
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => accessLevel.allowed_menus.includes(i.href)),
        }))
        .filter((s) => s.items.length > 0);
    }

    if (!isAdminOrManager) return [workerSection];
    return base;
  }, [isAdminOrManager, isSuperAdmin, roleLoading, accessLevel, accessLoading]);

  const allItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  const currentItem = useMemo(() => {
    const exact = allItems.find((i) => i.href === location.pathname);
    if (exact) return exact;
    const partial = [...allItems]
      .filter((i) => i.href !== "/operacional" && location.pathname.startsWith(i.href))
      .sort((a, b) => b.href.length - a.href.length)[0];
    return partial || allItems[0];
  }, [allItems, location.pathname]);

  const currentSection = useMemo(
    () => sections.find((s) => s.items.some((i) => i.href === currentItem?.href)),
    [sections, currentItem]
  );

  const badgeMap: Record<string, number> = useMemo(
    () => ({
      "/operacional/approvals": badges.pendingApprovals,
      "/operacional/tools": badges.toolsNeedRepair,
      "/operacional/materials": badges.lowStockMaterials,
    }),
    [badges]
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/operacional/auth");
  };

  const CurrentIcon = currentItem?.icon || LayoutDashboard;

  return (
    <div className="h-full flex flex-col bg-muted/20">
      <OfflineIndicator />

      {/* Header com gradiente (padrão Listas) */}
      <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">Operacional Hub</h1>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">
              {establishmentName || "Controle operacional, tarefas e equipes"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Mobile & Tablet: Select agrupado */}
        <div className="lg:hidden border-b bg-card/60 backdrop-blur p-3 sticky top-0 z-10 space-y-2">
          <EstablishmentSelector />
          <Select value={currentItem?.href} onValueChange={(v) => navigate(v)}>
            <SelectTrigger className="w-full bg-background h-11">
              <SelectValue>
                <div className="flex items-center gap-2 min-w-0">
                  <CurrentIcon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{currentItem?.label}</span>
                  {currentSection && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:inline">
                      {currentSection.title}
                    </span>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-[70vh]">
              {sections.map((section) => (
                <SelectGroup key={section.id}>
                  <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </SelectLabel>
                  {section.items.map((item) => (
                    <SelectItem key={item.href} value={item.href}>
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Sidebar com seções */}
        <aside
          className={cn(
            "hub-menu hidden lg:flex lg:flex-col lg:overflow-y-auto lg:shrink-0 border-r bg-card transition-all duration-300",
            isMenuCollapsed ? "lg:w-14" : "lg:w-64"
          )}
        >
          <div className="flex items-center justify-end p-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
              className="h-8 w-8"
              title={isMenuCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isMenuCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          {!isMenuCollapsed && (
            <div className="p-2 border-b">
              <EstablishmentSelector />
            </div>
          )}

          <TooltipProvider delayDuration={0}>
            <nav className="flex-1 p-2 space-y-4">
              {sections.map((section) => (
                <div key={section.id} className="space-y-1">
                  {!isMenuCollapsed && (
                    <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {section.title}
                    </div>
                  )}
                  {isMenuCollapsed && <div className="mx-2 my-1 border-t border-border/60" aria-hidden />}
                  {section.items.map((item) => {
                    const isActive = currentItem?.href === item.href;
                    const badgeCount = badgeMap[item.href] || 0;
                    const link = (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          isMenuCollapsed && "justify-center px-0"
                        )}
                      >
                        {isActive && !isMenuCollapsed && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
                        )}
                        <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "opacity-70")} />
                        {!isMenuCollapsed && <span className="truncate flex-1">{item.label}</span>}
                        {badgeCount > 0 && !isMenuCollapsed && (
                          <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </Link>
                    );
                    if (isMenuCollapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return link;
                  })}
                </div>
              ))}
            </nav>
          </TooltipProvider>

          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className={cn(
                "w-full gap-3 text-muted-foreground hover:text-foreground",
                isMenuCollapsed ? "justify-center px-0" : "justify-start"
              )}
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              {!isMenuCollapsed && "Sair"}
            </Button>
          </div>
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-0 lg:p-4 xl:p-6">
          <div className="p-2 sm:p-3 lg:p-0">
          <Card className="shadow-sm border-border/60 border-x-0 rounded-none sm:border-x sm:rounded-lg">
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b bg-muted/30">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CurrentIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  {currentSection && (
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      <span className="truncate">{currentSection.title}</span>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="truncate text-primary/80">{currentItem?.label}</span>
                    </div>
                  )}
                  <CardTitle className="text-base sm:text-lg leading-tight truncate">
                    {currentItem?.label}
                  </CardTitle>
                  {currentItem?.description && (
                    <CardDescription className="text-xs sm:text-sm mt-0.5 line-clamp-2">
                      {currentItem.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 lg:p-6">
              <AppLayoutContext.Provider value={true}>{children}</AppLayoutContext.Provider>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
