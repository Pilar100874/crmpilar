import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, Truck, Users, LogOut, LogIn, AlertTriangle, ListChecks, Tag, Wrench } from "lucide-react";

const links = [
  { to: "/controle-veiculos", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/controle-veiculos/veiculos", label: "Veículos", icon: Truck },
  { to: "/controle-veiculos/motoristas", label: "Motoristas", icon: Users },
  { to: "/controle-veiculos/saida", label: "Registrar Saída", icon: LogOut },
  { to: "/controle-veiculos/entrada", label: "Registrar Entrada", icon: LogIn },
  { to: "/controle-veiculos/movimentacoes", label: "Movimentações", icon: ListChecks },
  { to: "/controle-veiculos/defeitos", label: "Defeitos & Avarias", icon: AlertTriangle },
  { to: "/controle-veiculos/tipos-defeito", label: "Tipos de Defeito", icon: Tag },
  { to: "/controle-veiculos/manutencao", label: "Análise de Manutenção", icon: Wrench },
];

export default function CVLayout() {
  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div
        className="relative overflow-hidden border-b"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">Controle de Veículos</h1>
              <p className="text-xs text-white/85 sm:text-sm">Gestão de frota, saídas, entradas e manutenção</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 overflow-x-auto">
        <nav className="flex gap-1 px-2 py-2 min-w-max sm:px-4">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(" ")[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <Outlet />
      </div>
    </div>
  );
}
