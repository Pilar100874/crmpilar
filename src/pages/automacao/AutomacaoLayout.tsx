import { NavLink, Outlet } from "react-router-dom";
import { Activity, Cpu, Home, KeyRound, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const itens = [
  { to: "/automacao", label: "Painéis", icon: LayoutGrid, end: true },
  { to: "/automacao/estado", label: "Estado dos Equipamentos", icon: Activity },
  { to: "/automacao/dispositivos", label: "Dispositivos", icon: Cpu },
  { to: "/automacao/chaves-app", label: "Chaves do Aplicativo", icon: KeyRound },
];

export default function AutomacaoLayout() {
  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <div className="border-b bg-gradient-to-r from-primary/10 via-card to-card px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Automação</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">
              Luzes, tomadas, portões e sensores dos seus ambientes
            </p>
          </div>
        </div>
      </div>

      <nav className="shrink-0 overflow-x-auto border-b bg-card/60 px-3 sm:px-6" aria-label="Navegação de Automação">
        <div className="flex min-w-max gap-1 py-2">
          {itens.map((item) => {
            const Icone = item.icon;
            return (
              <Button key={item.to} asChild variant="ghost" size="sm" className="h-9 px-3">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "gap-2 text-muted-foreground",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <Icone className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </Button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

