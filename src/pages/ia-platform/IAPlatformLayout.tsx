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
  Rocket,
  Sparkles,
  BookMarked,
  SlidersHorizontal,

} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import AipNotificacoesBell from "@/components/ia-platform/AipNotificacoesBell";
import { useEffect, useState } from "react";
import { AppRole, ROLES_MONITOR, carregarAcessoAip, temAlgumaRole } from "@/lib/aip/rbac";

interface AreaItem {
  to: string;
  label: string;
  icon: typeof Bot;
  end?: boolean;
  roles?: AppRole[];
}

interface Grupo {
  id: string;
  label: string;
  icon: typeof Bot;
  itens: AreaItem[];
}

/** Item solto (sempre visível, fora dos grupos). */
const DASHBOARD: AreaItem = { to: "", label: "Dashboard", icon: LayoutDashboard, end: true };

const GRUPOS: Grupo[] = [
  {
    id: "comecar",
    label: "Começar",
    icon: Sparkles,
    itens: [
      { to: "criar", label: "Criar com assistente", icon: Sparkles },
      { to: "wizard-inicial", label: "Wizard inicial", icon: Rocket },
      { to: "manual", label: "Manual de uso", icon: BookMarked },
    ],
  },
  {
    id: "construir",
    label: "Construir",
    icon: Bot,
    itens: [
      { to: "agentes", label: "Agentes", icon: Bot },
      { to: "wizards", label: "Wizards", icon: Wand2 },
      { to: "workflows", label: "Workflows", icon: Workflow },
      { to: "rotinas", label: "Rotinas", icon: CalendarClock },
    ],
  },
  {
    id: "recursos",
    label: "Recursos",
    icon: Boxes,
    itens: [
      { to: "skills", label: "Skills", icon: BookOpen },
      { to: "tools", label: "Tools", icon: Wrench },
      { to: "mcps", label: "MCPs", icon: Plug },
      { to: "recursos", label: "Recursos", icon: Boxes },
      { to: "assets", label: "Assets", icon: Image },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    icon: PlayCircle,
    itens: [
      { to: "execucoes", label: "Execuções", icon: PlayCircle },
      { to: "aprovacoes", label: "Aprovações", icon: CheckCircle2 },
      { to: "playground", label: "Playground", icon: TerminalSquare },
      { to: "historico", label: "Histórico", icon: History },
      { to: "notificacoes", label: "Notificações", icon: Bell },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: ShieldCheck,
    itens: [
      { to: "seguranca", label: "Segurança", icon: ShieldCheck },
      { to: "credenciais", label: "Credenciais", icon: Lock },
      { to: "motor", label: "Motor de execução", icon: Server },
      { to: "monitor-servidor", label: "Monitor do servidor", icon: Activity, roles: ROLES_MONITOR },
      {
        to: "config-servidor",
        label: "Config. do servidor",
        icon: SlidersHorizontal,
        roles: ROLES_MONITOR,
      },
    ],
  },
];

const TODAS = [DASHBOARD, ...GRUPOS.flatMap((g) => g.itens)];

export default function IAPlatformLayout() {
  const location = useLocation();
  const [roles, setRoles] = useState<AppRole[] | null>(null);
  const [abertos, setAbertos] = useState<string[]>([]);

  useEffect(() => {
    carregarAcessoAip()
      .then((a) => setRoles(a.roles))
      .catch(() => setRoles([]));
  }, []);

  const ativo = (item: AreaItem) =>
    item.end
      ? location.pathname.replace(/\/$/, "").endsWith("/ia-platform")
      : location.pathname.includes(`/ia-platform/${item.to}`);

  // Esconde itens restritos enquanto as roles não forem confirmadas.
  const permitido = (item: AreaItem) =>
    !item.roles || (roles ? temAlgumaRole(roles, item.roles) : false);

  const grupos = GRUPOS.map((g) => ({ ...g, itens: g.itens.filter(permitido) })).filter(
    (g) => g.itens.length > 0,
  );

  const grupoAtivo = grupos.find((g) => g.itens.some(ativo))?.id ?? null;

  // Mantém aberto o grupo da tela atual.
  useEffect(() => {
    if (grupoAtivo) setAbertos((a) => (a.includes(grupoAtivo) ? a : [...a, grupoAtivo]));
  }, [grupoAtivo]);

  const alternar = (id: string) =>
    setAbertos((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const atual = TODAS.find(ativo);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-primary/10 font-medium text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
          <nav className="space-y-1 p-2">
            <NavLink to={DASHBOARD.to} end className={linkClasses}>
              <DASHBOARD.icon className="h-4 w-4" />
              <span>{DASHBOARD.label}</span>
            </NavLink>

            {grupos.map((grupo) => {
              const aberto = abertos.includes(grupo.id);
              return (
                <Collapsible key={grupo.id} open={aberto} onOpenChange={() => alternar(grupo.id)}>
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      grupoAtivo === grupo.id && !aberto
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <grupo.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{grupo.label}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", aberto && "rotate-180")}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1 border-l border-border pl-3 lg:ml-4">
                    {grupo.itens.map((item) => (
                      <NavLink key={item.to} to={item.to} className={linkClasses}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
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
