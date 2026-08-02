import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarClock,
  LayoutDashboard,

  Bot,
  BookOpen,
  Wrench,
  Plug,
  Boxes,
  Wand2,
  Workflow,
  CheckCircle2,
  PlayCircle,
  Image,
  TerminalSquare,
  History,
  ShieldCheck,
  Lock,
  Bell,
  Server,
  Activity,

} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import AipNotificacoesBell from "@/components/ia-platform/AipNotificacoesBell";
import { useEffect, useState } from "react";
import { AppRole, ROLES_MONITOR, carregarAcessoAip, temAlgumaRole } from "@/lib/aip/rbac";

const AREAS = [
  { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "agentes", label: "Agentes", icon: Bot },
  { to: "skills", label: "Skills", icon: BookOpen },
  { to: "tools", label: "Tools", icon: Wrench },
  { to: "mcps", label: "MCPs", icon: Plug },
  { to: "recursos", label: "Recursos", icon: Boxes },
  { to: "wizards", label: "Wizards", icon: Wand2 },
  { to: "workflows", label: "Workflows", icon: Workflow },
  { to: "aprovacoes", label: "Aprovações", icon: CheckCircle2 },
  { to: "execucoes", label: "Execuções", icon: PlayCircle },
  { to: "assets", label: "Assets", icon: Image },
  { to: "playground", label: "Playground", icon: TerminalSquare },
  { to: "historico", label: "Histórico", icon: History },
  { to: "seguranca", label: "Segurança", icon: ShieldCheck },
  { to: "credenciais", label: "Credenciais", icon: Lock },
  { to: "rotinas", label: "Rotinas", icon: CalendarClock },
  { to: "notificacoes", label: "Notificações", icon: Bell },
  { to: "motor", label: "Motor de execução", icon: Server },
  { to: "monitor-servidor", label: "Monitor do servidor", icon: Activity, roles: ROLES_MONITOR },

];

export default function IAPlatformLayout() {
  const location = useLocation();
  const [roles, setRoles] = useState<AppRole[] | null>(null);

  useEffect(() => {
    carregarAcessoAip()
      .then((a) => setRoles(a.roles))
      .catch(() => setRoles([]));
  }, []);

  // Esconde itens restritos enquanto as roles não forem confirmadas.
  const areas = AREAS.filter(
    (a) => !("roles" in a) || (roles ? temAlgumaRole(roles, a.roles as AppRole[]) : false),
  );

  const atual = AREAS.find((a) =>
    a.end
      ? location.pathname.replace(/\/$/, "").endsWith("/ia-platform")
      : location.pathname.includes(`/ia-platform/${a.to}`),
  );

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Menu lateral do módulo */}
      <aside className="w-full shrink-0 border-b border-border bg-card/60 lg:h-full lg:w-60 lg:border-b-0 lg:border-r">
        <div className="hidden items-center gap-2 border-b border-border px-4 py-4 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Agentes IA</p>
            <p className="truncate text-xs text-muted-foreground">Plataforma visual</p>
          </div>
        </div>
        <ScrollArea className="lg:h-[calc(100%-73px)]">
          <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
            {areas.map((area) => (
              <NavLink
                key={area.to || "dashboard"}
                to={area.to}
                end={area.end}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <area.icon className="h-4 w-4" />
                <span>{area.label}</span>
              </NavLink>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      <main className="min-h-0 flex-1 overflow-auto">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-6">
          <h1 className="text-lg font-semibold">{atual?.label ?? "Plataforma de Agentes IA"}</h1>
          <AipNotificacoesBell />
        </div>
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
