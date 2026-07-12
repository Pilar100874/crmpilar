import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  Wrench,
  FileEdit,
  FileSignature,
  CheckSquare,
  Smartphone,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Menu,
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
import { isSoloMode } from "@/components/OpenInNewTabButton";
import { usePontoEmpresa } from "./usePontoEmpresa";
import WizardBackBar from "./WizardBackBar";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  group: "principal" | "config";
}

const navItems: NavItem[] = [
  { to: "/ponto", label: "Dashboard RH", icon: LayoutDashboard, end: true, group: "principal" },
  { to: "/ponto/tratamento", label: "Tratamento", icon: Wrench, group: "principal" },
  { to: "/ponto/ajustes", label: "Ajustes", icon: FileEdit, group: "principal" },
  { to: "/ponto/aprovacoes", label: "Aprovações", icon: CheckSquare, group: "principal" },
  { to: "/ponto/espelho", label: "Espelho de Ponto", icon: FileSignature, group: "principal" },
  { to: "/ponto/registro", label: "Registro via App", icon: Smartphone, group: "principal" },
  { to: "/ponto/config", label: "Configurações", icon: Settings, group: "config" },
];

function isItemActive(pathname: string, item: NavItem) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

export default function PontoLayout() {
  const { empresas, empresaId, setEmpresaId } = usePontoEmpresa();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const solo = isSoloMode();

  const rotasGlobais = ["/ponto/empresas", "/ponto/manual", "/ponto/coletor-download"];
  const showSelector = !rotasGlobais.some((p) => pathname.includes(p));

  if (solo) {
    return (
      <div className="h-full flex flex-col bg-background text-foreground">
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    );
  }

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
    <div className="ponto-shell h-full min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate sm:text-lg">Controle de Ponto</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                RH · Gestor · Funcionário
              </p>
            </div>
          </div>
          {showSelector && (
            <Select value={empresaId ?? undefined} onValueChange={(v) => setEmpresaId(v)}>
              <SelectTrigger className="h-9 w-full sm:w-[260px]">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    Nenhuma empresa cadastrada
                  </div>
                )}
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          {/* Mobile/Tablet: Select dropdown */}
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
              <div
                className={`mt-3 mb-1 px-3 text-[10px] uppercase tracking-wider text-muted-foreground ${
                  isMenuCollapsed ? "hidden" : ""
                }`}
              >
                Sistema
              </div>
              {isMenuCollapsed && <div className="my-2 border-t" />}
              {config.map(renderMenuButton)}
            </TooltipProvider>
          </div>

          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
            <WizardBackBar />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
