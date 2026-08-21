import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { usePermissions } from "@/hooks/ferramentas/usePermissions";
import { usePendingRenewals } from "@/hooks/ferramentas/usePendingRenewals";
import { usePendingApprovals } from "@/hooks/ferramentas/usePendingApprovals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Wrench,
  Users,
  FileText,
  Bell,
  Settings,
  LogOut,
  Warehouse,
  BoxesIcon,
  MapPin,
  Menu,
  PackageCheck,
  ShoppingCart,
  ClipboardList,
  Lock,
  RefreshCw,
  CalendarClock,
  AlertTriangle,
  Lightbulb,
  Building2,
  PackageOpen,
} from "lucide-react";
import logoImage from "@/assets/logo.png";

type BadgeType = "renewals" | "approvals" | "requests";

const navigation: { name: string; href: string; icon: any; badgeType?: BadgeType; superAdminOnly?: boolean }[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Solicitar Ferramentas", href: "/request-tools", icon: ShoppingCart },
  { name: "Processar Solicitações", href: "/process-requests", icon: ClipboardList, badgeType: "requests" },
  { name: "Devolução", href: "/loan/return", icon: PackageCheck },
  { name: "Prorrogações", href: "/loan/renewals", icon: CalendarClock, badgeType: "renewals" },
  { name: "Reempréstimo", href: "/loan/relend", icon: RefreshCw },
  { name: "Ocorrências", href: "/return-issues", icon: AlertTriangle },
  { name: "Assistente IA", href: "/tool-assistant", icon: Lightbulb },
  { name: "Ferramentas", href: "/tools", icon: Wrench },
  { name: "Kits", href: "/kits", icon: BoxesIcon },
  { name: "Insumos", href: "/supplies", icon: PackageOpen },
  { name: "Rastreamento", href: "/tracking", icon: MapPin },
  { name: "Almoxarifados", href: "/warehouses", icon: Warehouse },
  { name: "Usuários", href: "/users", icon: Users, badgeType: "approvals" },
  { name: "Relatórios", href: "/reports", icon: FileText },
  { name: "Notificações", href: "/notifications", icon: Bell },
  { name: "Permissões", href: "/permissions", icon: Lock },
  { name: "Empresas", href: "/companies", icon: Building2, superAdminOnly: true },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { profile, role, signOut, isAdmin, isSuperAdmin, company } = useAuth();
  const { canAccess } = usePermissions();
  const { pendingCount: renewalCount, hasPending: hasRenewals } = usePendingRenewals();
  const { pendingCount: approvalCount, hasPending: hasApprovals } = usePendingApprovals();

  const filteredNavigation = navigation.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.href === "/") return true;
    if (item.href === "/permissions") return isAdmin;
    return canAccess(item.href);
  });

  const getBadgeInfo = (badgeType?: BadgeType) => {
    switch (badgeType) {
      case "renewals":
        return hasRenewals ? { count: renewalCount, variant: "destructive" as const } : null;
      case "approvals":
        return hasApprovals ? { count: approvalCount, variant: "warning" as const } : null;
      case "requests":
        return hasApprovals ? { count: approvalCount, variant: "warning" as const } : null;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex h-full w-80 flex-col p-0">
        {/* Header */}
        <SheetHeader className="shrink-0 border-b p-4">
          <SheetTitle className="flex items-center gap-3">
            <img src={logoImage} alt="Controle de Ferramentas" className="h-10 w-10 rounded-xl object-contain" />
            <div className="text-left">
              <p className="font-bold">Controle de Ferramentas</p>
              <p className="text-xs font-normal text-muted-foreground">Gestão de Ferramentas</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Company Badge */}
        {company && (
          <div className="mx-4 mt-4">
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium truncate">{company.name}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            const badgeInfo = getBadgeInfo(item.badgeType);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 truncate">{item.name}</span>
                {badgeInfo && (
                  <Badge 
                    variant={isActive ? "secondary" : badgeInfo.variant} 
                    className="h-5 min-w-5 px-1.5 text-xs"
                  >
                    {badgeInfo.count}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="shrink-0 border-t p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold uppercase text-primary-foreground shadow-md">
              {profile?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold">{profile?.full_name || "Usuário"}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">{role || "..."}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-start rounded-xl"
              asChild
              onClick={() => setOpen(false)}
            >
              <Link to="/ferramentas/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              onClick={() => {
                signOut();
                setOpen(false);
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
