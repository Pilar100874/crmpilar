import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  LogOut,
  LogIn,
  AlertTriangle,
  ListChecks,
  Tag,
  Wrench,
  PanelLeftClose,
  PanelLeft,
  Car,
  LucideIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  group: "principal" | "config";
}

const navItems: NavItem[] = [
  { to: "/controle-veiculos", label: "Dashboard", icon: LayoutDashboard, end: true, group: "principal" },
  { to: "/controle-veiculos/saida", label: "Registrar Saída", icon: LogOut, group: "principal" },
  { to: "/controle-veiculos/entrada", label: "Registrar Entrada", icon: LogIn, group: "principal" },
  { to: "/controle-veiculos/movimentacoes", label: "Movimentações", icon: ListChecks, group: "principal" },
  { to: "/controle-veiculos/defeitos", label: "Defeitos & Avarias", icon: AlertTriangle, group: "principal" },
  { to: "/controle-veiculos/manutencao", label: "Análise de Manutenção", icon: Wrench, group: "principal" },
  { to: "/controle-veiculos/veiculos", label: "Veículos", icon: Truck, group: "config" },
  { to: "/controle-veiculos/motoristas", label: "Motoristas", icon: Users, group: "config" },
  { to: "/controle-veiculos/tipos-defeito", label: "Tipos de Defeito", icon: Tag, group: "config" },
];

function isItemActive(pathname: string, item: NavItem) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

export default function CVLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const current =
    [...navItems].reverse().find((i) => isItemActive(pathname, i)) || navItems[0];
  const CurrentIcon = current.icon;

  const principal = navItems.filter((i) => i.group === "principal");
  const config = navItems.filter((i) => i.group === "config");

  const renderMenuButton = (item: NavItem) => {
    const Icon = item.icon;
    const active = isItemActive(pathname, item);
    const button = (
      <button
        key={item.to}
        onClick={() => navigate(item.to)}
        className={`hub-menu-item flex items-center gap-3 px-3 py-2.5 text-left w-full text-muted-foreground rounded-md ${
          active ? "is-active" : ""
        } ${isMenuCollapsed ? "justify-center" : ""}`}
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
          <Car className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Controle de Veículos</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">
              Frota · Saídas · Entradas · Manutenção
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          {/* Mobile/Tablet: Select dropdown */}
          <div className="lg:hidden border-b bg-muted/30 p-3">
            <Select
              value={current.to}
              onValueChange={(v) => navigate(v)}
            >
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
                        {item.group === "config" && (
                          <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                            config
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: collapsible sidebar */}
          <div
            className={`hub-menu hidden lg:flex lg:flex-col lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 lg:border-r transition-all duration-300 ${
              isMenuCollapsed ? "lg:w-16" : "lg:w-64"
            }`}
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
              {principal.map(renderMenuButton)}

              <div className={`mt-3 mb-1 px-3 text-[10px] uppercase tracking-wider text-muted-foreground ${isMenuCollapsed ? "hidden" : ""}`}>
                Configurações
              </div>
              {isMenuCollapsed && <div className="my-2 border-t" />}
              {config.map(renderMenuButton)}
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
