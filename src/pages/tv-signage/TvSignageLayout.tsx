import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Tv, MonitorPlay, ListVideo, Users, Terminal, Activity, Code2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/tv-signage", icon: LayoutDashboard, label: "Visão Geral", end: true },
  { to: "/tv-signage/dispositivos", icon: Tv, label: "Dispositivos" },
  { to: "/tv-signage/dashboards", icon: MonitorPlay, label: "Telas / Dashboards" },
  { to: "/tv-signage/playlists", icon: ListVideo, label: "Playlists" },
  { to: "/tv-signage/grupos", icon: Users, label: "Grupos" },
  { to: "/tv-signage/comandos", icon: Terminal, label: "Comandos" },
  { to: "/tv-signage/workflows", icon: Zap, label: "Workflows" },
  { to: "/tv-signage/eventos", icon: Activity, label: "Eventos" },
  { to: "/tv-signage/api", icon: Code2, label: "API / Integração" },
];

export default function TvSignageLayout() {
  const location = useLocation();
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border bg-card/40 backdrop-blur">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Tv className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
              Gerenciador de Telas Remotas
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Gerenciamento remoto de Android TV / Google TV
            </p>
          </div>
        </div>
        <nav className="px-2 sm:px-4 pb-3 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-[11px] sm:text-sm text-center sm:text-left transition-colors leading-tight",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <it.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{it.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-3 sm:p-4 lg:p-6" key={location.pathname}>
        <Outlet />
      </div>
    </div>
  );
}

