import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  DoorOpen,
  Users,
  UserPlus,
  History,
  Cpu,
  Settings,
  PhoneCall,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  LucideIcon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isSoloMode } from "@/components/OpenInNewTabButton";
import SoloBackButton from "@/components/SoloBackButton";
import { usePortariaPerfil } from "@/lib/portaria/api";

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; gestor?: boolean; staff?: boolean }

const navItems: NavItem[] = [
  { to: "/portaria", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/portaria/acessos", label: "Acessos", icon: DoorOpen },
  { to: "/portaria/pessoas", label: "Pessoas", icon: Users, staff: true },
  { to: "/portaria/visitantes", label: "Visitantes", icon: UserPlus, staff: true },
  { to: "/portaria/historico", label: "Histórico", icon: History },
  { to: "/portaria/dispositivos", label: "Dispositivos", icon: Cpu, gestor: true },
  { to: "/portaria/interfone", label: "Interfone", icon: PhoneCall },
  { to: "/portaria/configuracoes", label: "Configurações", icon: Settings, gestor: true },
];

const bottomNav = navItems.slice(0, 5);

function isItemActive(pathname: string, item: NavItem) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

export default function PortariaLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const { isGestor, isStaff } = usePortariaPerfil();
  const solo = isSoloMode();

  const itens = navItems.filter(
    (i) => (!i.gestor || isGestor) && (!i.staff || isStaff),
  );
  const itensRodape = bottomNav.filter((i) => itens.includes(i));

  if (solo) {
    return (
      <div className="h-full flex flex-col bg-background text-foreground">
        <SoloBackButton />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm min-h-full p-3 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  const current = [...itens].reverse().find((i) => isItemActive(pathname, i)) || itens[0];
  const CurrentIcon = current?.icon ?? LayoutDashboard;

  const renderMenuButton = (item: NavItem) => {
    const Icon = item.icon;
    const active = isItemActive(pathname, item);
    const button = (
      <button
        key={item.to}
        onClick={() => navigate(item.to)}
        className={`hub-menu-item flex items-center gap-3 px-3 py-2.5 text-left w-full text-muted-foreground rounded-md ${active ? "is-active" : ""} ${isMenuCollapsed ? "justify-center" : ""}`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? "" : "opacity-70"}`} />
        {!isMenuCollapsed && <span className="truncate text-sm">{item.label}</span>}
      </button>
    );
    if (isMenuCollapsed) {
      return (
        <Tooltip key={item.to}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return button;
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <div className="border-b bg-gradient-to-r from-primary/10 via-card to-card px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Portaria</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">
              Controle de acesso · Portões, portas e reconhecimento facial
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          <div className="lg:hidden border-b bg-muted/30 p-3">
            <Select value={current?.to} onValueChange={(v) => navigate(v)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <CurrentIcon className="h-4 w-4" />
                    <span>{current?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {itens.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SelectItem key={item.to} value={item.to}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className={`hub-menu hidden lg:flex lg:flex-col lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 lg:border-r transition-all duration-300 ${isMenuCollapsed ? "lg:w-16" : "lg:w-64"}`}>
            <Button variant="ghost" size="sm" onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} className="mb-2 self-end">
              {isMenuCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <TooltipProvider delayDuration={0}>{itens.map(renderMenuButton)}</TooltipProvider>
          </div>

          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6 pb-20 lg:pb-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm min-h-full p-3 sm:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Menu inferior (celular) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${itensRodape.length}, minmax(0, 1fr))` }}>
          {itensRodape.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
