import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
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
  Settings,
  ChevronDown,
  Menu,
  Car,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const mainLinks = [
  { to: "/controle-veiculos", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/controle-veiculos/saida", label: "Registrar Saída", icon: LogOut },
  { to: "/controle-veiculos/entrada", label: "Registrar Entrada", icon: LogIn },
  { to: "/controle-veiculos/movimentacoes", label: "Movimentações", icon: ListChecks },
  { to: "/controle-veiculos/defeitos", label: "Defeitos & Avarias", icon: AlertTriangle },
  { to: "/controle-veiculos/manutencao", label: "Análise de Manutenção", icon: Wrench },
];

const configLinks = [
  { to: "/controle-veiculos/veiculos", label: "Veículos", icon: Truck },
  { to: "/controle-veiculos/motoristas", label: "Motoristas", icon: Users },
  { to: "/controle-veiculos/tipos-defeito", label: "Tipos de Defeito", icon: Tag },
];

export default function CVLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const configActive = configLinks.some((l) => pathname.startsWith(l.to));

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden max-w-[100vw]">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate sm:text-lg">
                Controle de Veículos
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Gestão de frota · Saídas · Entradas · Manutenção
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border-t">
          <nav className="flex gap-1 px-2 py-2 min-w-max sm:px-4">
            {mainLinks.map(({ to, label, icon: Icon, end }) => (
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

            <DropdownMenu>
              <DropdownMenuTrigger
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap outline-none ${
                  configActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Cadastros</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {configLinks.map(({ to, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={to}
                    onClick={() => navigate(to)}
                    className="cursor-pointer"
                  >
                    <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      <main className="overflow-x-hidden p-3 sm:p-5">
        <Outlet />
      </main>
    </div>
  );
}
