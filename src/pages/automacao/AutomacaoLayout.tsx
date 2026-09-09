import { Outlet } from "react-router-dom";
import { Home } from "lucide-react";

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

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

