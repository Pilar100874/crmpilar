import { ReactNode, useState, useMemo } from "react";
import { OfflineIndicator } from "@/components/operacional-hub/OfflineIndicator";
import { useNavBadges } from "@/hooks/operacional-hub/useNavBadges";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Package, 
  Settings, 
  Menu,
  X,
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
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EstablishmentSelector } from "./EstablishmentSelector";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { useAccessLevel } from "@/hooks/operacional-hub/useAccessLevel";

interface AppLayoutProps {
  children: ReactNode;
}

// Items for admin/manager
const adminNavItems = [
  { icon: LayoutDashboard, label: "Painel", href: "/" },
  { icon: UserX, label: "Ausências", href: "/absences" },
  { icon: Camera, label: "Irregularidades", href: "/irregularities" },
  { icon: CloudRain, label: "Condições", href: "/conditions" },
  { icon: TrendingUp, label: "Produtividade", href: "/productivity" },
  { icon: CalendarClock, label: "Simulação", href: "/schedule-simulation" },
  { icon: BarChart3, label: "Previsto x Real", href: "/planned-vs-actual" },
  { icon: Timer, label: "Ociosidade", href: "/idle-time" },
  { icon: FileText, label: "Templates", href: "/templates" },
  { icon: ShieldCheck, label: "Aprovações", href: "/approvals" },
  { icon: Users, label: "Usuários", href: "/users" },
  { icon: Building2, label: "Setores", href: "/sectors" },
  { icon: Briefcase, label: "Funções", href: "/functions" },
  { icon: Clock, label: "Turnos", href: "/shifts" },
  { icon: Package, label: "Materiais", href: "/materials" },
  { icon: Wrench, label: "Ferramentas", href: "/tools" },
  { icon: Repeat, label: "Frequências", href: "/frequencies" },
  { icon: AlertOctagon, label: "Incidentes", href: "/incidents" },
  { icon: Bell, label: "Alertas", href: "/alerts" },
  { icon: History, label: "Histórico", href: "/history" },
  { icon: Tv, label: "Modo TV", href: "/tv" },
  { icon: Tv, label: "TV Tarefas", href: "/tv-tasks" },
  { icon: Shield, label: "Níveis de Acesso", href: "/access-levels" },
  { icon: Settings, label: "Configurações", href: "/settings" },
];

// Super admin exclusive items
const superAdminNavItems = [
  { icon: Store, label: "Estabelecimentos", href: "/establishments" },
];

// Simplified items for worker
const workerNavItems = [
  { icon: LayoutDashboard, label: "Minhas Tarefas", href: "/" },
  { icon: Camera, label: "Irregularidades", href: "/irregularities" },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminOrManager, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { establishmentName } = useEstablishment();
  const badges = useNavBadges();
  const { accessLevel, loading: accessLoading } = useAccessLevel();

  const navItems = useMemo(() => {
    if (roleLoading || accessLoading) return []; // Wait for role and access level to load

    // If user has an access level assigned, filter menus by allowed_menus
    if (accessLevel && accessLevel.allowed_menus && accessLevel.allowed_menus.length > 0) {
      const allItems = isSuperAdmin
        ? [...superAdminNavItems, ...adminNavItems]
        : adminNavItems;
      return allItems.filter((item) => accessLevel.allowed_menus.includes(item.href));
    }

    // Fallback to role-based menu if no access level
    if (!isAdminOrManager) return workerNavItems;
    if (isSuperAdmin) return [...superAdminNavItems, ...adminNavItems];
    return adminNavItems;
  }, [isAdminOrManager, isSuperAdmin, roleLoading, accessLevel, accessLoading]);

  const badgeMap: Record<string, number> = useMemo(() => ({
    "/approvals": badges.pendingApprovals,
    "/tools": badges.toolsNeedRepair,
    "/materials": badges.lowStockMaterials,
  }), [badges]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-primary flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors text-primary-foreground"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold text-primary-foreground">Pilar</h1>
        <div className="w-10" />
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-sidebar transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <img src="/icon-192.png" alt="Pilar" className="h-10 w-10 rounded-xl" />
              <div>
                <span className="font-bold text-sidebar-foreground text-lg">Pilar</span>
                <p className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">
                  {establishmentName || (isAdminOrManager ? "Controle Operacional" : "Colaborador")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-sidebar-accent rounded-lg text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Establishment Selector for super_admin */}
          <div className="pt-4">
            <EstablishmentSelector />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const badgeCount = badgeMap[item.href] || 0;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground py-3"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-72 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
