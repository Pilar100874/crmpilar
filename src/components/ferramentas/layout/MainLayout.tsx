import { ReactNode, useMemo, useState, createContext, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  Users,
  FileText,
  Bell,
  Settings,
  Warehouse,
  BoxesIcon,
  MapPin,
  ShoppingCart,
  PackageOpen,
  ClipboardList,
  Lock,
  RefreshCw,
  CalendarClock,
  AlertTriangle,
  PackageCheck,
  Lightbulb,
  PanelLeft,
  PanelLeftClose,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { usePermissions } from "@/hooks/ferramentas/usePermissions";
import { usePendingRenewals } from "@/hooks/ferramentas/usePendingRenewals";
import { usePendingApprovals } from "@/hooks/ferramentas/usePendingApprovals";

interface MainLayoutProps {
  children: ReactNode;
}

type BadgeType = "renewals" | "approvals" | "requests";

interface NavItem {
  icon: LucideIcon;
  label: string;
  /** Rota base usada nas permissões (sem o prefixo /ferramentas). */
  route: string;
  href: string;
  description: string;
  badgeType?: BadgeType;
  adminOnly?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

const sectionsBase: NavSection[] = [
  {
    id: "operacao",
    title: "Operação",
    items: [
      {
        icon: LayoutDashboard,
        label: "Painel",
        route: "/",
        href: "/ferramentas",
        description: "Visão geral de empréstimos e ferramentas",
      },
      {
        icon: ShoppingCart,
        label: "Solicitar Ferramentas",
        route: "/request-tools",
        href: "/ferramentas/request-tools",
        description: "Solicitação de ferramentas pelo colaborador",
      },
      {
        icon: ClipboardList,
        label: "Processar Solicitações",
        route: "/process-requests",
        href: "/ferramentas/process-requests",
        description: "Aprovação e entrega das solicitações",
        badgeType: "requests",
      },
      {
        icon: PackageCheck,
        label: "Devolução",
        route: "/loan/return",
        href: "/ferramentas/loan/return",
        description: "Registro de devolução de ferramentas",
      },
      {
        icon: CalendarClock,
        label: "Prorrogações",
        route: "/loan/renewals",
        href: "/ferramentas/loan/renewals",
        description: "Pedidos de prorrogação de empréstimos",
        badgeType: "renewals",
      },
      {
        icon: RefreshCw,
        label: "Reempréstimo",
        route: "/loan/relend",
        href: "/ferramentas/loan/relend",
        description: "Transferência direta entre colaboradores",
      },
      {
        icon: AlertTriangle,
        label: "Ocorrências",
        route: "/return-issues",
        href: "/ferramentas/return-issues",
        description: "Avarias, perdas e manutenções",
      },
    ],
  },
  {
    id: "cadastros",
    title: "Cadastros",
    items: [
      {
        icon: Wrench,
        label: "Ferramentas",
        route: "/tools",
        href: "/ferramentas/tools",
        description: "Cadastro e status das ferramentas",
      },
      {
        icon: BoxesIcon,
        label: "Kits",
        route: "/kits",
        href: "/ferramentas/kits",
        description: "Agrupamento de ferramentas em kits",
      },
      {
        icon: PackageOpen,
        label: "Insumos",
        route: "/supplies",
        href: "/ferramentas/supplies",
        description: "Estoque de insumos e movimentações",
      },
      {
        icon: Warehouse,
        label: "Almoxarifados",
        route: "/warehouses",
        href: "/ferramentas/warehouses",
        description: "Locais de guarda das ferramentas",
      },
      {
        icon: Users,
        label: "Usuários",
        route: "/users",
        href: "/ferramentas/users",
        description: "Usuários e aprovações do módulo",
        badgeType: "approvals",
      },
    ],
  },
  {
    id: "analises",
    title: "Análises & Configurações",
    items: [
      {
        icon: MapPin,
        label: "Rastreamento",
        route: "/tracking",
        href: "/ferramentas/tracking",
        description: "Localização dos colaboradores em campo",
      },
      {
        icon: Lightbulb,
        label: "Assistente IA",
        route: "/tool-assistant",
        href: "/ferramentas/tool-assistant",
        description: "Identificação de ferramentas por foto",
      },
      {
        icon: FileText,
        label: "Relatórios",
        route: "/reports",
        href: "/ferramentas/reports",
        description: "Relatórios de empréstimos e ocorrências",
      },
      {
        icon: Bell,
        label: "Notificações",
        route: "/notifications",
        href: "/ferramentas/notifications",
        description: "Avisos e alertas do módulo",
      },
      {
        icon: Lock,
        label: "Permissões",
        route: "/permissions",
        href: "/ferramentas/permissions",
        description: "Permissões de acesso por perfil",
        adminOnly: true,
      },
      {
        icon: Settings,
        label: "Configurações",
        route: "/settings",
        href: "/ferramentas/settings",
        description: "Preferências gerais do módulo",
      },
    ],
  },
];

const MainLayoutContext = createContext(false);

/** Evita layout duplicado quando páginas internas também usam <MainLayout>. */
export function MainLayout({ children }: MainLayoutProps) {
  const nested = useContext(MainLayoutContext);
  if (nested) return <>{children}</>;
  return <MainLayoutInner>{children}</MainLayoutInner>;
}

function MainLayoutInner({ children }: MainLayoutProps) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { canAccess } = usePermissions();
  const { pendingCount: renewalCount, hasPending: hasRenewals } = usePendingRenewals();
  const { pendingCount: approvalCount, hasPending: hasApprovals } = usePendingApprovals();

  const sections = useMemo(
    () =>
      sectionsBase
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => {
            if (i.adminOnly) return isAdmin;
            if (i.route === "/") return true;
            return isAdmin || canAccess(i.route);
          }),
        }))
        .filter((s) => s.items.length > 0),
    [isAdmin, canAccess],
  );

  const allItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  const currentItem = useMemo(() => {
    const exact = allItems.find((i) => i.href === location.pathname);
    if (exact) return exact;
    const partial = [...allItems]
      .filter((i) => i.href !== "/ferramentas" && location.pathname.startsWith(i.href))
      .sort((a, b) => b.href.length - a.href.length)[0];
    return partial || allItems[0];
  }, [allItems, location.pathname]);

  const currentSection = useMemo(
    () => sections.find((s) => s.items.some((i) => i.href === currentItem?.href)),
    [sections, currentItem],
  );

  const badgeFor = (item: NavItem) => {
    if (item.badgeType === "renewals" && hasRenewals) return renewalCount;
    if ((item.badgeType === "approvals" || item.badgeType === "requests") && hasApprovals)
      return approvalCount;
    return null;
  };

  const CurrentIcon = currentItem?.icon || Wrench;

  return (
    <MainLayoutContext.Provider value={true}>
      <div className="h-full flex flex-col bg-muted/20">
        {/* Header com gradiente (padrão Listas) */}
        <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                Controle de Ferramentas
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm truncate">
                Empréstimos, kits, insumos e almoxarifados
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Mobile & Tablet: Select agrupado */}
          <div className="lg:hidden border-b bg-card/60 backdrop-blur p-3 sticky top-0 z-10">
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
              isMenuCollapsed ? "lg:w-14" : "lg:w-64",
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
                {isMenuCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </div>

            <TooltipProvider delayDuration={0}>
              <nav className="flex-1 p-2 space-y-4">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-1">
                    {!isMenuCollapsed && (
                      <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {section.title}
                      </div>
                    )}
                    {isMenuCollapsed && (
                      <div className="mx-2 my-1 border-t border-border/60" aria-hidden />
                    )}
                    {section.items.map((item) => {
                      const active = currentItem?.href === item.href;
                      const badge = badgeFor(item);
                      const link = (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            isMenuCollapsed && "justify-center px-0",
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!isMenuCollapsed && <span className="truncate flex-1">{item.label}</span>}
                          {!isMenuCollapsed && badge != null && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
                              {badge}
                            </Badge>
                          )}
                        </Link>
                      );
                      return isMenuCollapsed ? (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      );
                    })}
                  </div>
                ))}
              </nav>
            </TooltipProvider>
          </aside>

          {/* Conteúdo */}
          <main className="flex-1 overflow-y-auto" style={{ overflowX: "clip" }}>
            <div className="p-0 sm:p-4 lg:p-6 space-y-4">
              {currentItem && (
                <Card className="rounded-none border-x-0 sm:rounded-lg sm:border-x">
                  <CardHeader className="py-3 sm:py-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span>{currentSection?.title}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span className="text-foreground/80">{currentItem.label}</span>
                    </div>
                    <CardTitle className="text-xl sm:text-[26px] font-bold tracking-tight flex items-center gap-2">
                      <CurrentIcon className="h-5 w-5 text-primary" />
                      {currentItem.label}
                    </CardTitle>
                    <CardDescription>{currentItem.description}</CardDescription>
                  </CardHeader>
                </Card>
              )}
              <div className="px-3 sm:px-0">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </MainLayoutContext.Provider>
  );
}
