import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Tv, MonitorPlay, ListVideo, Users, Terminal, Activity, Code2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/tv-signage", icon: LayoutDashboard, label: "Visão Geral", end: true },
  { to: "/tv-signage/dispositivos", icon: Tv, label: "Dispositivos" },
  { to: "/tv-signage/dashboards", icon: MonitorPlay, label: "Telas / Dashboards" },
  { to: "/tv-signage/playlists", icon: ListVideo, label: "Playlists" },
  { to: "/tv-signage/grupos", icon: Users, label: "Grupos" },
  { to: "/tv-signage/comandos", icon: Terminal, label: "Comandos" },
  { to: "/tv-signage/eventos", icon: Activity, label: "Eventos" },
  { to: "/tv-signage/api", icon: Code2, label: "API / Integração" },
];

export default function TvSignageLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/40 backdrop-blur">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/menu")}
            className="shrink-0"
            title="Voltar ao menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Tv className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">TV Signage</h1>
            <p className="text-xs text-muted-foreground">Gerenciamento remoto de Android TV / Google TV</p>
          </div>
        </div>
        <nav className="px-2 sm:px-4 pb-2 flex gap-1 overflow-x-auto">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <it.icon className="w-4 h-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 sm:p-6" key={location.pathname}>
        <Outlet />
      </div>
    </div>
  );
}
