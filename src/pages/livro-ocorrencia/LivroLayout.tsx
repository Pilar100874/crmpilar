import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldAlert,
  Package,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  LucideIcon,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { isSoloMode } from "@/components/OpenInNewTabButton";
import SoloBackButton from "@/components/SoloBackButton";

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; }

const navItems: NavItem[] = [
  { to: "/livro-ocorrencia", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/livro-ocorrencia/ocorrencias", label: "Ocorrências da Portaria", icon: ShieldAlert },
  { to: "/livro-ocorrencia/encomendas", label: "Encomendas / Correios", icon: Package },
];

function isItemActive(pathname: string, item: NavItem) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

export default function LivroLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const solo = isSoloMode();

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

  const current = [...navItems].reverse().find((i) => isItemActive(pathname, i)) || navItems[0];
  const CurrentIcon = current.icon;

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
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Livro de Ocorrência</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">
              Portaria · Ocorrências · Recebimento de Encomendas
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          <div className="lg:hidden border-b bg-muted/30 p-3">
            <Select value={current.to} onValueChange={(v) => navigate(v)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <CurrentIcon className="h-4 w-4" />
                    <span>{current.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {navItems.map((item) => {
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
            <TooltipProvider delayDuration={0}>
              {navItems.map(renderMenuButton)}
            </TooltipProvider>
          </div>

          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm min-h-full p-3 sm:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
