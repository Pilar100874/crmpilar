import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, Settings, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const itens = [
  { to: "/automacao", label: "Painéis", icon: LayoutGrid, end: true },
  { to: "/automacao/configuracoes", label: "Configuração", icon: Settings },
];

export default function AutomacaoLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
          <div className="ml-auto flex gap-1">
            {itens.map((i) => {
              const Icon = i.icon;
              const ativo = i.end ? pathname === i.to : pathname.startsWith(i.to);
              return (
                <Button
                  key={i.to}
                  size="sm"
                  variant={ativo ? "default" : "ghost"}
                  onClick={() => navigate(i.to)}
                >
                  <Icon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{i.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
