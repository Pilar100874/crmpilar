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
    <div className="flex flex-col h-full">
      <div className="border-b bg-card px-4 py-3">
        <h1 className="text-xl font-semibold">Controle de Veículos</h1>
        <p className="text-sm text-muted-foreground">Gestão de frota, saídas, entradas e manutenção</p>
      </div>
      <div className="border-b bg-background overflow-x-auto">
        <nav className="flex gap-1 px-4 py-2 min-w-max">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <Outlet />
      </div>
    </div>
  );
}
