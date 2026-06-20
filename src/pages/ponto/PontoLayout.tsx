import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Clock, LayoutDashboard, Building2, Users, Smartphone, Wrench, FileEdit, FileSignature, Cpu, FileDown, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/ponto", label: "Dashboard RH", icon: LayoutDashboard, end: true },
  { to: "/ponto/empresas", label: "Empresas", icon: Building2 },
  { to: "/ponto/funcionarios", label: "Funcionários", icon: Users },
  { to: "/ponto/registro", label: "Registro (App)", icon: Smartphone },
  { to: "/ponto/tratamento", label: "Tratamento", icon: Wrench },
  { to: "/ponto/ajustes", label: "Ajustes", icon: FileEdit },
  { to: "/ponto/espelho", label: "Espelho de Ponto", icon: FileSignature },
  { to: "/ponto/equipamentos", label: "Equipamentos Control iD", icon: Cpu },
  { to: "/ponto/exportacao", label: "Exportação Domínio", icon: FileDown },
  { to: "/ponto/alertas", label: "Antifraude", icon: ShieldAlert },
  { to: "/ponto/auditoria", label: "Auditoria", icon: ShieldCheck },
];

export default function PontoLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">Controle de Ponto</h1>
            <p className="text-xs text-muted-foreground mt-1">RH · Gestor · Funcionário</p>
          </div>
        </div>
        <nav className="px-2 sm:px-4 overflow-x-auto">
          <ul className="flex gap-1 pb-2 min-w-max">
            {nav.map((n) => {
              const active = n.end ? pathname === n.to : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
